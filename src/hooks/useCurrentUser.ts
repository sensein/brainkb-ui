"use client";

/**
 * useCurrentUser — fetches /api/users/me from the user-management backend and
 * shares the result between every component that asks. Exposes the JWT-derived
 * identity (email, profile_id, roles, scopes, auth_source) plus a friendly `name`
 * sourced from the NextAuth session.
 *
 * The backend issues this JWT after OAuth (see usermanagement_service
 * UI_INTEGRATION.md §1) and stamps the user's roles into it, so this is
 * the canonical source of truth for "who am I and what can I do".
 *
 * Membership is cached per signed-in identity (email), not per token: the access
 * token is renewed every ~15 minutes, and each renewal re-validates membership in
 * the background while the last known answer stays on screen. A failed request
 * never replaces a known membership with "no roles" (src/lib/auth/accessState.ts);
 * `error` + `stale` say the answer could not be refreshed. Signed in without a
 * backend token is a session to renew (useBackendFetch), not a role-less user.
 */

import { useEffect, useReducer, useState } from "react";
import { useSession } from "next-auth/react";
import { env } from "@/src/config/env";
import { useBackendFetch } from "@/src/hooks/useBackendFetch";
import { initialResource, resourceReducer, responseError, type Resource, type ResourceEvent } from "@/src/lib/auth/accessState";

export interface CurrentUser {
  email: string;
  name?: string | null;
  profile_id: number | null;
  user_id: number | null;
  roles: string[];
  scopes: string[];
  auth_source: string | null;
}

interface State {
  /** True until the first answer (or error) for this identity arrives. */
  loading: boolean;
  user: CurrentUser | null;
  error: string | null;
  /** True when `user` is the last known answer and the latest refresh failed. */
  stale: boolean;
  hasRole: (role: string) => boolean;
  /** True when the user has either the `Admin` or `SuperAdmin` role.
   *  SuperAdmin is the protected oversight tier — recognising it here means
   *  every gate that bypasses on `isAdmin` (PageAccessGate, AdminShell,
   *  the dashboard tile list) treats the two equivalently. */
  isAdmin: boolean;
  /** True only when the user has the `SuperAdmin` role. Used by surfaces
   *  that need to distinguish protected accounts (e.g. the admin users
   *  table that disables ban/delete on SuperAdmin rows). */
  isSuperAdmin: boolean;
  /**
   * Set when the backend returns 403 `account_suspended` from /api/users/me —
   * means an admin has banned this user. The UI surfaces a friendly
   * suspension page instead of the generic error.
   */
  banned: { reason: string | null; banned_at: string | null } | null;
  refresh: () => void;
}

type Banned = { reason: string | null; banned_at: string | null };
type MeOutcome = { kind: "ok"; user: CurrentUser } | { kind: "banned"; info: Banned };

// Shared across hook instances (navbar, dashboard, gates all ask at once).
let lastGood: { identity: string; user: CurrentUser } | null = null;
let freshKey: string | null = null; // request key last answered successfully
let inflight: { key: string; promise: Promise<MeOutcome> } | null = null;
let generation = 0; // bumped by refresh() / tab focus to force a re-read
const subscribers = new Set<() => void>();

function bumpGeneration() {
  generation += 1;
  subscribers.forEach((fn) => fn());
}

// One focus listener for the whole app: re-read /api/users/me when the tab
// regains focus so role / ban changes an admin makes elsewhere take effect
// without a sign-out. (Per-instance listeners fired one request per component.)
if (typeof window !== "undefined") {
  const onVisible = () => {
    if (document.visibilityState === "visible") bumpGeneration();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
}

async function readMe(fetcher: ReturnType<typeof useBackendFetch>): Promise<MeOutcome> {
  const res = await fetcher(`${env.userManagementApiBase}/api/users/me`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 403) {
    // Backend may return either a raw error string or a structured
    // `account_suspended` payload from `_enforce_not_banned`. Detect
    // the latter so the UI can show a real "your account is
    // suspended" page rather than a generic 403.
    let body: any = null;
    try { body = await res.json(); } catch { /* non-JSON body */ }
    const detail = body?.detail;
    if (detail && typeof detail === "object" && detail.error === "account_suspended") {
      return { kind: "banned", info: { reason: detail.ban_reason ?? null, banned_at: detail.banned_at ?? null } };
    }
  }
  const err = responseError(res);
  if (err) throw new Error(err);
  const data = await res.json();
  return {
    kind: "ok",
    user: {
      email: data.email,
      profile_id: data.profile_id ?? null,
      user_id: data.user_id ?? null,
      roles: Array.isArray(data.roles) ? data.roles : [],
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      auth_source: data.auth_source ?? null,
    },
  };
}

export function useCurrentUser(): State {
  const { data: session, status } = useSession();
  const backendFetch = useBackendFetch();
  const sessionName = (session?.user?.name as string | undefined) ?? null;
  const sessionEmail = (session?.user?.email as string | undefined) ?? null;
  const backendToken = (session as any)?.backendToken as string | undefined;
  const identity = status === "authenticated" ? sessionEmail : null;

  const [res, dispatch] = useReducer(
    (s: Resource<CurrentUser>, e: ResourceEvent<CurrentUser>) => resourceReducer(s, e),
    identity,
    (id) => {
      const r = initialResource<CurrentUser>(id);
      return lastGood && lastGood.identity === id ? { ...r, data: lastGood.user, status: "ready" as const } : r;
    },
  );
  const [banned, setBanned] = useState<Banned | null>(null);
  const [gen, setGen] = useState(generation);

  useEffect(() => {
    const fn = () => setGen(generation);
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!identity) {
      // Signed out: forget everything, for everyone.
      lastGood = null;
      freshKey = null;
      setBanned(null);
      dispatch({ type: "reset", identity: null });
      return;
    }
    if (lastGood && lastGood.identity === identity) {
      dispatch({ type: "success", identity, data: lastGood.user });
    }
    // A renewed token re-validates membership; the cached answer stays visible.
    const key = `${identity}|${backendToken ?? ""}|${gen}`;
    if (freshKey === key) return;

    let cancelled = false;
    dispatch({ type: "start", identity });
    if (!inflight || inflight.key !== key) {
      const promise = readMe(backendFetch);
      inflight = { key, promise };
      promise.then(
        (out) => {
          if (out.kind === "ok") {
            lastGood = { identity, user: out.user };
            freshKey = key;
          }
        },
        () => { /* handled per instance below */ },
      ).finally(() => {
        if (inflight?.promise === promise) inflight = null;
      });
    }
    inflight.promise.then(
      (out) => {
        if (cancelled) return;
        if (out.kind === "banned") {
          setBanned(out.info);
          lastGood = null;
          dispatch({ type: "reset", identity });
          dispatch({ type: "failure", identity, error: "account_suspended" });
          return;
        }
        setBanned(null);
        dispatch({ type: "success", identity, data: out.user });
      },
      (e: any) => {
        if (!cancelled) dispatch({ type: "failure", identity, error: e?.message ?? "request failed" });
      },
    );
    return () => { cancelled = true; };
  }, [identity, backendToken, backendFetch, status, gen]);

  const user = res.identity === identity && res.data ? { ...res.data, name: sessionName } : null;
  const roles = user?.roles ?? [];

  return {
    loading: status === "loading" || (!!identity && res.status === "loading"),
    user,
    error: res.error,
    stale: !!(res.error && res.data),
    banned,
    hasRole: (role: string) => roles.includes(role),
    isAdmin: roles.includes("Admin") || roles.includes("SuperAdmin"),
    isSuperAdmin: roles.includes("SuperAdmin"),
    refresh: bumpGeneration,
  };
}
