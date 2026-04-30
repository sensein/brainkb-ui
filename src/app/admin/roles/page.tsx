"use client";

/**
 * /admin/roles — manage roles and the permissions assigned to them.
 *
 * Layout: two-pane. Left lists roles with create / activate toggle.
 * Right pane lets you check permissions to bulk-assign with PUT
 * /api/admin/roles/{id}/permissions.
 *
 * Permission CRUD is handled in the third pane below the role detail.
 */

import React from "react";
import { FONTS, Icon } from "@/src/app/components/design-system";
import {
  adminApi,
  type AvailableRole,
  type Permission,
} from "@/src/services/api/userManagement";

const ROLE_CATEGORIES = ["Admin", "Content", "Quality", "Knowledge", "Community"];

export default function AdminRolesPage() {
  const [roles, setRoles] = React.useState<AvailableRole[]>([]);
  const [permissions, setPermissions] = React.useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = React.useState<number | null>(null);
  const [rolePermIds, setRolePermIds] = React.useState<Set<number>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Forms
  const [newRoleName, setNewRoleName] = React.useState("");
  const [newRoleDesc, setNewRoleDesc] = React.useState("");
  const [newRoleCat, setNewRoleCat] = React.useState<string>("");
  const [newPermName, setNewPermName] = React.useState("");
  const [newPermResource, setNewPermResource] = React.useState("");
  const [newPermAction, setNewPermAction] = React.useState("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rs, ps] = await Promise.all([adminApi.listRoles(), adminApi.listPermissions()]);
      setRoles(rs);
      setPermissions(ps);
    } catch (e: any) {
      setError(e?.message ?? "request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (selectedRoleId == null) {
      setRolePermIds(new Set());
      return;
    }
    let cancelled = false;
    adminApi
      .getRolePermissions(selectedRoleId)
      .then((perms) => {
        if (!cancelled) setRolePermIds(new Set(perms.map((p) => p.id!).filter((x) => x != null)));
      })
      .catch(() => {
        if (!cancelled) setRolePermIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoleId]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  async function createRole() {
    if (!newRoleName.trim()) return;
    try {
      await adminApi.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || null,
        category: newRoleCat || null,
        is_active: true,
      });
      setNewRoleName("");
      setNewRoleDesc("");
      setNewRoleCat("");
      await reload();
    } catch (e: any) {
      alert(`Could not create role: ${e?.message ?? "request failed"}`);
    }
  }

  async function toggleRoleActive(role: AvailableRole) {
    if (!role.id) return;
    try {
      await adminApi.updateRole(role.id, {
        name: role.name,
        description: role.description,
        category: role.category,
        is_active: !role.is_active,
      });
      await reload();
    } catch (e: any) {
      alert(`Could not update role: ${e?.message ?? "request failed"}`);
    }
  }

  async function deleteRole(role: AvailableRole) {
    if (!role.id) return;
    if (!confirm(`Delete role "${role.name}"? Users assigned this role will lose it.`)) return;
    try {
      await adminApi.deleteRole(role.id);
      if (selectedRoleId === role.id) setSelectedRoleId(null);
      await reload();
    } catch (e: any) {
      alert(`Could not delete role: ${e?.message ?? "request failed"}`);
    }
  }

  async function savePermissions() {
    if (selectedRoleId == null) return;
    setSaving(true);
    try {
      await adminApi.setRolePermissions(selectedRoleId, Array.from(rolePermIds));
    } catch (e: any) {
      alert(`Could not save: ${e?.message ?? "request failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function createPermission() {
    if (!newPermName.trim() || !newPermResource.trim() || !newPermAction.trim()) return;
    try {
      await adminApi.createPermission({
        name: newPermName.trim(),
        resource: newPermResource.trim(),
        action: newPermAction.trim(),
        description: null,
      });
      setNewPermName("");
      setNewPermResource("");
      setNewPermAction("");
      await reload();
    } catch (e: any) {
      alert(`Could not create permission: ${e?.message ?? "request failed"}`);
    }
  }

  async function deletePermission(p: Permission) {
    if (!p.id) return;
    if (!confirm(`Delete permission "${p.name}"?`)) return;
    try {
      await adminApi.deletePermission(p.id);
      await reload();
    } catch (e: any) {
      alert(`Could not delete: ${e?.message ?? "request failed"}`);
    }
  }

  function togglePerm(id: number) {
    setRolePermIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: "0 0 4px", letterSpacing: "-0.02em", fontWeight: 400 }}>
        Roles &amp; permissions
      </h1>
      <div style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginBottom: 24 }}>
        Define roles, declare permissions, and bind permissions to roles.
      </div>

      {error && (
        <div className="bkb-card" style={{ padding: 14, marginBottom: 16, borderColor: "var(--bkb-danger)", borderLeft: "3px solid var(--bkb-danger)" }}>
          <div style={{ fontSize: 12, color: "var(--bkb-danger)", fontWeight: 500 }}>{error}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* ── Roles list ─────────────────────────────────────────────── */}
        <div className="bkb-card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bkb-border)" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Roles</div>
            <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 2 }}>
              {loading ? "Loading…" : `${roles.length} defined`}
            </div>
          </div>
          <div style={{ maxHeight: 340, overflowY: "auto" }} className="bkb-scroll">
            {roles.map((r) => {
              const active = r.id === selectedRoleId;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoleId(r.id ?? null)}
                  className="bkb-hover-row"
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--bkb-border)",
                    cursor: "pointer",
                    background: active ? "var(--bkb-surfaceAlt)" : "transparent",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                      {r.name}
                      {!r.is_active && (
                        <span className="bkb-chip" style={{ fontSize: 10 }}>
                          inactive
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.category ?? "—"} · {r.description ?? "no description"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      title={r.is_active ? "Deactivate" : "Activate"}
                      className="bkb-btn bkb-btn-ghost"
                      style={{ padding: "2px 6px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleRoleActive(r);
                      }}
                    >
                      <Icon name={r.is_active ? "pause" : "play"} size={11} />
                    </button>
                    {r.name !== "Admin" && (
                      <button
                        title="Delete role"
                        className="bkb-btn bkb-btn-ghost"
                        style={{ padding: "2px 6px", color: "var(--bkb-danger)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteRole(r);
                        }}
                      >
                        <Icon name="x" size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: 14, borderTop: "1px solid var(--bkb-border)", background: "var(--bkb-surfaceAlt)" }}>
            <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginBottom: 6 }}>
              Create a role
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                className="bkb-input"
                placeholder="Name (must be a UserRoleEnum value)"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <input
                className="bkb-input"
                placeholder="Description (optional)"
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
              />
              <select
                className="bkb-input"
                value={newRoleCat}
                onChange={(e) => setNewRoleCat(e.target.value)}
              >
                <option value="">Category…</option>
                {ROLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="bkb-btn bkb-btn-primary" onClick={createRole} disabled={!newRoleName.trim()}>
                <Icon name="plus" size={12} /> Add role
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: role detail + permissions ────────────────────────── */}
        <div className="bkb-card" style={{ padding: 18 }}>
          {selectedRole ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Role
                  </div>
                  <div style={{ fontFamily: FONTS.display, fontSize: 24, letterSpacing: "-0.01em", fontWeight: 400 }}>
                    {selectedRole.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
                    {selectedRole.description ?? "No description"}
                  </div>
                </div>
                <button
                  className="bkb-btn bkb-btn-primary"
                  onClick={savePermissions}
                  disabled={saving}
                >
                  <Icon name="check" size={12} /> {saving ? "Saving…" : "Save permissions"}
                </button>
              </div>

              <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginBottom: 8 }}>
                {rolePermIds.size} of {permissions.length} permissions selected.
              </div>

              <div
                className="bkb-scroll"
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  border: "1px solid var(--bkb-border)",
                  borderRadius: 6,
                }}
              >
                {permissions.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: "var(--bkb-textMuted)" }}>
                    No permissions defined. Add one in the form below.
                  </div>
                ) : (
                  permissions.map((p) => {
                    const checked = p.id != null && rolePermIds.has(p.id);
                    return (
                      <label
                        key={p.id ?? p.name}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "20px 1fr 120px 100px",
                          gap: 8,
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--bkb-border)",
                          fontSize: 12,
                          alignItems: "center",
                          cursor: p.id ? "pointer" : "default",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={p.id == null}
                          onChange={() => p.id != null && togglePerm(p.id)}
                        />
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          {p.description && (
                            <div style={{ color: "var(--bkb-textMuted)", fontSize: 11 }}>{p.description}</div>
                          )}
                        </div>
                        <span className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>
                          {p.resource}
                        </span>
                        <span className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>
                          {p.action}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>
              Select a role on the left to manage its permissions.
            </div>
          )}
        </div>
      </div>

      {/* ── Permissions catalog ─────────────────────────────────────── */}
      <div className="bkb-card" style={{ marginTop: 20, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Permissions catalog</div>
            <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
              Permissions are atoms ({"{resource, action}"}) that get bundled into roles.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 80px", gap: 8, marginBottom: 10 }}>
          <input className="bkb-input" placeholder="Name (e.g. assertion.create)" value={newPermName} onChange={(e) => setNewPermName(e.target.value)} />
          <input className="bkb-input" placeholder="Resource (e.g. assertion)" value={newPermResource} onChange={(e) => setNewPermResource(e.target.value)} />
          <input className="bkb-input" placeholder="Action (e.g. create)" value={newPermAction} onChange={(e) => setNewPermAction(e.target.value)} />
          <button
            className="bkb-btn bkb-btn-primary"
            onClick={createPermission}
            disabled={!newPermName.trim() || !newPermResource.trim() || !newPermAction.trim()}
          >
            <Icon name="plus" size={12} /> Add
          </button>
        </div>

        <div style={{ border: "1px solid var(--bkb-border)", borderRadius: 6 }}>
          <div
            style={{
              padding: "10px 14px",
              background: "var(--bkb-surfaceAlt)",
              borderBottom: "1px solid var(--bkb-border)",
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr 60px",
              gap: 8,
              fontSize: 11,
              color: "var(--bkb-textMuted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <span>Name</span>
            <span>Resource</span>
            <span>Action</span>
            <span>Description</span>
            <span></span>
          </div>
          {permissions.map((p, i) => (
            <div
              key={p.id ?? p.name}
              style={{
                padding: "10px 14px",
                borderBottom: i < permissions.length - 1 ? "1px solid var(--bkb-border)" : "none",
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr 1fr 60px",
                gap: 8,
                fontSize: 12,
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 500 }}>{p.name}</span>
              <span className="bkb-mono">{p.resource}</span>
              <span className="bkb-mono">{p.action}</span>
              <span style={{ color: "var(--bkb-textMuted)" }}>{p.description ?? "—"}</span>
              <button
                className="bkb-btn bkb-btn-ghost"
                style={{ padding: "2px 6px", color: "var(--bkb-danger)" }}
                onClick={() => deletePermission(p)}
              >
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
          {permissions.length === 0 && (
            <div style={{ padding: 14, fontSize: 12, color: "var(--bkb-textMuted)" }}>
              No permissions yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
