"use client";

/**
 * fetch() against a BrainKB backend with the session's access token, recovering
 * from an expired or missing one (see src/lib/auth/backendFetch.ts): on 401 — or
 * when signed in without a token — it asks NextAuth to renew the session (the
 * server exchanges the refresh token and updates the cookie) and retries once.
 * A second 401 is returned as is — the session really has ended, and
 * SessionExpiryWatcher handles that centrally.
 */
import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { fetchWithRenewal, singleFlight, type Renew } from "@/src/lib/auth/backendFetch";

// One renewal shared by every hook instance: concurrent 401s exchange the refresh
// token once. `update` is the same function for every useSession() consumer, so
// binding the latest one at call time is enough.
let latestUpdate: (() => Promise<any>) | null = null;
const renewShared: Renew = singleFlight(async () => {
  const s = await latestUpdate?.();
  return (s as any)?.backendToken as string | undefined;
});

export function useBackendFetch() {
  const { data: session, status, update } = useSession();
  const token = (session as any)?.backendToken as string | undefined;
  // A session flagged expired cannot be renewed; let SessionExpiryWatcher end it.
  const signedIn = status === "authenticated" && (session as any)?.error !== "SessionExpired";
  latestUpdate = update;

  return useCallback(
    (url: string, init: RequestInit = {}): Promise<Response> =>
      fetchWithRenewal(url, init, { token, signedIn, renew: renewShared }),
    [token, signedIn],
  );
}
