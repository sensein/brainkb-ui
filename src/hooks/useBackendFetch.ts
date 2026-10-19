"use client";

/**
 * fetch() against a BrainKB backend with the session's access token, recovering
 * from an expired one: on 401 it asks NextAuth to renew the session (the server
 * exchanges the refresh token and updates the cookie) and retries once with the
 * new token. A second 401 is returned as is — the session really has ended, and
 * SessionExpiryWatcher handles that centrally.
 */
import { useCallback } from "react";
import { useSession } from "next-auth/react";

let renewing: Promise<string | undefined> | null = null;   // one renewal for concurrent 401s

export function useBackendFetch() {
  const { data: session, update } = useSession();
  const token = (session as any)?.backendToken as string | undefined;

  return useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response> => {
      const send = (t?: string) => {
        const headers = new Headers(init.headers);
        if (t) headers.set("Authorization", `Bearer ${t}`);
        return fetch(url, { ...init, headers, cache: "no-store" });
      };
      const res = await send(token);
      if (res.status !== 401) return res;
      renewing ??= update()
        .then((s: any) => s?.backendToken as string | undefined)
        .finally(() => { renewing = null; });
      const fresh = await renewing;
      return fresh && fresh !== token ? send(fresh) : res;
    },
    [token, update],
  );
}
