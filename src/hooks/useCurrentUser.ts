"use client";

/**
 * useCurrentUser — fetches /api/users/me from the user-management backend
 * once per session and caches the result. Exposes the JWT-derived identity
 * (email, profile_id, roles, scopes, auth_source) plus a friendly `name`
 * sourced from the NextAuth session.
 *
 * The backend issues this JWT after OAuth (see usermanagement_service
 * UI_INTEGRATION.md §1) and stamps the user's roles into it, so this is
 * the canonical source of truth for "who am I and what can I do".
 */

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { env } from "@/src/config/env";

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
  loading: boolean;
  user: CurrentUser | null;
  error: string | null;
  hasRole: (role: string) => boolean;
  isAdmin: boolean;
  /**
   * Set when the backend returns 403 `account_suspended` from /api/users/me —
   * means an admin has banned this user. The UI surfaces a friendly
   * suspension page instead of the generic error.
   */
  banned: { reason: string | null; banned_at: string | null } | null;
  refresh: () => void;
}

let cachedUser: CurrentUser | null = null;
let cacheKey: string | null = null;

export function useCurrentUser(): State {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState<boolean>(!cachedUser);
  const [error, setError] = useState<string | null>(null);
  const [banned, setBanned] = useState<{ reason: string | null; banned_at: string | null } | null>(null);
  const [bump, setBump] = useState(0);

  const backendToken = (session as any)?.backendToken as string | undefined;
  const sessionName = (session?.user?.name as string | undefined) ?? null;
  const sessionEmail = (session?.user?.email as string | undefined) ?? null;
  const key = backendToken ?? `anon:${sessionEmail ?? ""}`;

  useEffect(() => {
    if (status === "loading") return;

    // No session → no backend identity. Surface the email if NextAuth has one.
    if (!backendToken) {
      cachedUser = sessionEmail
        ? { email: sessionEmail, name: sessionName, profile_id: null, user_id: null, roles: [], scopes: [], auth_source: null }
        : null;
      cacheKey = key;
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    if (cacheKey === key && cachedUser) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${env.userManagementApiBase}/api/users/me`, {
          headers: { Authorization: `Bearer ${backendToken}`, Accept: "application/json" },
          cache: "no-store",
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
            if (!cancelled) {
              setBanned({
                reason: detail.ban_reason ?? null,
                banned_at: detail.banned_at ?? null,
              });
              setUser(null);
              setLoading(false);
            }
            return;
          }
          throw new Error(`HTTP 403`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const next: CurrentUser = {
          email: data.email,
          name: sessionName,
          profile_id: data.profile_id ?? null,
          user_id: data.user_id ?? null,
          roles: Array.isArray(data.roles) ? data.roles : [],
          scopes: Array.isArray(data.scopes) ? data.scopes : [],
          auth_source: data.auth_source ?? null,
        };
        if (!cancelled) {
          cachedUser = next;
          cacheKey = key;
          setUser(next);
          setBanned(null);
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
  }, [key, backendToken, sessionEmail, sessionName, status, bump]);

  const refresh = () => {
    cachedUser = null;
    cacheKey = null;
    setBump((n) => n + 1);
  };

  // Re-read /api/users/me when the tab regains focus so role / ban changes an
  // admin makes in another tab take effect without forcing a sign-out.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("focus", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("focus", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    user,
    error,
    banned,
    hasRole: (role: string) => !!user?.roles?.includes(role),
    isAdmin: !!user?.roles?.includes("Admin"),
    refresh,
  };
}
