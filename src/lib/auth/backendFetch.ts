/**
 * fetch() against a BrainKB backend that recovers a lapsed session token instead
 * of reporting it as "no permissions". Framework-free so it can be unit-tested;
 * src/hooks/useBackendFetch.ts binds it to NextAuth.
 *
 *  - 401 → renew once (the server exchanges the refresh token and rewrites the
 *    session cookie) and retry with the new token. A second 401 is returned as is:
 *    the session really has ended, and SessionExpiryWatcher signs out centrally.
 *  - Signed in but holding no token → renew BEFORE sending. Sending it bare would
 *    be read as anonymous, and anonymous is answered "denied", not 401.
 *  - 403 / 5xx / network errors are returned (or thrown) untouched: they are not
 *    a verdict on the session, so renewing would not help.
 */

export type Renew = () => Promise<string | undefined>;

/**
 * Collapses concurrent renewals into one. A dashboard fires several checks at
 * once; when the token lapses they all 401 together and should share a single
 * refresh-token exchange rather than each starting their own.
 */
export function singleFlight(renew: Renew): Renew {
  let inFlight: Promise<string | undefined> | null = null;
  return () => {
    inFlight ??= renew().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}

export interface FetchWithRenewalOptions {
  token: string | undefined;
  /** True when NextAuth reports a signed-in session (status === "authenticated"). */
  signedIn: boolean;
  renew: Renew;
  fetchImpl?: typeof fetch;
}

export async function fetchWithRenewal(
  url: string,
  init: RequestInit,
  { token, signedIn, renew, fetchImpl = fetch }: FetchWithRenewalOptions,
): Promise<Response> {
  const send = (t?: string) => {
    const headers = new Headers(init.headers);
    if (t) headers.set("Authorization", `Bearer ${t}`);
    return fetchImpl(url, { ...init, headers, cache: "no-store" });
  };

  if (!token && signedIn) {
    const fresh = await renew();
    if (!fresh) return new Response(null, { status: 401, statusText: "Session token unavailable" });
    return send(fresh);
  }

  const res = await send(token);
  if (res.status !== 401 || !signedIn) return res;
  const fresh = await renew();
  return fresh && fresh !== token ? send(fresh) : res;
}
