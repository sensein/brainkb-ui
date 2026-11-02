/**
 * Permission state that a failed request cannot erase. Framework-free so it can
 * be unit-tested; the page-access hooks and useCurrentUser drive it.
 *
 * The rule: only a successful answer from the backend changes what the user may
 * do. A failure (5xx, network, a 401 that renewal could not fix) marks the last
 * known answer as stale and records the error, but keeps it — so a blip mid-
 * session no longer turns every tool to "disabled". With no answer yet, a failure
 * is reported as an error, never as "denied": the UI must say "couldn't verify",
 * not "you don't have access".
 *
 * State is scoped to an identity (the signed-in email). A different user, or
 * signing out, starts from scratch so one person's grants never leak to another.
 */

export type LoadStatus = "loading" | "ready" | "error";

export interface Resource<T> {
  identity: string | null;
  data: T | null;
  status: LoadStatus;
  /** True while a request is in flight on top of data we already show. */
  revalidating: boolean;
  /** Last error; with `data` present it means "showing the last known answer". */
  error: string | null;
}

export type ResourceEvent<T> =
  | { type: "start"; identity: string | null }
  | { type: "success"; identity: string | null; data: T }
  | { type: "failure"; identity: string | null; error: string }
  | { type: "reset"; identity: string | null };

export function initialResource<T>(identity: string | null = null): Resource<T> {
  return { identity, data: null, status: "loading", revalidating: false, error: null };
}

export function resourceReducer<T>(prev: Resource<T>, ev: ResourceEvent<T>): Resource<T> {
  // An event for another identity: drop everything we knew about the previous one.
  const base = ev.identity === prev.identity ? prev : initialResource<T>(ev.identity);
  switch (ev.type) {
    case "reset":
      return initialResource<T>(ev.identity);
    case "start":
      return base.data
        ? { ...base, revalidating: true }
        : { ...base, status: "loading", revalidating: false };
    case "success":
      return { identity: ev.identity, data: ev.data, status: "ready", revalidating: false, error: null };
    case "failure":
      return base.data
        ? { ...base, status: "ready", revalidating: false, error: ev.error }
        : { ...base, status: "error", revalidating: false, error: ev.error };
  }
}

export interface PageAccessCheck {
  page_key: string;
  allowed: boolean;
  reason: "public" | "role" | "user_override" | "denied" | "not_found";
}

export type ToolAccess = "checking" | "available" | "disabled" | "unverified";

/** What a tool card should show for `pageKey`. "unverified" = we could not ask. */
export function toolAccess(r: Resource<PageAccessCheck[]>, pageKey: string): ToolAccess {
  const hit = r.data?.find((c) => c.page_key === pageKey);
  if (hit) return hit.allowed ? "available" : "disabled";
  if (r.status === "loading") return "checking";
  return r.status === "error" || r.error ? "unverified" : "disabled";
}

/** Error text for a non-OK response, or null when the body can be used. */
export function responseError(res: Response): string | null {
  if (res.ok) return null;
  if (res.status === 401) return "session could not be renewed (401)";
  return `HTTP ${res.status}`;
}
