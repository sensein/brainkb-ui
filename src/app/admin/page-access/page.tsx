"use client";

/**
 * /admin/page-access — manage which roles + users can see each UI page.
 *
 * Wired to:
 *   GET    /api/admin/page-access
 *   PUT    /api/admin/page-access/{page_key}
 *   DELETE /api/admin/page-access/{page_key}
 *
 * The UI then calls /api/access/page/{page_key} (via usePageAccess) to gate
 * routes; this admin surface is what feeds those checks.
 */

import React from "react";
import { FONTS, Icon } from "@/src/app/components/design-system";
import {
  adminApi,
  type PageAccess,
  type AvailableRole,
} from "@/src/services/api/userManagement";
import { TOOL_REGISTRY } from "@/src/config/toolRegistry";

export default function AdminPageAccessPage() {
  const [pages, setPages] = React.useState<PageAccess[]>([]);
  const [roles, setRoles] = React.useState<AvailableRole[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Editor state
  const [editKey, setEditKey] = React.useState("");
  const [editDesc, setEditDesc] = React.useState("");
  const [editPublic, setEditPublic] = React.useState(false);
  const [editRoles, setEditRoles] = React.useState<Set<string>>(new Set());
  const [editEmails, setEditEmails] = React.useState<string>("");

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ps, rs] = await Promise.all([adminApi.listPageAccess(), adminApi.listRoles()]);
      setPages(ps);
      setRoles(rs);
    } catch (e: any) {
      setError(e?.message ?? "request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  // Hydrate editor when selection changes.
  React.useEffect(() => {
    if (!selectedKey) {
      setEditKey("");
      setEditDesc("");
      setEditPublic(false);
      setEditRoles(new Set());
      setEditEmails("");
      return;
    }
    const p = pages.find((x) => x.page_key === selectedKey);
    if (!p) return;
    setEditKey(p.page_key);
    setEditDesc(p.description ?? "");
    setEditPublic(p.is_public);
    setEditRoles(new Set(p.allowed_roles));
    setEditEmails(p.allowed_user_emails.join("\n"));
  }, [selectedKey, pages]);

  function startNew() {
    setSelectedKey(null);
    setEditKey("");
    setEditDesc("");
    setEditPublic(false);
    setEditRoles(new Set());
    setEditEmails("");
  }

  async function save() {
    if (!editKey.trim()) return;
    setSaving(true);
    try {
      const emails = editEmails
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await adminApi.upsertPageAccess(editKey.trim(), {
        page_key: editKey.trim(),
        description: editDesc.trim() || null,
        is_public: editPublic,
        allowed_roles: Array.from(editRoles),
        allowed_user_emails: emails,
      });
      setSelectedKey(editKey.trim());
      await reload();
    } catch (e: any) {
      alert(`Could not save: ${e?.message ?? "request failed"}`);
    } finally {
      setSaving(false);
    }
  }

  async function deletePage(key: string) {
    if (!confirm(`Delete page-access entry "${key}"? Routes that reference this key will fall back to "not_found".`)) return;
    try {
      await adminApi.deletePageAccess(key);
      if (selectedKey === key) setSelectedKey(null);
      await reload();
    } catch (e: any) {
      alert(`Could not delete: ${e?.message ?? "request failed"}`);
    }
  }

  function toggleRole(name: string) {
    setEditRoles((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Page-keys the UI knows about that the admin hasn't yet registered. These
  // are shown as one-click stub-create buttons so getting started doesn't
  // require typing keys by hand.
  const knownKeys = new Set(pages.map((p) => p.page_key));
  const seedables = TOOL_REGISTRY.filter((t) => !knownKeys.has(t.pageKey));

  function preFillFromTool(t: typeof TOOL_REGISTRY[number]) {
    setSelectedKey(null);
    setEditKey(t.pageKey);
    setEditDesc(t.title);
    setEditPublic(false);
    setEditRoles(new Set());
    setEditEmails("");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 32, margin: "0 0 4px", letterSpacing: "-0.02em", fontWeight: 400 }}>
            Page access
          </h1>
          <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>
            Map UI page keys (e.g. <span className="bkb-mono">admin.users</span>) to allowed roles and user overrides.
            Tools without an entry are denied by default.
          </div>
        </div>
        <button className="bkb-btn bkb-btn-primary" onClick={startNew}>
          <Icon name="plus" size={12} /> New page
        </button>
      </div>

      {!loading && seedables.length > 0 && (
        <div className="bkb-card" style={{ padding: 14, marginBottom: 16, background: "var(--bkb-surfaceAlt)" }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
            {seedables.length} workflow tool{seedables.length === 1 ? "" : "s"} aren&apos;t registered yet — they&apos;re currently denied for everyone.
          </div>
          <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 10 }}>
            Click one to pre-fill the editor, then assign roles or user emails and save.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {seedables.map((t) => (
              <button
                key={t.pageKey}
                onClick={() => preFillFromTool(t)}
                className="bkb-chip"
                style={{ cursor: "pointer", borderColor: "var(--bkb-primary)", color: "var(--bkb-primary)" }}
              >
                <Icon name="plus" size={10} /> {t.pageKey}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bkb-card" style={{ padding: 14, marginBottom: 16, borderColor: "var(--bkb-danger)", borderLeft: "3px solid var(--bkb-danger)" }}>
          <div style={{ fontSize: 12, color: "var(--bkb-danger)", fontWeight: 500 }}>{error}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* List */}
        <div className="bkb-card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--bkb-border)" }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Registered pages</div>
            <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 2 }}>
              {loading ? "Loading…" : `${pages.length} entries`}
            </div>
          </div>
          <div style={{ maxHeight: 540, overflowY: "auto" }} className="bkb-scroll">
            {pages.map((p) => {
              const active = selectedKey === p.page_key;
              return (
                <div
                  key={p.page_key}
                  onClick={() => setSelectedKey(p.page_key)}
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
                    <div className="bkb-mono" style={{ fontSize: 12, fontWeight: 500 }}>
                      {p.page_key}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.is_public ? "public" : `${p.allowed_roles.length} role(s) · ${p.allowed_user_emails.length} user(s)`}
                    </div>
                  </div>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    style={{ padding: "2px 6px", color: "var(--bkb-danger)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deletePage(p.page_key);
                    }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              );
            })}
            {!loading && pages.length === 0 && (
              <div style={{ padding: 14, fontSize: 12, color: "var(--bkb-textMuted)" }}>
                No pages registered yet.
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="bkb-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
            {selectedKey ? `Editing ${selectedKey}` : "Create a new page entry"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>Page key</label>
              <input
                className="bkb-input"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                disabled={!!selectedKey}
                placeholder="e.g. admin.users"
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>Description</label>
              <input
                className="bkb-input"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              border: "1px solid var(--bkb-border)",
              borderRadius: 6,
              marginBottom: 12,
              cursor: "pointer",
              background: editPublic ? "color-mix(in oklch, var(--bkb-accent), transparent 92%)" : "transparent",
            }}
          >
            <input type="checkbox" checked={editPublic} onChange={(e) => setEditPublic(e.target.checked)} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Public</div>
              <div style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>
                Anyone — even unauthenticated visitors — can access this page.
              </div>
            </div>
          </label>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 6 }}>Allowed roles</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {roles.map((r) => {
                const on = editRoles.has(r.name);
                return (
                  <button
                    key={r.id ?? r.name}
                    className="bkb-chip"
                    onClick={() => toggleRole(r.name)}
                    style={{
                      cursor: "pointer",
                      borderColor: on ? "var(--bkb-primary)" : "var(--bkb-border)",
                      color: on ? "var(--bkb-primary)" : "var(--bkb-textMuted)",
                      background: on ? "color-mix(in oklch, var(--bkb-primary), transparent 92%)" : "var(--bkb-surfaceAlt)",
                    }}
                  >
                    {on && <Icon name="check" size={10} />} {r.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 6 }}>
              User-email overrides (one per line, comma, or space)
            </div>
            <textarea
              className="bkb-input"
              value={editEmails}
              onChange={(e) => setEditEmails(e.target.value)}
              rows={4}
              style={{ fontFamily: FONTS.mono, resize: "vertical" }}
              placeholder="alice@example.com&#10;bob@example.com"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="bkb-btn bkb-btn-primary" onClick={save} disabled={saving || !editKey.trim()}>
              <Icon name="check" size={12} /> {saving ? "Saving…" : selectedKey ? "Save changes" : "Create page"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
