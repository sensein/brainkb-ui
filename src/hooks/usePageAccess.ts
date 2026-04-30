"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { env } from "@/src/config/env";

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

export type PageAccessReason = "public" | "role" | "user_override" | "denied" | "not_found";

export interface PageAccessCheck {
  page_key: string;
  allowed: boolean;
  reason: PageAccessReason;
}

interface UsePageAccessState {
  loading: boolean;
  allowed: boolean | null;
  reason: PageAccessReason | null;
  error: string | null;
  refresh: () => void;
}

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
  const { data: session, status } = useSession();
  const refreshNoop = useCallback(() => {}, []);
  // When `skip` is set (e.g. an admin-only gate that doesn't need backend
  // RBAC), short-circuit to a settled "allowed=false" state without firing a
  // request. The component using the hook is responsible for its own auth UX.
  const [state, setState] = useState<Omit<UsePageAccessState, "refresh">>(() =>
    options?.skip
      ? { loading: false, allowed: false, reason: null, error: null }
      : { loading: true, allowed: null, reason: null, error: null },
  );
  const [bump, setBump] = useState(0);
  const refresh = useCallback(() => setBump((n) => n + 1), []);

  useEffect(() => {
    if (options?.skip) {
      setState({ loading: false, allowed: false, reason: null, error: null });
      return;
    }
    if (status === "loading") return;
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        const backendToken = (session as any)?.backendToken as string | undefined;
        if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`;
        const res = await fetch(
          `${env.userManagementApiBase}/api/access/page/${encodeURIComponent(pageKey)}`,
          { headers, cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PageAccessCheck;
        if (!cancelled) {
          setState({ loading: false, allowed: data.allowed, reason: data.reason, error: null });
        }
      } catch (e: any) {
        if (!cancelled) {
          setState({ loading: false, allowed: false, reason: null, error: e?.message ?? "request failed" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageKey, status, session, options?.skip, bump]);

  useRevalidateOnFocus(options?.skip ? refreshNoop : refresh);

  return { ...state, refresh };
}

/**
 * Batch variant — useful for rendering navigation where many keys need to be
 * checked at once. Returns a map of { page_key -> allowed } plus the raw list.
 */
export function usePageAccessBatch(pageKeys: string[]): {
  loading: boolean;
  allowedMap: Record<string, boolean>;
  results: PageAccessCheck[];
  error: string | null;
  refresh: () => void;
} {
  const { data: session, status } = useSession();
  const [results, setResults] = useState<PageAccessCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0);
  const refresh = useCallback(() => setBump((n) => n + 1), []);

  // Stable key so we don't re-fetch when the same keys are passed in a new array.
  const serialized = pageKeys.slice().sort().join(",");

  useEffect(() => {
    if (status === "loading") return;
    if (!serialized) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        const backendToken = (session as any)?.backendToken as string | undefined;
        if (backendToken) headers["Authorization"] = `Bearer ${backendToken}`;
        const res = await fetch(`${env.userManagementApiBase}/api/access/pages`, {
          method: "POST",
          headers,
          body: JSON.stringify(serialized.split(",")),
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as PageAccessCheck[];
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "request failed");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, status, session, bump]);

  useRevalidateOnFocus(refresh);

  const allowedMap: Record<string, boolean> = {};
  for (const r of results) allowedMap[r.page_key] = r.allowed;

  return { loading, allowedMap, results, error, refresh };
}
