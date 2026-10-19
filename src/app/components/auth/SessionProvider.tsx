"use client";

/**
 * NextAuth's SessionProvider, re-reading the session every few minutes.
 *
 * The backend access token in the session lives 15 minutes
 * (USERMANAGEMENT_ACCESS_TOKEN_TTL_MIN). Each re-read runs the server-side `jwt`
 * callback (lib/auth.ts), which renews that token from the refresh token and
 * writes it back to the session cookie — so a signed-in user stays signed in,
 * with working roles, until they sign out (or are idle for the refresh token's
 * lifetime). Without this the session was re-read only on tab focus, so after
 * ~15 minutes in one tab every call 401'd and tools showed as "disabled".
 */
import type { Session } from "next-auth";
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

// Well inside the 15-minute access-token lifetime, including the 1-minute skew.
const REFETCH_SECONDS = 4 * 60;

export default function SessionProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return (
    <NextAuthSessionProvider session={session} refetchInterval={REFETCH_SECONDS} refetchOnWindowFocus>
      {children}
    </NextAuthSessionProvider>
  );
}
