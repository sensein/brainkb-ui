"use client";

/**
 * AuthGate — requires the visitor to be signed in. Wraps any client surface
 * that should never be rendered to anonymous users (e.g. /user/* dashboards
 * and tool pages). This is *only* an authentication check — RBAC for who can
 * see which tool lives in PageAccessGate.
 *
 * Without this gate, /user/dashboard renders "Welcome back, Guest" to anyone
 * who knows the URL, and the tool layouts that rely on PageAccessGate get
 * silently bypassed in test mode.
 */

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FONTS, Icon } from "@/src/app/components/design-system";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

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
        <div
          style={{
            fontSize: 11,
            color: "var(--bkb-textSubtle)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Sign in required
        </div>
        <h1
          style={{
            fontFamily: FONTS.display,
            fontSize: 32,
            margin: 0,
            letterSpacing: "-0.02em",
            fontWeight: 400,
          }}
        >
          You need to sign in to view this page
        </h1>
        <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
          The dashboard, workflow tools, and admin surface are only available to
          authenticated users. Sign in with GitHub, ORCID, or Globus from the
          navbar to continue.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <Link href="/" className="bkb-btn bkb-btn-ghost" style={{ textDecoration: "none" }}>
            <Icon name="arrow" size={12} /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
