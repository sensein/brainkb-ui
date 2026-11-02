import { describe, expect, it, vi } from "vitest";
import { fetchWithRenewal, singleFlight } from "@/src/lib/auth/backendFetch";

// A backend that accepts exactly one token; anything else is 401.
function backend(valid: string, { status = 200 } = {}) {
  return vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const auth = new Headers(init?.headers).get("Authorization");
    if (auth !== `Bearer ${valid}`) return new Response(null, { status: 401 });
    return new Response(JSON.stringify({ ok: true }), { status });
  });
}

describe("fetchWithRenewal", () => {
  it("expired token mid-session: renews once and retries with the new token", async () => {
    const fetchImpl = backend("fresh");
    const renew = vi.fn(async () => "fresh");
    const res = await fetchWithRenewal("/x", {}, { token: "stale", signedIn: true, renew, fetchImpl });
    expect(res.status).toBe(200);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("valid token: no renewal", async () => {
    const renew = vi.fn(async () => "other");
    const res = await fetchWithRenewal("/x", {}, { token: "t", signedIn: true, renew, fetchImpl: backend("t") });
    expect(res.status).toBe(200);
    expect(renew).not.toHaveBeenCalled();
  });

  it("signed in without a token (tokenless initial session): renews BEFORE sending, never sends anonymously", async () => {
    const fetchImpl = backend("fresh");
    const renew = vi.fn(async () => "fresh");
    const res = await fetchWithRenewal("/x", {}, { token: undefined, signedIn: true, renew, fetchImpl });
    expect(res.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchImpl.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer fresh");
  });

  it("tokenless and renewal fails: a 401, not an anonymous request", async () => {
    const fetchImpl = backend("x");
    const res = await fetchWithRenewal("/x", {}, { token: undefined, signedIn: true, renew: async () => undefined, fetchImpl });
    expect(res.status).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refresh token revoked: the 401 is returned after one attempt (no loop)", async () => {
    const fetchImpl = backend("never");
    const renew = vi.fn(async () => undefined);
    const res = await fetchWithRenewal("/x", {}, { token: "stale", signedIn: true, renew, fetchImpl });
    expect(res.status).toBe(401);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([403, 500, 502, 503])("HTTP %i is not a session problem: no renewal", async (status) => {
    const renew = vi.fn(async () => "fresh");
    const fetchImpl = vi.fn(async () => new Response(null, { status }));
    const res = await fetchWithRenewal("/x", {}, { token: "t", signedIn: true, renew, fetchImpl });
    expect(res.status).toBe(status);
    expect(renew).not.toHaveBeenCalled();
  });

  it("network failure propagates (callers keep their last known state)", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    await expect(
      fetchWithRenewal("/x", {}, { token: "t", signedIn: true, renew: async () => "x", fetchImpl }),
    ).rejects.toThrow("Failed to fetch");
  });

  it("signed out: a 401 is returned without trying to renew", async () => {
    const renew = vi.fn(async () => "fresh");
    const res = await fetchWithRenewal("/x", {}, { token: "t", signedIn: false, renew, fetchImpl: backend("other") });
    expect(res.status).toBe(401);
    expect(renew).not.toHaveBeenCalled();
  });
});

describe("singleFlight — concurrent requests", () => {
  it("five checks that 401 together share ONE refresh-token exchange", async () => {
    let release!: (t: string) => void;
    const exchange = vi.fn(() => new Promise<string>((r) => { release = r; }));
    const renew = singleFlight(exchange);
    const fetchImpl = backend("fresh");
    const all = Promise.all(
      Array.from({ length: 5 }, () => fetchWithRenewal("/x", {}, { token: "stale", signedIn: true, renew, fetchImpl })),
    );
    await vi.waitFor(() => expect(exchange).toHaveBeenCalledTimes(1));
    release("fresh");
    const results = await all;
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200]);
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it("a later lapse starts a new exchange", async () => {
    const exchange = vi.fn(async () => "t");
    const renew = singleFlight(exchange);
    await renew();
    await renew();
    expect(exchange).toHaveBeenCalledTimes(2);
  });
});
