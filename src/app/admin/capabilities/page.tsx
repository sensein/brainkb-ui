"use client";

/**
 * /admin/capabilities — what people may do in the knowledge graph, beyond
 * their role: give one person, or every member of a role/group, a
 * capability such as creating team spaces or ingesting data.
 *
 * Roles themselves (including making someone an Admin) are assigned under
 * Users; per-space read/write rules live on each space under Spaces → Manage
 * access. "grant" and "sparql_admin" are admin-only and can't be delegated.
 * The query service enforces all of this; AdminShell gates the page.
 */

import React from "react";
import Link from "next/link";
import { adminApi, type AvailableRole } from "@/src/services/api/userManagement";

type Catalogue = { grantable: string[]; admin_only: string[]; descriptions: Record<string, string> };
type Grant = { capability: string; granted_by?: string | null; granted_at?: number | string | null };
type UserCaps = { member: string; roles: string[]; capabilities: string[]; grants: Grant[] };
type RoleCaps = { role: string; grants: Grant[] };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

const field: React.CSSProperties = {
  fontSize: 13, padding: "6px 8px", border: "1px solid var(--bkb-border)", borderRadius: 6,
  background: "var(--bkb-surface)", color: "inherit",
};

function GrantForm({ grantable, describe, onGrant, busy }: {
  grantable: string[];
  describe: (c: string) => string;
  onGrant: (capability: string) => void;
  busy: boolean;
}) {
  const [cap, setCap] = React.useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (cap) { onGrant(cap); setCap(""); } }}
      style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
    >
      <select value={cap} onChange={(e) => setCap(e.target.value)} aria-label="Capability to grant" style={{ ...field, flex: "1 1 280px" }}>
        <option value="">Choose a capability…</option>
        {grantable.map((c) => <option key={c} value={c}>{c} — {describe(c)}</option>)}
      </select>
      <button type="submit" className="bkb-btn bkb-btn-primary" disabled={!cap || busy} style={{ fontSize: 13 }}>Grant</button>
    </form>
  );
}

function GrantList({ grants, onRevoke, busy, empty }: {
  grants: Grant[];
  onRevoke: (capability: string) => void;
  busy: boolean;
  empty: string;
}) {
  if (!grants.length) return <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>{empty}</div>;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {grants.map((g) => (
        <div key={g.capability} className="bkb-hover-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", borderRadius: 6, fontSize: 13 }}>
          <span className="bkb-mono" style={{ flex: 1 }}>{g.capability}</span>
          {g.granted_by && <span style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>by {g.granted_by}</span>}
          <button type="button" className="bkb-btn bkb-btn-ghost" disabled={busy} onClick={() => onRevoke(g.capability)}
                  style={{ fontSize: 12, padding: "4px 10px", color: "var(--bkb-danger)" }}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}

export default function CapabilitiesPage() {
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(null);
  const [roles, setRoles] = React.useState<AvailableRole[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [user, setUser] = React.useState<UserCaps | null>(null);
  const [roleName, setRoleName] = React.useState("");
  const [role, setRole] = React.useState<RoleCaps | null>(null);

  React.useEffect(() => {
    api<Catalogue>("/api/capabilities/available").then(setCatalogue).catch((e) => setError(e.message));
    adminApi.listRoles().then(setRoles).catch(() => setRoles([]));
  }, []);
  const describe = (c: string) => catalogue?.descriptions?.[c] ?? "";

  const lookUpUser = React.useCallback(async (member: string) => {
    setError(null);
    try {
      setUser(await api<UserCaps>(`/api/capabilities/user?member=${encodeURIComponent(member)}`));
    } catch (e: any) {
      setUser(null); setError(e.message);
    }
  }, []);
  const lookUpRole = React.useCallback(async (name: string) => {
    setError(null);
    if (!name) { setRole(null); return; }
    try {
      setRole(await api<RoleCaps>(`/api/capabilities/role?role=${encodeURIComponent(name)}`));
    } catch (e: any) {
      setRole(null); setError(e.message);
    }
  }, []);

  const act = async (op: string, body: object, done: string, refresh: () => Promise<void>) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await api(`/api/capabilities/${op}`, { method: "POST", body: JSON.stringify(body) });
      setNotice(done);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 1000 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Capabilities</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--bkb-textMuted)", maxWidth: 760 }}>
          Give one person, or everyone with a role, an extra capability in the knowledge graph — for example creating
          team spaces or adding data. To make someone an admin or change their role, use{" "}
          <Link href="/admin/users">Users</Link>. To decide who can read or write a particular space, open it under{" "}
          <Link href="/user/spaces">Spaces</Link> → Manage access.
        </p>
      </div>

      {error && (
        <div role="alert" className="bkb-card" style={{ padding: "10px 14px", borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{error}</span>
          <button className="bkb-btn bkb-btn-ghost" style={{ fontSize: 12, padding: "2px 8px" }} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {notice && (
        <div role="status" className="bkb-card" style={{ padding: "10px 14px", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{notice}</span>
          <button className="bkb-btn bkb-btn-ghost" style={{ fontSize: 12, padding: "2px 8px" }} onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}

      <section className="bkb-card" style={{ padding: 18, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>A person</div>
        <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) void lookUpUser(email.trim()); }}
              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.org"
                 aria-label="Email of the person" style={{ ...field, flex: "1 1 260px" }} />
          <button type="submit" className="bkb-btn" style={{ fontSize: 13 }}>Look up</button>
        </form>
        {user && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 13 }}>
              <span className="bkb-mono">{user.member}</span> · roles:{" "}
              {user.roles.length ? user.roles.join(", ") : <span style={{ color: "var(--bkb-textMuted)" }}>none</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
              Can do now (from roles and grants): {user.capabilities.length ? user.capabilities.join(", ") : "nothing yet"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Granted directly</div>
            <GrantList
              grants={user.grants} busy={busy} empty="No direct grants."
              onRevoke={(c) => act("revoke", { member: user.member, capability: c }, `Revoked ${c} from ${user.member}.`,
                                   () => lookUpUser(user.member))}
            />
            {catalogue && (
              <GrantForm
                grantable={catalogue.grantable} describe={describe} busy={busy}
                onGrant={(c) => act("grant", { member: user.member, capability: c }, `Granted ${c} to ${user.member}.`,
                                    () => lookUpUser(user.member))}
              />
            )}
          </div>
        )}
      </section>

      <section className="bkb-card" style={{ padding: 18, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>A role or group</div>
        <select value={roleName} aria-label="Role or group"
                onChange={(e) => { setRoleName(e.target.value); void lookUpRole(e.target.value); }}
                style={{ ...field, maxWidth: 420 }}>
          <option value="">Choose a role or group…</option>
          {roles.filter((r) => r.is_active).map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
        </select>
        {role && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
              Everyone with the role <strong>{role.role}</strong> gets these, on top of what the role already allows.
            </div>
            <GrantList
              grants={role.grants} busy={busy} empty="No extra capabilities granted to this role."
              onRevoke={(c) => act("revoke-role", { role: role.role, capability: c }, `Revoked ${c} from ${role.role}.`,
                                   () => lookUpRole(role.role))}
            />
            {catalogue && (
              <GrantForm
                grantable={catalogue.grantable} describe={describe} busy={busy}
                onGrant={(c) => act("grant-role", { role: role.role, capability: c }, `Granted ${c} to everyone with ${role.role}.`,
                                    () => lookUpRole(role.role))}
              />
            )}
          </div>
        )}
      </section>

      {catalogue && (
        <section style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
          Admin-only, never delegated: {catalogue.admin_only.map((c) => `${c} (${describe(c)})`).join("; ")}.
        </section>
      )}
    </div>
  );
}
