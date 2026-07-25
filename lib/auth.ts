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

// Exchange a web refresh token for a fresh usermanagement access token so the
// session doesn't drop when the short access token expires. Returns the new
// access token, or null on failure (caller then forces re-login).
async function refreshBackendToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${userManagementBaseUrl()}/api/auth/exchange`, {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ audience: "usermanagement" }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.access_token as string) ?? null;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || generateFallbackSecret(),
  session: { strategy: "jwt" },
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
        return token;
      }

      // Subsequent calls: silently renew the access token before it expires so
      // the UI never 401s mid-session. Needs a refresh token from login.
      const exp = (token as any).backendTokenExp as number | undefined;
      const refresh = (token as any).backendRefreshToken as string | undefined;
      const SKEW_MS = 60_000; // renew ~1 min before expiry
      if (refresh && (token as any).backendToken && (!exp || Date.now() > exp - SKEW_MS)) {
        const fresh = await refreshBackendToken(refresh);
        if (fresh) {
          (token as any).backendToken = fresh;
          (token as any).backendTokenExp = jwtExpMs(fresh);
        } else {
          // Refresh failed (expired/revoked/inactive) — drop the backend token so
          // the app treats the user as signed out and re-prompts login.
          (token as any).backendToken = undefined;
          (token as any).backendTokenExp = 0;
          (token as any).backendRefreshToken = undefined;
        }
      }
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
