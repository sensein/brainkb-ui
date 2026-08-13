// NextAuth now wraps a backend-issued JWT instead of running GitHub/ORCID
// OAuth in the browser. The usermanagement_service handles all OAuth providers
// (GitHub, ORCID, Globus) server-side and redirects back to /auth/callback with
// `?token=<jwt>`. That page calls `signIn('backend-jwt', { token })`, which
// hits the CredentialsProvider below.

import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";
import type { NextAuthOptions } from "next-auth";

const generateFallbackSecret = () => crypto.randomBytes(32).toString("base64");

// Base URL of the user management backend (server-side; does not need to be public).
// Falls back to deriving from the public token endpoint so existing setups keep working.
function userManagementBaseUrl(): string {
  const explicit = process.env.USER_MANAGEMENT_API_BASE || process.env.NEXT_PUBLIC_USER_MANAGEMENT_API_BASE;
  if (explicit) return explicit.replace(/\/+$/, "");
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE;
  if (tokenEndpoint) {
    try {
      const u = new URL(tokenEndpoint);
      return `${u.protocol}//${u.host}`;
    } catch {
      /* ignored */
    }
  }
  return "http://localhost:8004";
}

// Read a JWT's `exp` (ms since epoch) without verifying — used only to decide
// when to proactively refresh. The backend verifies the token for real.
function jwtExpMs(token?: string | null): number {
  if (!token) return 0;
  try {
    const p = token.split(".")[1];
    const json = JSON.parse(
      Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    return typeof json.exp === "number" ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

// How long NextAuth keeps its OWN session cookie alive. This must not outlive the
// backend's web refresh token (USERMANAGEMENT_WEB_REFRESH_TTL_MIN, default 10080 =
// 7 days). NextAuth's default is 30 days, which left a ~23-day window where the
// cookie still reported `authenticated` — navbar, avatar, everything — while the
// backend credential behind it was gone, so every service call failed with
// "requires a signed-in session". Set NEXTAUTH_SESSION_MAX_AGE_SEC if the backend's
// TTL is customised; keep it equal to or shorter than that value.
const SESSION_MAX_AGE_SEC = (() => {
  const n = Number(process.env.NEXTAUTH_SESSION_MAX_AGE_SEC);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 7 * 24 * 60 * 60;
})();

// Outcome of a refresh attempt. The distinction matters: "rejected" means the
// refresh token itself is dead (expired, revoked, account deactivated) and the user
// must sign in again, while "unavailable" means we could not ask (network blip,
// 502 during a redeploy, service restarting) and says nothing about the token. The
// old code returned null for both and cleared the credentials either way, so a
// few-second backend hiccup permanently signed everyone out.
type RefreshResult =
  | { status: "ok"; token: string }
  | { status: "rejected" }
  | { status: "unavailable" };

// Exchange a web refresh token for a fresh usermanagement access token so the
// session doesn't drop when the short access token expires.
async function refreshBackendToken(refreshToken: string): Promise<RefreshResult> {
  try {
    const res = await fetch(`${userManagementBaseUrl()}/api/auth/exchange`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ audience: "usermanagement" }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      const access = (data.access_token as string) ?? null;
      return access ? { status: "ok", token: access } : { status: "rejected" };
    }
    // Only the auth codes are a verdict on the token.
    return res.status === 401 || res.status === 403
      ? { status: "rejected" }
      : { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || generateFallbackSecret(),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SEC },
  jwt: { maxAge: SESSION_MAX_AGE_SEC },
  providers: [
    CredentialsProvider({
      id: "backend-jwt",
      name: "BrainKB Backend",
      credentials: {
        token: { label: "Backend JWT", type: "text" },
        refresh: { label: "Backend Refresh Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
        const refresh = credentials?.refresh || null;
        if (!token) return null;

        // Validate the token by asking the backend who it belongs to. This avoids
        // shipping the backend JWT secret to Next.js and gives us the full claim
        // set (profile_id, roles, auth_source) in one call.
        try {
          const res = await fetch(`${userManagementBaseUrl()}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (!res.ok) return null;
          const me = await res.json();
          return {
            id: String(me.profile_id ?? me.user_id ?? me.email),
            email: me.email ?? null,
            name: me.name ?? me.email ?? null,
            orcid_id: me.orcid_id ?? null,
            backendToken: token,
            backendRefreshToken: refresh,
            profileId: me.profile_id ?? null,
            userId: me.user_id ?? null,
            roles: me.roles ?? [],
            scopes: me.scopes ?? [],
            authSource: me.auth_source ?? "password",
          } as any;
        } catch (err) {
          console.error("[next-auth] backend JWT validation failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, hydrate the NextAuth JWT with backend claims.
      if (user) {
        const u = user as any;
        token.backendToken = u.backendToken;
        (token as any).backendRefreshToken = u.backendRefreshToken ?? null;
        (token as any).backendTokenExp = jwtExpMs(u.backendToken);
        token.profileId = u.profileId;
        token.userId = u.userId;
        token.roles = u.roles ?? [];
        token.scopes = u.scopes ?? [];
        token.authSource = u.authSource ?? "password";
        (token as any).orcid_id = u.orcid_id ?? null;
        (token as any).error = undefined; // a fresh login clears any previous expiry
        return token;
      }

      // Subsequent calls: silently renew the access token before it expires so
      // the UI never 401s mid-session. Needs a refresh token from login.
      const exp = (token as any).backendTokenExp as number | undefined;
      const refresh = (token as any).backendRefreshToken as string | undefined;
      const SKEW_MS = 60_000; // renew ~1 min before expiry

      if (!(token as any).backendToken) return token; // already expired; see below
      if (exp && Date.now() < exp - SKEW_MS) return token; // still valid

      if (!refresh) {
        // Signed in without a refresh token — an older backend build, or a login
        // that took the CLI path (oauth.py mints `refresh` for web logins only).
        // Nothing can renew this, so once the access token lapses the session is
        // over. Mark it rather than leaving a dead token in place for every caller
        // to 401 on individually.
        (token as any).backendToken = undefined;
        (token as any).backendTokenExp = 0;
        (token as any).error = "SessionExpired";
        return token;
      }

      const res = await refreshBackendToken(refresh);
      if (res.status === "ok") {
        (token as any).backendToken = res.token;
        (token as any).backendTokenExp = jwtExpMs(res.token);
        (token as any).error = undefined;
      } else if (res.status === "rejected") {
        // The refresh token is expired, revoked, or the account was deactivated.
        // Drop the credentials AND flag it, so the UI signs the user out centrally
        // instead of each feature surfacing its own "please sign in" error.
        (token as any).backendToken = undefined;
        (token as any).backendTokenExp = 0;
        (token as any).backendRefreshToken = undefined;
        (token as any).error = "SessionExpired";
      }
      // "unavailable": keep the credentials we have and try again on the next call.
      // The access token may already be past `exp` — a real 401 from the backend is
      // the correct outcome then, and it is recoverable; discarding the refresh
      // token would not be.
      return token;
    },
    async session({ session, token }) {
      const s = session as any;
      s.backendToken = token.backendToken;
      s.profileId = token.profileId;
      s.userId = token.userId;
      s.roles = token.roles ?? [];
      s.scopes = token.scopes ?? [];
      s.authSource = token.authSource ?? "password";
      // Surfaced to the browser so SessionExpiryWatcher can sign the user out once,
      // centrally. Without it, a session whose backend credential is gone still
      // reads as `authenticated` and every feature fails on its own.
      s.error = (token as any).error ?? undefined;
      if (s.user) {
        s.user.orcid_id = (token as any).orcid_id ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
