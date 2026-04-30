"use client";

/**
 * PageAccessGate — wrap any client page with this to enforce default-deny
 * RBAC against the user-management backend. The backend's response of
 * `not_found` is treated as denied so brand-new tools are off until an
 * admin creates the page-access entry and grants roles/users.
 *
 * Usage:
 *   <PageAccessGate pageKey="tools.ingest-kg">
 *     <YourToolPage />
 *   </PageAccessGate>
 */

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePageAccess } from "@/src/hooks/usePageAccess";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";
import { FONTS, Icon } from "@/src/app/components/design-system";
import { ENABLE_PAGE_ACCESS_GATE } from "@/src/config/featureFlags";

export interface PageAccessGateProps {
  pageKey: string;
  /** Human-readable name for the denied screen. Falls back to pageKey. */
  label?: string;
  /**
   * If true, this page is restricted to admins only. The backend
   * page-access table is bypassed entirely — the gate just checks
   * `isAdmin` from /api/users/me. Use this for tools that should never
   * be opened to other roles (e.g. data-destructive admin operations
   * surfaced under /user/* for ergonomic reasons).
   *
   * Always pair with `adminOnly: true` on the matching `TOOL_REGISTRY`
   * entry so the admin UI knows not to surface the tool in the
   * "register this tool" banner.
   */
  adminOnly?: boolean;
  children: React.ReactNode;
}

export function PageAccessGate({ pageKey, label, adminOnly, children }: PageAccessGateProps) {
  // Skip the backend round-trip for admin-only pages — the only fact that
  // matters is `isAdmin`. usePageAccess is conditional via skip mode so we
  // don't burn a fetch per render on these pages.
  const { loading, allowed, reason, error } = usePageAccess(pageKey, { skip: adminOnly });
  const { user, isAdmin, loading: userLoading } = useCurrentUser();
  const { status } = useSession();

  // Authentication is always required, regardless of the RBAC bypass below.
  // Bypassing RBAC must never bypass sign-in.
  if (status === "loading") {
    return (
      <div style={{ padding: "60px 36px", color: "var(--bkb-textMuted)", fontSize: 13 }}>
        Checking access…
      </div>
    );
  }
  if (status !== "authenticated") {
    return (
      <div style={{ padding: "60px 36px", maxWidth: 560 }}>
        <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Sign in required
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
          You need to sign in to view this page
        </h1>
        <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
          Sign in from the navbar to continue to {label ?? pageKey}.
        </p>
      </div>
    );
  }

  // RBAC bypass for local dev (NEXT_PUBLIC_ENABLE_PAGE_ACCESS_GATE=false).
  // Auth is already enforced above — this only short-circuits the backend
  // page-access check.
  if (!ENABLE_PAGE_ACCESS_GATE) return <>{children}</>;

  // Admins can see everything regardless of per-page entries.
  if (isAdmin) return <>{children}</>;

  if (adminOnly) {
    if (userLoading) {
      return (
        <div style={{ padding: "60px 36px", color: "var(--bkb-textMuted)", fontSize: 13 }}>
          Checking access…
        </div>
      );
    }
    return (
      <div style={{ padding: "60px 36px", maxWidth: 560 }}>
        <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Admin only
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
          {label ?? pageKey} requires the Admin role
        </h1>
        <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
          This tool is locked to administrators. Other roles cannot be granted access from the page-access UI.
        </p>
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "var(--bkb-surfaceAlt)",
            border: "1px solid var(--bkb-border)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--bkb-textMuted)",
            fontFamily: FONTS.mono,
          }}
        >
          page_key: <span style={{ color: "var(--bkb-text)" }}>{pageKey}</span>
          <br />
          signed in as: <span style={{ color: "var(--bkb-text)" }}>{user?.email ?? "guest"}</span>
          <br />
          roles: <span style={{ color: "var(--bkb-text)" }}>{(user?.roles ?? []).join(", ") || "—"}</span>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Link href="/user/dashboard" className="bkb-btn bkb-btn-ghost" style={{ textDecoration: "none" }}>
            <Icon name="arrow" size={12} /> Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "60px 36px", color: "var(--bkb-textMuted)", fontSize: 13 }}>
        Checking access…
      </div>
    );
  }

  if (allowed) return <>{children}</>;

  const reasonCopy: Record<string, string> = {
    public: "This page is public.",
    role: "Your role grants access.",
    user_override: "Access has been granted to your account directly.",
    denied: "Your account does not have access to this tool.",
    not_found: "An admin has not yet enabled this tool. By default, new tools are disabled until granted.",
  };

  return (
    <div style={{ padding: "60px 36px", maxWidth: 560 }}>
      <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        Access required
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
        {label ?? pageKey} is disabled
      </h1>
      <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
        {error
          ? `Could not check access: ${error}`
          : reason
            ? reasonCopy[reason] ?? "Access denied."
            : "Access denied."}
      </p>
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: "var(--bkb-surfaceAlt)",
          border: "1px solid var(--bkb-border)",
          borderRadius: 6,
          fontSize: 12,
          color: "var(--bkb-textMuted)",
          fontFamily: FONTS.mono,
        }}
      >
        page_key: <span style={{ color: "var(--bkb-text)" }}>{pageKey}</span>
        <br />
        signed in as: <span style={{ color: "var(--bkb-text)" }}>{user?.email ?? "guest"}</span>
        <br />
        roles: <span style={{ color: "var(--bkb-text)" }}>{(user?.roles ?? []).join(", ") || "—"}</span>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <Link href="/user/dashboard" className="bkb-btn bkb-btn-ghost" style={{ textDecoration: "none" }}>
          <Icon name="arrow" size={12} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
