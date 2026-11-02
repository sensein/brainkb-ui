"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { useSession } from "next-auth/react";
import { useBackendFetch } from "@/src/hooks/useBackendFetch";
import { env } from "@/src/config/env";
import {
  initialResource,
  resourceReducer,
  responseError,
  toolAccess,
  type PageAccessCheck,
  type Resource,
  type ResourceEvent,
  type ToolAccess,
} from "@/src/lib/auth/accessState";

export type { PageAccessCheck, ToolAccess };

/**
 * Fires `cb` when the tab regains focus or visibility. Used by the page-access
 * hooks so an admin's grant in another tab takes effect on the user dashboard
 * the moment the user switches back, instead of waiting for a manual reload.
 */
function useRevalidateOnFocus(cb: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      if (document.visibilityState === "visible") cb();
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
    };
  }, [cb]);
}

export type PageAccessReason = PageAccessCheck["reason"];

interface UsePageAccessState {
  loading: boolean;
  allowed: boolean | null;
  reason: PageAccessReason | null;
  /** Set when the check failed. With `allowed` non-null it is the last known answer. */
  error: string | null;
  refresh: () => void;
}

type AccessResource = Resource<PageAccessCheck[]>;
const reduce = (s: AccessResource, e: ResourceEvent<PageAccessCheck[]>) => resourceReducer(s, e);

/**
 * Shared request loop for both hooks. Keyed on the signed-in identity and the
 * current access token, so a renewed token re-checks access (and a grant made
 * mid-session shows up) while the previous answer stays on screen. Failures go
 * through resourceReducer: they never replace a known answer with "denied".
 */
function useAccessChecks(pageKeys: string[], skip: boolean) {
  const { data: session, status } = useSession();
  const backendFetch = useBackendFetch();
  const identity = status === "authenticated" ? ((session?.user?.email as string | undefined) ?? null) : null;
  const backendToken = (session as any)?.backendToken as string | undefined;
  const [res, dispatch] = useReducer(reduce, identity, initialResource<PageAccessCheck[]>);
  const [bump, setBump] = useState(0);
  const refresh = useCallback(() => setBump((n) => n + 1), []);

  // Stable key so we don't re-fetch when the same keys are passed in a new array.
  const serialized = pageKeys.slice().sort().join(",");

  useEffect(() => {
    if (skip || status === "loading") return;
    if (!serialized) {
      dispatch({ type: "success", identity, data: [] });
      return;
    }
    let cancelled = false;
    dispatch({ type: "start", identity });
    (async () => {
      try {
        const keys = serialized.split(",");
        // Renews an expired session token and retries once (useBackendFetch).
        const r = keys.length === 1
          ? await backendFetch(`${env.userManagementApiBase}/api/access/page/${encodeURIComponent(keys[0])}`, {
              headers: { Accept: "application/json" },
            })
          : await backendFetch(`${env.userManagementApiBase}/api/access/pages`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify(keys),
            });
        const err = responseError(r);
        if (err) throw new Error(err);
        const json = await r.json();
        const data = (Array.isArray(json) ? json : [json]) as PageAccessCheck[];
        if (!cancelled) dispatch({ type: "success", identity, data });
      } catch (e: any) {
        if (!cancelled) dispatch({ type: "failure", identity, error: e?.message ?? "request failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serialized, skip, status, identity, backendToken, backendFetch, bump]);

  useRevalidateOnFocus(skip ? NOOP : refresh);

  // Never show another identity's answer, even for the render before the reset.
  const current = res.identity === identity ? res : initialResource<PageAccessCheck[]>(identity);
  return { res: current, refresh };
}

const NOOP = () => {};

/**
 * Check whether the currently logged-in user can access a single page.
 * Use this to gate entire routes. The page_key is a stable identifier the
 * admin UI configures against roles / per-user overrides in the backend.
 *
 * @example
 *   const { loading, allowed, reason } = usePageAccess("admin.users");
 *   if (loading) return <Spinner />;
 *   if (!allowed) return <Denied reason={reason} />;
 */
export function usePageAccess(
  pageKey: string,
  options?: { skip?: boolean },
): UsePageAccessState {
  // When `skip` is set (e.g. an admin-only gate that doesn't need backend
  // RBAC), short-circuit to a settled "allowed=false" state without firing a
  // request. The component using the hook is responsible for its own auth UX.
  const skip = !!options?.skip;
  const { res, refresh } = useAccessChecks([pageKey], skip);
  if (skip) return { loading: false, allowed: false, reason: null, error: null, refresh: NOOP };
  const hit = res.data?.find((c) => c.page_key === pageKey) ?? null;
  return {
    loading: !hit && res.status === "loading",
    allowed: hit ? hit.allowed : null,
    reason: hit?.reason ?? null,
    error: res.error,
    refresh,
  };
}

/**
 * Batch variant — useful for rendering navigation where many keys need to be
 * checked at once. Returns a map of { page_key -> allowed } plus the raw list,
 * and `access(key)`, which distinguishes "checking" and "unverified" (the check
 * failed and there is no previous answer) from a real "disabled".
 */
export function usePageAccessBatch(pageKeys: string[]): {
  loading: boolean;
  revalidating: boolean;
  allowedMap: Record<string, boolean>;
  results: PageAccessCheck[];
  error: string | null;
  access: (pageKey: string) => ToolAccess;
  refresh: () => void;
} {
  const { res, refresh } = useAccessChecks(pageKeys, false);
  const results = res.data ?? [];
  const allowedMap: Record<string, boolean> = {};
  for (const r of results) allowedMap[r.page_key] = r.allowed;
  return {
    loading: res.status === "loading",
    revalidating: res.revalidating,
    allowedMap,
    results,
    error: res.error,
    access: (k) => toolAccess(res, k),
    refresh,
  };
}
