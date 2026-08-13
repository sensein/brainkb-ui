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
import { adminApi, type AvailableRole, type SharedOpenRouterKeyAdminView } from "@/src/services/api/userManagement";
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

      {/* home-4col: 4-up on desktop → 2-up ≤900px → 1-up ≤600px */}
      <div className="home-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
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

      <SharedOpenRouterKeyCard />

      <div className="bkb-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14 }}>Signed in as</div>
        {/* home-3col: 3-up on desktop → 2-up ≤900px → 1-up ≤600px */}
        <div className="home-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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

// =============================================================================
// Shared OpenRouter API key
// =============================================================================
// Admin-only card to set / replace / clear the shared OpenRouter key. End
// users get the plaintext via /api/settings/openrouter-key/effective for use
// in browser API calls — it's never displayed to non-admins. The admin can
// reveal the plaintext on demand to copy/audit it (`reveal=true` query
// param). Stored encrypted at rest with the same Fernet key as OAuth tokens.

function SharedOpenRouterKeyCard() {
  const [view, setView] = React.useState<SharedOpenRouterKeyAdminView | null>(null);
  const [roles, setRoles] = React.useState<AvailableRole[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [draftKey, setDraftKey] = React.useState("");
  const [draftRoles, setDraftRoles] = React.useState<Set<string>>(new Set());
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [v, r] = await Promise.all([
        adminApi.getOpenRouterKey().catch(() => null),
        adminApi.listRoles().catch(() => [] as AvailableRole[]),
      ]);
      setView(v);
      setRoles(r);
      setDraftRoles(new Set(v?.allowed_role_names ?? []));
    } catch (e: any) {
      setError(e?.message ?? "request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void reload(); }, [reload]);

  async function handleReveal() {
    setBusy(true);
    setError(null);
    try {
      const v = await adminApi.getOpenRouterKey(true);
      setRevealed(v.plaintext);
    } catch (e: any) {
      setError(e?.message ?? "request failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!draftKey.trim()) {
      setError("Paste a key before saving.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.setOpenRouterKey({
        api_key: draftKey.trim(),
        allowed_role_names: draftRoles.size === 0 ? null : Array.from(draftRoles),
      });
      setNotice("Shared key saved. Users will receive it on their next page load.");
      setDraftKey("");
      setRevealed(null);
      setEditing(false);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!confirm("Clear the shared OpenRouter key? Users will fall back to their own key.")) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteOpenRouterKey();
      setNotice("Shared key cleared.");
      setRevealed(null);
      await reload();
    } catch (e: any) {
      setError(e?.message ?? "clear failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleRole(name: string) {
    setDraftRoles((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className="bkb-card" style={{ padding: 20, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Shared OpenRouter API key</div>
          <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 2 }}>
            Provided to users for SIE / Resource extraction unless they set their own. Encrypted at rest.
          </div>
        </div>
        {view?.has_key && (
          <span className="bkb-chip" style={{ borderColor: "var(--bkb-primary)", color: "var(--bkb-primary)" }}>
            <Icon name="check" size={10} /> Set · ends in {view.last_4}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>Loading…</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginBottom: 10 }}>
            {view?.has_key ? (
              <>
                Last updated{" "}
                <span style={{ color: "var(--bkb-text)" }}>
                  {view.updated_at ? new Date(view.updated_at).toLocaleString() : "—"}
                </span>
                {" "}·{" "}
                {view.allowed_role_names && view.allowed_role_names.length > 0
                  ? <>Available to roles: {view.allowed_role_names.join(", ")}</>
                  : <>Available to <strong style={{ color: "var(--bkb-text)" }}>any signed-in user</strong></>}
              </>
            ) : (
              <>No shared key set. Users must paste their own on the dashboard.</>
            )}
          </div>

          {revealed !== null && (
            <div
              style={{
                padding: 10,
                marginBottom: 10,
                borderRadius: 6,
                border: "1px solid var(--bkb-border)",
                background: "var(--bkb-surfaceAlt)",
                fontFamily: FONTS.mono,
                fontSize: 12,
                wordBreak: "break-all",
              }}
            >
              {revealed}
              <div style={{ marginTop: 6 }}>
                <button className="bkb-btn bkb-btn-ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setRevealed(null)}>
                  Hide
                </button>
              </div>
            </div>
          )}

          {!editing && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="bkb-btn bkb-btn-primary" disabled={busy} onClick={() => setEditing(true)}>
                <Icon name="key" size={11} /> {view?.has_key ? "Replace key" : "Set shared key"}
              </button>
              {view?.has_key && (
                <>
                  <button className="bkb-btn bkb-btn-ghost" disabled={busy} onClick={handleReveal}>
                    <Icon name="eye" size={11} /> Reveal current
                  </button>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    disabled={busy}
                    onClick={handleClear}
                    style={{ color: "var(--bkb-danger)", borderColor: "var(--bkb-danger)" }}
                  >
                    <Icon name="x" size={11} /> Clear
                  </button>
                </>
              )}
            </div>
          )}

          {editing && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>New API key</label>
                <input
                  className="bkb-input"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="sk-or-v1-…"
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 4 }}>
                  Roles allowed to use this key (no roles selected = any signed-in user)
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {roles.map((r) => {
                    const on = draftRoles.has(r.name);
                    return (
                      <button
                        key={r.id ?? r.name}
                        type="button"
                        onClick={() => toggleRole(r.name)}
                        className="bkb-chip"
                        style={{
                          cursor: "pointer",
                          borderColor: on ? "var(--bkb-primary)" : "var(--bkb-border)",
                          color: on ? "var(--bkb-primary)" : "var(--bkb-text)",
                          background: on ? "color-mix(in oklch, var(--bkb-primary), transparent 92%)" : "transparent",
                        }}
                      >
                        {on && <Icon name="check" size={9} />} {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="bkb-btn bkb-btn-primary" disabled={busy} onClick={handleSave}>
                  Save
                </button>
                <button
                  className="bkb-btn bkb-btn-ghost"
                  disabled={busy}
                  onClick={() => { setEditing(false); setDraftKey(""); setError(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error && <div style={{ fontSize: 12, color: "var(--bkb-danger)", marginTop: 8 }}>{error}</div>}
          {notice && <div style={{ fontSize: 12, color: "var(--bkb-primary)", marginTop: 8 }}>{notice}</div>}
        </>
      )}
    </div>
  );
}
