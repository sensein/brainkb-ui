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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "backend-jwt",
      name: "BrainKB Backend",
      credentials: {
        token: { label: "Backend JWT", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token;
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
        token.profileId = u.profileId;
        token.userId = u.userId;
        token.roles = u.roles ?? [];
        token.scopes = u.scopes ?? [];
        token.authSource = u.authSource ?? "password";
        (token as any).orcid_id = u.orcid_id ?? null;
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
