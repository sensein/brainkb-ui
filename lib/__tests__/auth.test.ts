/**
 * Session lifecycle in lib/auth.ts against a faked usermanagement backend:
 * idle and active sessions, expiry, forced renewal after a 401, revocation,
 * backend outages, sliding refresh tokens — and the server-rendered session
 * (the root layout's getServerSession) carrying the backend token at all.
 */
import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.USER_MANAGEMENT_API_BASE = "http://um.test";

const { authOptions } = await import("@/lib/auth");
const { encode } = await import("next-auth/jwt");
// Not in next-auth's exports map, so Vite cannot import it; Node's require can.
const nodeRequire = createRequire(import.meta.url);
const { AuthHandler } = nodeRequire(nodeRequire.resolve("next-auth").replace(/index\.js$/, "core/index.js"));

const MIN = 60_000;
const T0 = Date.UTC(2026, 9, 19, 9, 0, 0);

// Unsigned JWT with an `exp` — lib/auth.ts only reads exp to schedule renewal.
function jwtExpiringIn(ms: number, id = "a") {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "none" })}.${b64({ exp: Math.floor((Date.now() + ms) / 1000), jti: id })}.sig`;
}

type ExchangeReply = { status: number; body?: any } | "network-error";
let exchangeReplies: ExchangeReply[];
let exchangeCalls: string[];

beforeEach(() => {
  vi.useFakeTimers({ now: T0, toFake: ["Date"] });
  exchangeReplies = [];
  exchangeCalls = [];
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(url).toBe("http://um.test/api/auth/exchange");
    exchangeCalls.push(new Headers(init?.headers).get("Authorization") ?? "");
    const r = exchangeReplies.shift() ?? { status: 200, body: { access_token: jwtExpiringIn(15 * MIN, `n${exchangeCalls.length}`) } };
    if (r === "network-error") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(r.body ?? {}), { status: r.status });
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const jwtCb = authOptions.callbacks!.jwt! as (a: any) => Promise<any>;

function signedInToken(extra: Record<string, any> = {}) {
  const access = jwtExpiringIn(15 * MIN, "login");
  return {
    name: "Tek Raj Chhetri",
    email: "tekraj@mit.edu",
    backendToken: access,
    backendTokenExp: Date.now() + 15 * MIN,
    backendRefreshToken: "refresh-1",
    roles: ["Curator"],
    authSource: "globus",
    ...extra,
  };
}

describe("jwt callback — renewal", () => {
  it("active session, token still fresh: no exchange", async () => {
    const t = await jwtCb({ token: signedInToken() });
    expect(exchangeCalls).toHaveLength(0);
    expect(t.backendToken).toBeTruthy();
  });

  it("idle tab for 20 minutes: the next session read renews the expired token", async () => {
    const before = signedInToken();
    vi.setSystemTime(T0 + 20 * MIN);
    const t = await jwtCb({ token: { ...before } });
    expect(exchangeCalls).toEqual(["Bearer refresh-1"]);
    expect(t.backendToken).not.toBe(before.backendToken);
    expect(t.backendTokenExp).toBeGreaterThan(Date.now());
    expect(t.error).toBeUndefined();
  });

  it("renews ~1 minute before expiry, not after (no window of 401s)", async () => {
    const t0 = signedInToken();
    vi.setSystemTime(T0 + 14.5 * MIN);
    await jwtCb({ token: { ...t0 } });
    expect(exchangeCalls).toHaveLength(1);
  });

  it("active use over 3 days with the 4-minute refetch: never signed out", async () => {
    let t: any = signedInToken();
    const end = T0 + 3 * 24 * 60 * MIN;
    for (let now = T0; now < end; now += 4 * MIN) {
      vi.setSystemTime(now);
      t = await jwtCb({ token: t });
      expect(t.error).toBeUndefined();
      expect(t.backendTokenExp).toBeGreaterThan(Date.now());
    }
  });

  it("forced renewal (update() after a 401) renews even when exp looks valid", async () => {
    const t = await jwtCb({ token: signedInToken(), trigger: "update" });
    expect(exchangeCalls).toHaveLength(1);
    expect(t.error).toBeUndefined();
  });

  it("sliding session: a renewed refresh token from the backend is stored", async () => {
    exchangeReplies.push({ status: 200, body: { access_token: jwtExpiringIn(15 * MIN), refresh_token: "refresh-2" } });
    const login = signedInToken();
    vi.setSystemTime(T0 + 20 * MIN);
    const t = await jwtCb({ token: login });
    expect(t.backendRefreshToken).toBe("refresh-2");
    vi.setSystemTime(T0 + 40 * MIN);
    await jwtCb({ token: t });
    expect(exchangeCalls[1]).toBe("Bearer refresh-2");
  });
});

describe("jwt callback — failures", () => {
  it.each([401, 403])("refresh token rejected (%i): credentials dropped and SessionExpired set", async (status) => {
    exchangeReplies.push({ status });
    const login = signedInToken();
    vi.setSystemTime(T0 + 20 * MIN);
    const t = await jwtCb({ token: login });
    expect(t.backendToken).toBeUndefined();
    expect(t.backendRefreshToken).toBeUndefined();
    expect(t.error).toBe("SessionExpired");
  });

  it.each<ExchangeReply>([{ status: 502 }, { status: 503 }, "network-error"])(
    "backend outage (%o): stays signed in, keeps the refresh token, recovers on the next read",
    async (reply) => {
      exchangeReplies.push(reply);
      const login = signedInToken();
      vi.setSystemTime(T0 + 20 * MIN);
      const during = await jwtCb({ token: login });
      expect(during.error).toBeUndefined();
      expect(during.backendRefreshToken).toBe("refresh-1");
      vi.setSystemTime(T0 + 24 * MIN);
      const after = await jwtCb({ token: during });
      expect(after.backendTokenExp).toBeGreaterThan(Date.now());
      expect(after.error).toBeUndefined();
    },
  );

  it("no refresh token: expiry is flagged instead of leaving a dead token in place", async () => {
    const login = signedInToken({ backendRefreshToken: null });
    vi.setSystemTime(T0 + 20 * MIN);
    const t = await jwtCb({ token: login });
    expect(t.backendToken).toBeUndefined();
    expect(t.error).toBe("SessionExpired");
  });
});

describe("server-rendered session (root layout)", () => {
  async function serverSession(options: any) {
    const cookie = await encode({ secret: "test-secret", token: signedInToken() as any });
    const res = await AuthHandler({
      options: { ...options, providers: [], secret: "test-secret" },
      req: { action: "session", method: "GET", cookies: { "next-auth.session-token": cookie }, headers: {} },
    } as any);
    return res.body as any;
  }

  it("without authOptions (the old layout call) the session has no backend token — the root cause", async () => {
    const s = await serverSession({});
    expect(s.user.email).toBe("tekraj@mit.edu");
    expect(s.backendToken).toBeUndefined();
    expect(s.roles).toBeUndefined();
  });

  it("with authOptions the initial session carries the token and roles", async () => {
    const s = await serverSession(authOptions);
    expect(s.backendToken).toBeTruthy();
    expect(s.roles).toEqual(["Curator"]);
    expect(s.authSource).toBe("globus");
  });
});

describe("root layout wiring", () => {
  it("passes authOptions to getServerSession", async () => {
    const fs = await import("node:fs");
    for (const f of ["src/app/layout.tsx", "src/app/user/page.tsx"]) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/getServerSession\(\s*\)/);
      expect(src, f).toMatch(/getServerSession\(authOptions\)/);
    }
  });
});
