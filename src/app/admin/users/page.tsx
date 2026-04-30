"use client";

/**
 * /admin/users — list, search, and manage roles for users.
 *
 * Wired to:
 *   GET    /api/admin/users
 *   DELETE /api/admin/users/{profile_id}
 *   POST   /api/admin/users/{profile_id}/roles
 *   DELETE /api/admin/users/{profile_id}/roles/{role_name}
 */

import React from "react";
import { FONTS, Icon } from "@/src/app/components/design-system";
import {
  adminApi,
  type AdminUserListItem,
  type AvailableRole,
} from "@/src/services/api/userManagement";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";

export default function AdminUsersPage() {
  const { user: me } = useCurrentUser();
  const [users, setUsers] = React.useState<AdminUserListItem[]>([]);
  const [roles, setRoles] = React.useState<AvailableRole[]>([]);
  const [q, setQ] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actingOn, setActingOn] = React.useState<number | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminApi.listUsers({ q: q || undefined, role: roleFilter || undefined, limit: 100 });
      setUsers(list);
    } catch (e: any) {
      setError(e?.message ?? "request failed");
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter]);

  React.useEffect(() => {
    adminApi.listRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  async function assignRole(profile_id: number, role: string) {
    if (!role) return;
    setActingOn(profile_id);
    try {
      await adminApi.assignRoleToUser(profile_id, { role, is_active: true });
      await reload();
    } catch (e: any) {
      alert(`Could not assign role: ${e?.message ?? "request failed"}`);
    } finally {
      setActingOn(null);
    }
  }

  async function removeRole(profile_id: number, role: string) {
    if (role === "SuperAdmin") {
      alert("The SuperAdmin role is protected and cannot be removed via the admin UI.");
      return;
    }
    if (!confirm(`Remove role "${role}" from this user?`)) return;
    setActingOn(profile_id);
    try {
      await adminApi.removeRoleFromUser(profile_id, role);
      await reload();
    } catch (e: any) {
      alert(`Could not remove role: ${e?.message ?? "request failed"}`);
    } finally {
      setActingOn(null);
    }
  }

  async function deleteUser(profile_id: number, email: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
      alert("SuperAdmin accounts cannot be deleted via the admin UI.");
      return;
    }
    if (!confirm(`Delete user ${email}? This cascades through their activities, roles, and OAuth identities.`)) return;
    setActingOn(profile_id);
    try {
      await adminApi.deleteUser(profile_id);
      await reload();
    } catch (e: any) {
      alert(`Could not delete user: ${e?.message ?? "request failed"}`);
    } finally {
      setActingOn(null);
    }
  }

  async function banUser(profile_id: number, email: string, isSuperAdmin: boolean) {
    if (isSuperAdmin) {
      alert("SuperAdmin accounts cannot be banned via the admin UI.");
      return;
    }
    const reason = window.prompt(`Suspend ${email}? Provide a reason — visible to other admins for audit.`);
    if (reason === null) return; // user hit cancel
    const trimmed = reason.trim();
    if (!trimmed) {
      alert("A reason is required.");
      return;
    }
    setActingOn(profile_id);
    try {
      await adminApi.banUser(profile_id, trimmed);
      await reload();
    } catch (e: any) {
      alert(`Could not ban user: ${e?.message ?? "request failed"}`);
    } finally {
      setActingOn(null);
    }
  }

  async function unbanUser(profile_id: number, email: string) {
    if (!confirm(`Lift suspension for ${email}? They'll be able to use the platform again immediately.`)) return;
    setActingOn(profile_id);
    try {
      await adminApi.unbanUser(profile_id);
      await reload();
    } catch (e: any) {
      alert(`Could not unban user: ${e?.message ?? "request failed"}`);
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: "0 0 4px", letterSpacing: "-0.02em", fontWeight: 400 }}>
            Users
          </h1>
          <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>
            Browse user profiles, assign roles, and revoke access.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="bkb-input"
            placeholder="Search by name, email, ORCID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 260 }}
          />
          <select
            className="bkb-input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="">All roles</option>
            {roles.map((r) => (
              <option key={r.id ?? r.name} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bkb-card" style={{ padding: 14, marginBottom: 16, borderColor: "var(--bkb-danger)", borderLeft: "3px solid var(--bkb-danger)" }}>
          <div style={{ fontSize: 12, color: "var(--bkb-danger)", fontWeight: 500 }}>{error}</div>
        </div>
      )}

      <div className="bkb-card">
        <div
          style={{
            padding: "10px 18px",
            background: "var(--bkb-surfaceAlt)",
            borderBottom: "1px solid var(--bkb-border)",
            display: "grid",
            gridTemplateColumns: "1.5fr 1.6fr 1fr 1.4fr 0.6fr 160px",
            gap: 16,
            fontSize: 11,
            color: "var(--bkb-textMuted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span>User</span>
          <span>Email · ORCID</span>
          <span>Providers</span>
          <span>Roles</span>
          <span>Joined</span>
          <span></span>
        </div>
        {loading && (
          <div style={{ padding: 18, fontSize: 12, color: "var(--bkb-textMuted)" }}>Loading…</div>
        )}
        {!loading && users.length === 0 && (
          <div style={{ padding: 18, fontSize: 12, color: "var(--bkb-textMuted)" }}>No users match the current filter.</div>
        )}
        {!loading &&
          users.map((u, i) => {
            const isSelf = me?.profile_id === u.profile_id;
            const isSuperAdmin = u.roles.includes("SuperAdmin");
            return (
            <div
              key={u.profile_id}
              className="bkb-hover-row"
              style={{
                padding: "12px 18px",
                borderBottom: i < users.length - 1 ? "1px solid var(--bkb-border)" : "none",
                display: "grid",
                gridTemplateColumns: "1.5fr 1.6fr 1fr 1.4fr 0.6fr 160px",
                gap: 16,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  {u.name || "(no name)"}
                  {isSelf && (
                    <span
                      className="bkb-chip"
                      title="This is your account"
                      style={{ fontSize: 9, borderColor: "var(--bkb-textSubtle)", color: "var(--bkb-textMuted)" }}
                    >
                      you
                    </span>
                  )}
                  {u.is_banned && (
                    <span
                      className="bkb-chip"
                      title={u.ban_reason ? `Banned: ${u.ban_reason}` : "Banned"}
                      style={{ fontSize: 9, borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" }}
                    >
                      <Icon name="lock" size={9} /> banned
                    </span>
                  )}
                </div>
                <div className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textSubtle)" }}>
                  #{u.profile_id}
                </div>
              </div>
              <div>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                {u.orcid_id && (
                  <div className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textSubtle)" }}>
                    {u.orcid_id}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {u.providers.length === 0 ? (
                  <span style={{ color: "var(--bkb-textSubtle)", fontSize: 12 }}>—</span>
                ) : (
                  u.providers.map((p) => (
                    <span key={p} className="bkb-chip" style={{ fontSize: 10 }}>
                      {p}
                    </span>
                  ))
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                {u.roles.map((r) => {
                  const locked = r === "SuperAdmin";
                  return (
                    <span
                      key={r}
                      className="bkb-chip"
                      style={{
                        fontSize: 10,
                        cursor: locked ? "not-allowed" : "pointer",
                        borderColor: "var(--bkb-primary)",
                        color: "var(--bkb-primary)",
                        opacity: locked ? 0.55 : 1,
                      }}
                      title={locked ? "The SuperAdmin role is protected and cannot be removed." : "Click to remove this role"}
                      onClick={() => {
                        if (locked) return;
                        void removeRole(u.profile_id, r);
                      }}
                    >
                      {r} {locked ? null : <Icon name="x" size={9} />}
                    </span>
                  );
                })}
                <select
                  disabled={actingOn === u.profile_id}
                  className="bkb-input"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    e.target.value = "";
                    if (v) void assignRole(u.profile_id, v);
                  }}
                  style={{ width: 110, padding: "2px 6px", fontSize: 11 }}
                >
                  <option value="">+ add role</option>
                  {roles
                    .filter((r) => !u.roles.includes(r.name))
                    .map((r) => (
                      <option key={r.id ?? r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
              <span style={{ color: "var(--bkb-textMuted)", fontSize: 12 }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
              </span>
              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                {u.is_banned ? (
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    style={{ padding: "4px 8px", borderColor: "var(--bkb-primary)", color: "var(--bkb-primary)" }}
                    disabled={actingOn === u.profile_id}
                    onClick={() => unbanUser(u.profile_id, u.email)}
                    title={u.ban_reason ? `Lift ban (was: ${u.ban_reason})` : "Lift ban"}
                  >
                    <Icon name="check" size={11} /> Unban
                  </button>
                ) : (
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    style={{ padding: "4px 8px", borderColor: "var(--bkb-publication)", color: "var(--bkb-publication)" }}
                    disabled={actingOn === u.profile_id || isSelf || isSuperAdmin}
                    onClick={() => banUser(u.profile_id, u.email, isSuperAdmin)}
                    title={
                      isSuperAdmin
                        ? "SuperAdmin accounts cannot be banned."
                        : isSelf
                          ? "You can't ban your own account."
                          : "Suspend this user — keeps their profile but blocks all authenticated requests."
                    }
                  >
                    <Icon name="lock" size={11} /> Ban
                  </button>
                )}
                <button
                  className="bkb-btn bkb-btn-ghost"
                  style={{ padding: "4px 8px", borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" }}
                  disabled={actingOn === u.profile_id || isSuperAdmin}
                  onClick={() => deleteUser(u.profile_id, u.email, isSuperAdmin)}
                  title={isSuperAdmin ? "SuperAdmin accounts cannot be deleted." : "Delete this user."}
                >
                  <Icon name="x" size={11} /> Delete
                </button>
              </div>
            </div>
            );
          })}
      </div>
    </div>
  );
}
