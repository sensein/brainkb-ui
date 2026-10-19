"use client";

/**
 * /user/spaces — the spaces you can see, and the controls your role allows.
 *
 * Everyone sees their own spaces plus every public one. The owner of a space,
 * and admins, can switch it between private and public and share it with
 * people (viewer, editor, owner) — sharing is how a team gets access. Anyone
 * may create an individual space; team spaces need the create_team_space
 * capability (Admin/SuperAdmin by default). Only a SuperAdmin can delete a
 * space, after typing its slug. The query service enforces all of this; the UI
 * only hides controls a caller couldn't use.
 */

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/src/hooks/useCurrentUser";

type Space = {
  slug: string;
  name: string;
  description?: string | null;
  visibility: "public" | "private";
  space_type: "individual" | "team";
  your_role: "owner" | "editor" | "viewer" | null;
  is_owner: boolean;
};

type Manifest = { members: { member: string; role: string }[]; graphs: string[] };

const ROLES = ["viewer", "editor", "owner"] as const;
const ROLE_HELP: Record<string, string> = {
  viewer: "can read",
  editor: "can read and ingest",
  owner: "full control",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

function Chip({ children, tone }: { children: React.ReactNode; tone?: "accent" | "muted" }) {
  return (
    <span
      className="bkb-chip"
      style={{
        fontSize: 11,
        color: tone === "accent" ? "var(--bkb-accent)" : "var(--bkb-textMuted)",
        borderColor: tone === "accent" ? "var(--bkb-accent)" : "var(--bkb-border)",
      }}
    >
      {children}
    </span>
  );
}

function Members({ slug, onError }: { slug: string; onError: (m: string) => void }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Manifest>(`/api/spaces/${encodeURIComponent(slug)}`)
      .then(setManifest)
      .catch((e) => onError(e.message));
  }, [slug, onError]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      load();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!manifest) return <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>Loading people…</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 6 }}>
        {manifest.members.map((m) => (
          <div key={m.member} className="bkb-hover-row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 6 }}>
            <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{m.member}</span>
            <select
              className="bkb-input"
              value={m.role}
              disabled={busy}
              aria-label={`Role for ${m.member}`}
              onChange={(e) =>
                run(() => api(`/api/spaces/${encodeURIComponent(slug)}/members`, {
                  method: "POST",
                  body: JSON.stringify({ member: m.member, role: e.target.value }),
                }))
              }
              style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              className="bkb-btn bkb-btn-ghost"
              disabled={busy}
              style={{ fontSize: 12, padding: "4px 10px" }}
              onClick={() => {
                if (confirm(`Remove ${m.member} from this space?`)) {
                  run(() => api(`/api/spaces/${encodeURIComponent(slug)}/members/${encodeURIComponent(m.member)}`, { method: "DELETE" }));
                }
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <form
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        onSubmit={(e) => {
          e.preventDefault();
          const member = email.trim();
          if (!member) return;
          run(async () => {
            await api(`/api/spaces/${encodeURIComponent(slug)}/members`, {
              method: "POST",
              body: JSON.stringify({ member, role }),
            });
            setEmail("");
          });
        }}
      >
        <input
          className="bkb-input"
          type="email"
          required
          placeholder="name@example.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email of the person to add"
          style={{ flex: "1 1 220px" }}
        />
        <select className="bkb-input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" style={{ width: "auto" }}>
          {ROLES.map((r) => <option key={r} value={r}>{r} · {ROLE_HELP[r]}</option>)}
        </select>
        <button className="bkb-btn bkb-btn-primary" type="submit" disabled={busy}>Add person</button>
      </form>
      {manifest.graphs.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
          Graphs: {manifest.graphs.map((g) => <code key={g} className="bkb-mono" style={{ marginRight: 8 }}>{g}</code>)}
        </div>
      )}
    </div>
  );
}

type Deleted = { slug: string; dropped_graphs: string[]; dropped_delta_graphs: string[]; members_removed: number };

/** SuperAdmin only. Typing the slug is the confirmation the API also requires. */
function DeleteSpace({ space, onDeleted, onError, onCancel }: {
  space: Space;
  onDeleted: (d: Deleted) => void;
  onError: (m: string) => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const matches = typed === space.slug;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matches) return;
    setBusy(true);
    try {
      const d = await api<Deleted>(
        `/api/spaces/${encodeURIComponent(space.slug)}?confirm=${encodeURIComponent(typed)}`,
        { method: "DELETE" },
      );
      onDeleted(d);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10, borderTop: "1px solid var(--bkb-border)", paddingTop: 12 }}>
      <div style={{ fontSize: 13, color: "var(--bkb-danger)", fontWeight: 600 }}>Delete this space permanently</div>
      <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>
        This drops every graph in the space and the ingestion history copies of its data, and removes its members,
        access rules and search entries. It cannot be undone. The deletion itself is kept in the provenance record.
      </div>
      <label style={{ fontSize: 13, display: "grid", gap: 6 }}>
        <span>Type <span className="bkb-mono">{space.slug}</span> to confirm</span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label={`Type ${space.slug} to confirm deletion`}
          className="bkb-mono"
          style={{ fontSize: 13, padding: "6px 8px", border: "1px solid var(--bkb-border)", borderRadius: 6, maxWidth: 420 }}
        />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={!matches || busy}
          className="bkb-btn"
          style={{
            fontSize: 12, padding: "5px 12px",
            color: matches ? "#fff" : "var(--bkb-danger)",
            background: matches ? "var(--bkb-danger)" : "transparent",
            borderColor: "var(--bkb-danger)",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Deleting…" : "Delete space"}
        </button>
        <button type="button" className="bkb-btn bkb-btn-ghost" onClick={onCancel} style={{ fontSize: 12, padding: "5px 12px" }}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function SpaceRow({ space, canManage, canDelete, onChanged, onDeleted, onError }: {
  space: Space;
  canManage: boolean;
  canDelete: boolean;
  onChanged: () => void;
  onDeleted: (d: Deleted) => void;
  onError: (m: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const setVisibility = async (visibility: Space["visibility"]) => {
    if (visibility === space.visibility) return;
    if (visibility === "public" && !confirm(`Make "${space.name}" public? Anyone, including people who aren't signed in, will be able to read it.`)) return;
    setBusy(true);
    try {
      await api(`/api/spaces/${encodeURIComponent(space.slug)}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ visibility }),
      });
      onChanged();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bkb-card" style={{ padding: 18, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{space.name}</span>
            <Chip tone={space.visibility === "public" ? "accent" : undefined}>{space.visibility}</Chip>
            <Chip>{space.space_type === "team" ? "team" : "individual"}</Chip>
            {space.your_role && <Chip>you: {space.your_role}</Chip>}
          </div>
          <div className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 4 }}>{space.slug}</div>
          {space.description && <div style={{ fontSize: 13, color: "var(--bkb-textMuted)", marginTop: 6 }}>{space.description}</div>}
        </div>

        {canManage ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div role="group" aria-label={`Visibility of ${space.name}`} style={{ display: "inline-flex", border: "1px solid var(--bkb-border)", borderRadius: 8, padding: 2 }}>
              {(["private", "public"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={busy}
                  aria-pressed={space.visibility === v}
                  onClick={() => setVisibility(v)}
                  className={space.visibility === v ? "bkb-btn bkb-btn-primary" : "bkb-btn bkb-btn-ghost"}
                  style={{ fontSize: 12, padding: "4px 12px", textTransform: "capitalize" }}
                >
                  {v}
                </button>
              ))}
            </div>
            <button className="bkb-btn" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ fontSize: 12, padding: "5px 12px" }}>
              {open ? "Close" : "Manage access"}
            </button>
            {canDelete && !deleting && (
              <button
                type="button"
                className="bkb-btn bkb-btn-ghost"
                onClick={() => setDeleting(true)}
                style={{ fontSize: 12, padding: "5px 12px", color: "var(--bkb-danger)" }}
              >
                Delete
              </button>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--bkb-textMuted)", alignSelf: "center" }}>
            {space.your_role ? "Only the owner or an admin can change access" : "Public · read only"}
          </span>
        )}
      </div>
      {canManage && open && <Members slug={space.slug} onError={onError} />}
      {canDelete && deleting && (
        <DeleteSpace space={space} onDeleted={onDeleted} onError={onError} onCancel={() => setDeleting(false)} />
      )}
    </div>
  );
}

function CreateSpace({ canCreateTeam, onCreated, onError }: {
  canCreateTeam: boolean;
  onCreated: () => void;
  onError: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Space["visibility"]>("private");
  const [type, setType] = useState<Space["space_type"]>("individual");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/spaces", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug, description: description.trim() || null, visibility, space_type: type }),
      });
      setName(""); setSlug(""); setSlugEdited(false); setDescription(""); setVisibility("private"); setType("individual");
      onCreated();
    } catch (e: any) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bkb-card" style={{ padding: 18, display: "grid", gap: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600 }}>New space</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 10 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--bkb-textMuted)" }}>
          Name
          <input className="bkb-input" required value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
        </label>
        <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--bkb-textMuted)" }}>
          Slug (used in links and graph names)
          <input
            className="bkb-input bkb-mono"
            required
            pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
            title="3–64 characters: lowercase letters, digits and hyphens"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }}
          />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4, fontSize: 12, color: "var(--bkb-textMuted)" }}>
        Description (optional)
        <input className="bkb-input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 14, alignItems: "center" }}>
          <legend style={{ fontSize: 12, color: "var(--bkb-textMuted)", float: "left", marginRight: 10 }}>Visibility</legend>
          {(["private", "public"] as const).map((v) => (
            <label key={v} style={{ display: "flex", gap: 6, alignItems: "center", textTransform: "capitalize" }}>
              <input type="radio" name="visibility" checked={visibility === v} onChange={() => setVisibility(v)} /> {v}
            </label>
          ))}
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 14, alignItems: "center" }}>
          <legend style={{ fontSize: 12, color: "var(--bkb-textMuted)", float: "left", marginRight: 10 }}>Type</legend>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="radio" name="type" checked={type === "individual"} onChange={() => setType("individual")} /> Individual
          </label>
          {canCreateTeam && (
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="radio" name="type" checked={type === "team"} onChange={() => setType("team")} /> Team
            </label>
          )}
        </fieldset>
      </div>
      <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
        {visibility === "public"
          ? "Public: anyone can read it, even without signing in. Only members can add data."
          : "Private: only the people you add can read it."}
        {!canCreateTeam && " Team spaces are created by an admin; ask one to set one up or to share a space with you."}
      </div>
      <div>
        <button className="bkb-btn bkb-btn-primary" type="submit" disabled={busy || !name.trim() || !slug}>
          {busy ? "Creating…" : "Create space"}
        </button>
      </div>
    </form>
  );
}

export default function SpacesPage() {
  const { user, isAdmin, isSuperAdmin, loading: userLoading } = useCurrentUser();
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    api<{ spaces: Space[] }>("/api/spaces")
      .then((b) => setSpaces(b.spaces ?? []))
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const showError = useCallback((m: string) => setError(m), []);
  const onDeleted = useCallback((d: Deleted) => {
    const n = d.dropped_graphs.length;
    setNotice(`Deleted space "${d.slug}": ${n} graph${n === 1 ? "" : "s"}` +
      (d.dropped_delta_graphs.length ? ` and ${d.dropped_delta_graphs.length} ingestion history cop${d.dropped_delta_graphs.length === 1 ? "y" : "ies"}` : "") +
      ` removed, ${d.members_removed} member${d.members_removed === 1 ? "" : "s"} unshared.`);
    load();
  }, [load]);
  const canManage = (s: Space) => isAdmin || s.is_owner || s.your_role === "owner";
  const mine = (spaces ?? []).filter((s) => s.your_role);
  const others = (spaces ?? []).filter((s) => !s.your_role);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "8px clamp(16px, 3vw, 32px) 64px", display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Spaces</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--bkb-textMuted)", maxWidth: 680 }}>
            A space holds one or more graphs and decides who can read them. Make a space public so anyone can read it,
            or keep it private and add the people who should have access.
            {isAdmin && " As an admin you can change any space you can see here."}
          </p>
        </div>
        <button className="bkb-btn bkb-btn-primary" type="button" onClick={() => setCreating((c) => !c)} aria-expanded={creating}>
          {creating ? "Cancel" : "New space"}
        </button>
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

      {creating && (
        <CreateSpace
          canCreateTeam={isAdmin}
          onError={showError}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}

      {spaces === null || userLoading ? (
        <div style={{ fontSize: 13, color: "var(--bkb-textMuted)" }}>Loading spaces…</div>
      ) : (
        <>
          <section style={{ display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--bkb-textMuted)" }}>
              Your spaces {user?.email && <span style={{ fontWeight: 400 }}>· {user.email}</span>}
            </h2>
            {mine.length ? (
              mine.map((s) => <SpaceRow key={s.slug} space={s} canManage={canManage(s)} canDelete={isSuperAdmin} onChanged={load} onDeleted={onDeleted} onError={showError} />)
            ) : (
              <div className="bkb-card" style={{ padding: 18, fontSize: 13, color: "var(--bkb-textMuted)" }}>
                You aren&apos;t a member of any space yet. Create one, or ask a space owner to add you.
              </div>
            )}
          </section>
          {others.length > 0 && (
            <section style={{ display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--bkb-textMuted)" }}>Public spaces</h2>
              {others.map((s) => <SpaceRow key={s.slug} space={s} canManage={canManage(s)} canDelete={isSuperAdmin} onChanged={load} onDeleted={onDeleted} onError={showError} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
