"use client";

/**
 * AdminShell — sidebar + content layout for /admin/*.
 *
 * Gates the entire surface behind the Admin role. While useCurrentUser is
 * still loading, shows a skeleton (rather than flashing a 403 to a user
 * who is in fact admin). Non-admins get a denied page.
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FONTS, Icon, Logo } from "@/src/app/components/design-system";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";

const ADMIN_NAV: { href: string; label: string; icon: string }[] = [
  { href: "/admin/dashboard", label: "Statistics", icon: "dash" },
  { href: "/admin/users", label: "Users", icon: "person" },
  { href: "/admin/roles", label: "Roles & permissions", icon: "shield" },
  { href: "/admin/page-access", label: "Page access", icon: "lock" },
  { href: "/admin/guide", label: "Guide", icon: "info" },
];

function AdminSidebar() {
  const pathname = usePathname() || "/admin/dashboard";
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  return (
    // admin-sidebar class hooks the mobile media query below (becomes a top bar)
    <aside
      className="admin-sidebar"
      style={{
        background: "var(--bkb-surface)",
        borderRight: "1px solid var(--bkb-border)",
        padding: "20px 12px",
        minHeight: "100%",
      }}
    >
      <div className="admin-sidebar-head" style={{ padding: "4px 10px 16px", borderBottom: "1px solid var(--bkb-border)", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={22} />
        <div>
          <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Admin
          </div>
          <div style={{ fontFamily: FONTS.display, fontSize: 18, letterSpacing: "-0.01em" }}>BrainKB</div>
        </div>
      </div>
      {/* admin-sidebar-nav: vertical list on desktop, horizontal scroll bar on mobile */}
      <nav className="admin-sidebar-nav">
        {ADMIN_NAV.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="admin-sidebar-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                textDecoration: "none",
                background: active ? "var(--bkb-surfaceAlt)" : "transparent",
                color: active ? "var(--bkb-text)" : "var(--bkb-textMuted)",
                borderRadius: 6,
                fontSize: 13,
                fontFamily: FONTS.body,
                fontWeight: active ? 500 : 400,
                marginBottom: 2,
              }}
            >
              <Icon name={it.icon} size={14} /> {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function SuspendedNotice({ reason, bannedAt }: { reason: string | null; bannedAt: string | null }) {
  return (
    <div style={{ padding: "60px 36px", maxWidth: 560 }}>
      <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        Account suspended
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
        Your account has been suspended
      </h1>
      <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>
        {reason
          ? <>An administrator suspended this account with the following reason: <em>{reason}</em></>
          : "An administrator suspended this account."}
        {bannedAt && (
          <>
            {" "}Effective <span className="bkb-mono">{new Date(bannedAt).toLocaleString()}</span>.
          </>
        )}
      </p>
      <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 8 }}>
        If you believe this is an error, contact a platform administrator.
      </p>
    </div>
  );
}

function Denied({ reason }: { reason: string }) {
  return (
    <div style={{ padding: "60px 36px", maxWidth: 520 }}>
      <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        Forbidden
      </div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
        Admin access required
      </h1>
      <p style={{ fontSize: 13, color: "var(--bkb-textMuted)", lineHeight: 1.6, marginTop: 12 }}>{reason}</p>
      <Link href="/user/dashboard" className="bkb-btn bkb-btn-ghost" style={{ marginTop: 16, textDecoration: "none" }}>
        <Icon name="arrow" size={12} /> Back to dashboard
      </Link>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, banned } = useCurrentUser();

  if (loading) {
    return (
      <div style={{ padding: "60px 36px", color: "var(--bkb-textMuted)", fontSize: 13 }}>Checking access…</div>
    );
  }

  if (banned) {
    return <SuspendedNotice reason={banned.reason} bannedAt={banned.banned_at} />;
  }

  if (!user) {
    return <Denied reason="You need to sign in with an account that has the Admin role to view this surface." />;
  }

  if (!isAdmin) {
    return (
      <Denied
        reason={`Signed in as ${user.email} (${(user.roles ?? []).join(", ") || "no roles"}). The Admin role is required.`}
      />
    );
  }

  return (
    // admin-shell: fixed 220px sidebar on desktop; collapses to stacked rows on mobile
    <div className="admin-shell" style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100%", background: "var(--bkb-bg)" }}>
      <AdminSidebar />
      <main className="admin-main" style={{ padding: "28px 36px", minWidth: 0 }}>{children}</main>
      {/* Mobile responsiveness for the shell — inline styles can't do media
          queries, so scope them here. Desktop layout is untouched. */}
      <style>{`
        @media (max-width: 900px) {
          /* Sidebar stops stealing a fixed column; stack it above the content */
          .admin-shell { grid-template-columns: 1fr !important; }
          /* Sidebar becomes a top bar: no right border, shorter padding */
          .admin-sidebar { border-right: none !important; border-bottom: 1px solid var(--bkb-border); min-height: 0 !important; padding: 12px 16px !important; }
          /* Nav items flow horizontally and scroll instead of stacking tall */
          .admin-sidebar-nav { display: flex; flex-direction: row; gap: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .admin-sidebar-link { width: auto !important; white-space: nowrap; margin-bottom: 0 !important; }
          /* Trim the generous desktop content padding on tablet */
          .admin-main { padding: 20px !important; }
        }
        @media (max-width: 600px) {
          .admin-main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
