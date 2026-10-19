import { describe, expect, it } from "vitest";
import {
  initialResource,
  resourceReducer,
  responseError,
  toolAccess,
  type PageAccessCheck,
  type Resource,
  type ResourceEvent,
} from "@/src/lib/auth/accessState";

type R = Resource<PageAccessCheck[]>;
const ME = "tekraj@mit.edu";
const granted: PageAccessCheck[] = [
  { page_key: "tools.ingest-kg", allowed: true, reason: "role" },
  { page_key: "tools.synth-scholar", allowed: false, reason: "denied" },
];
const run = (events: ResourceEvent<PageAccessCheck[]>[], from: R = initialResource(ME)) =>
  events.reduce<R>((s, e) => resourceReducer(s, e), from);

describe("permission state under failures", () => {
  it("first load: checking, then the real answer", () => {
    const loading = run([{ type: "start", identity: ME }]);
    expect(toolAccess(loading, "tools.ingest-kg")).toBe("checking");
    const ready = run([{ type: "success", identity: ME, data: granted }], loading);
    expect(toolAccess(ready, "tools.ingest-kg")).toBe("available");
    expect(toolAccess(ready, "tools.synth-scholar")).toBe("disabled");
  });

  it("transient 5xx / network error mid-session keeps the granted tools", () => {
    const s = run([
      { type: "success", identity: ME, data: granted },
      { type: "start", identity: ME },
      { type: "failure", identity: ME, error: "HTTP 502" },
    ]);
    expect(toolAccess(s, "tools.ingest-kg")).toBe("available");
    expect(s.error).toBe("HTTP 502");
    expect(s.status).toBe("ready");
  });

  it("a failure with no previous answer is 'unverified', never 'disabled'", () => {
    const s = run([{ type: "start", identity: ME }, { type: "failure", identity: ME, error: "HTTP 503" }]);
    expect(toolAccess(s, "tools.ingest-kg")).toBe("unverified");
    expect(s.status).toBe("error");
  });

  it("background revalidation (renewed token, tab focus) keeps tools visible — no flicker", () => {
    const s = run([{ type: "success", identity: ME, data: granted }, { type: "start", identity: ME }]);
    expect(s.revalidating).toBe(true);
    expect(toolAccess(s, "tools.ingest-kg")).toBe("available");
  });

  it("recovery: the next successful check clears the error and applies new grants", () => {
    const regrant = granted.map((c) => ({ ...c, allowed: true, reason: "role" as const }));
    const s = run([
      { type: "start", identity: ME },
      { type: "failure", identity: ME, error: "session could not be renewed (401)" },
      { type: "start", identity: ME },
      { type: "success", identity: ME, data: regrant },
    ]);
    expect(s.error).toBeNull();
    expect(toolAccess(s, "tools.synth-scholar")).toBe("available");
  });

  it("a genuine revocation (successful answer) DOES disable the tool", () => {
    const revoked = granted.map((c) => ({ ...c, allowed: false, reason: "denied" as const }));
    const s = run([{ type: "success", identity: ME, data: granted }, { type: "success", identity: ME, data: revoked }]);
    expect(toolAccess(s, "tools.ingest-kg")).toBe("disabled");
  });

  it("another identity or sign-out never inherits the previous user's grants", () => {
    const mine = run([{ type: "success", identity: ME, data: granted }]);
    const other = resourceReducer(mine, { type: "failure", identity: "someone@else.org", error: "HTTP 500" });
    expect(other.data).toBeNull();
    expect(toolAccess(other, "tools.ingest-kg")).toBe("unverified");
    const signedOut = resourceReducer(mine, { type: "reset", identity: null });
    expect(signedOut.data).toBeNull();
  });
});

describe("responseError", () => {
  it("only OK bodies are usable", () => {
    expect(responseError(new Response("[]", { status: 200 }))).toBeNull();
    expect(responseError(new Response(null, { status: 401 }))).toMatch(/401/);
    expect(responseError(new Response(null, { status: 500 }))).toBe("HTTP 500");
  });
});
