"use client";

/**
 * /admin — Statistics landing.
 *
 * Pulls a few cheap counts from the backend (users, roles, permissions,
 * page-access entries) and surfaces the current admin's identity. Each
 * card links into the relevant management surface.
 */

import React from "react";
import Link from "next/link";
import { FONTS, Icon } from "@/src/app/components/design-system";
import { adminApi } from "@/src/services/api/userManagement";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";

interface Counts {
  users: number | null;
  roles: number | null;
  permissions: number | null;
  pages: number | null;
}

export default function AdminStatsPage() {
  const { user } = useCurrentUser();
  const [counts, setCounts] = React.useState<Counts>({ users: null, roles: null, permissions: null, pages: null });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersC, roles, perms, pages] = await Promise.all([
          adminApi.countUsers().catch(() => ({ count: 0 })),
          adminApi.listRoles().catch(() => []),
          adminApi.listPermissions().catch(() => []),
          adminApi.listPageAccess().catch(() => []),
        ]);
        if (cancelled) return;
        setCounts({ users: usersC.count, roles: roles.length, permissions: perms.length, pages: pages.length });
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "request failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: "0 0 4px", letterSpacing: "-0.02em", fontWeight: 400 }}>
        Statistics
      </h1>
      <div style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginBottom: 24 }}>
        Manage users, roles, permissions, and page-level access for BrainKB.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { n: counts.users, l: "Users", icon: "person", c: "var(--bkb-agent)", href: "/admin/users" },
          { n: counts.roles, l: "Roles", icon: "shield", c: "var(--bkb-primary)", href: "/admin/roles" },
          { n: counts.permissions, l: "Permissions", icon: "key", c: "var(--bkb-evidence)", href: "/admin/roles" },
          { n: counts.pages, l: "Pages registered", icon: "lock", c: "var(--bkb-publication)", href: "/admin/page-access" },
        ].map((s) => (
          <Link
            key={s.l}
            href={s.href}
            className="bkb-card"
            style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: `color-mix(in oklch, ${s.c}, transparent 90%)`,
                color: s.c,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={s.icon} size={22} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {s.l}
              </div>
              <div style={{ fontFamily: FONTS.display, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", fontWeight: 400, marginTop: 2 }}>
                {s.n ?? "—"}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {error && (
        <div className="bkb-card" style={{ padding: 16, marginBottom: 16, borderColor: "var(--bkb-danger)", borderLeft: "3px solid var(--bkb-danger)" }}>
          <div style={{ fontSize: 12, color: "var(--bkb-danger)", fontWeight: 500 }}>Failed to reach the user management API.</div>
          <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginTop: 4 }}>{error}</div>
        </div>
      )}

      <div className="bkb-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Signed in as</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { l: "Email", v: user?.email ?? "—" },
            { l: "Profile ID", v: user?.profile_id != null ? String(user.profile_id) : "—" },
            { l: "Auth source", v: user?.auth_source ?? "—" },
            { l: "Roles", v: user?.roles?.join(", ") || "—" },
            { l: "Scopes", v: user?.scopes?.join(", ") || "—" },
            { l: "User ID", v: user?.user_id != null ? String(user.user_id) : "—" },
          ].map((h) => (
            <div key={h.l} style={{ padding: 12, border: "1px solid var(--bkb-border)", borderRadius: 6 }}>
              <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{h.l}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4, wordBreak: "break-all" }}>{h.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
