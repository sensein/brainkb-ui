"use client";

/**
 * /admin/reserved-graphs — named graphs other users can't create.
 *
 * A reservation covers one graph IRI ("exact") or every IRI under a prefix
 * ("prefix"), optionally for one space. Only an Admin/SuperAdmin — or, when it
 * is reserved for a space, that space's managers/editors — may then register or
 * bind it. BrainKB's own metadata and provenance graphs are always reserved and
 * listed here read-only. The query service enforces all of it; AdminShell gates
 * the page to admins.
 */

import React from "react";

type Reservation = {
  id: number | null;
  iri: string;
  match_type: "exact" | "prefix";
  system: boolean;
  reason?: string | null;
  space_slug?: string | null;
  created_by?: string | null;
  created_at?: number | null;
};
type Created = Reservation & { already_bound: { graph: string; space: string }[] };
type SpaceRef = { slug: string; name: string };

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

export default function ReservedGraphsPage() {
  const [items, setItems] = React.useState<Reservation[] | null>(null);
  const [spaces, setSpaces] = React.useState<SpaceRef[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [iri, setIri] = React.useState("");
  const [matchType, setMatchType] = React.useState<"exact" | "prefix">("exact");
  const [reason, setReason] = React.useState("");
  const [spaceSlug, setSpaceSlug] = React.useState("");

  const load = React.useCallback(() => {
    api<{ reserved: Reservation[] }>("/api/reserved-graphs")
      .then((b) => setItems(b.reserved ?? []))
      .catch((e) => setError(e.message));
  }, []);
  React.useEffect(() => {
    load();
    api<{ spaces: SpaceRef[] }>("/api/spaces").then((b) => setSpaces(b.spaces ?? [])).catch(() => setSpaces([]));
  }, [load]);

  const reserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      const r = await api<Created>("/api/reserved-graphs", {
        method: "POST",
        body: JSON.stringify({ iri: iri.trim(), match_type: matchType, reason: reason.trim(), space_slug: spaceSlug }),
      });
      const bound = r.already_bound ?? [];
      setNotice(
        `Reserved ${r.iri}${r.space_slug ? ` for ${r.space_slug}` : ""}.` +
        (bound.length
          ? ` Already bound and left in place: ${bound.map((b) => `${b.graph} (${b.space})`).join(", ")}.`
          : ""),
      );
      setIri(""); setReason(""); setSpaceSlug(""); setMatchType("exact");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r: Reservation) => {
    if (r.id == null) return;
    if (!confirm(`Remove the reservation on ${r.iri}? Anyone allowed to bind graphs will then be able to use it.`)) return;
    setError(null); setNotice(null);
    try {
      await api(`/api/reserved-graphs/${r.id}`, { method: "DELETE" });
      setNotice(`Removed the reservation on ${r.iri}.`);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 1000 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Reserved graphs</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--bkb-textMuted)", maxWidth: 720 }}>
          A reserved graph can be registered or added to a space only by an admin — or, if you reserve it for a
          space, by that space&apos;s managers. Reserve one graph IRI, or a prefix to cover every graph under it.
          Graphs already in use stay where they are.
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

      <form onSubmit={reserve} className="bkb-card" style={{ padding: 18, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Reserve a graph</div>
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Graph IRI
          <input
            required value={iri} onChange={(e) => setIri(e.target.value)}
            placeholder="https://brainkb.org/graph/allen/" className="bkb-mono" style={field}
            spellCheck={false} autoComplete="off"
          />
        </label>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: "flex", gap: 14, fontSize: 13, alignItems: "center" }}>
            <legend style={{ fontSize: 13, float: "left", marginRight: 8 }}>Covers</legend>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="radio" name="match" checked={matchType === "exact"} onChange={() => setMatchType("exact")} /> this graph only
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="radio" name="match" checked={matchType === "prefix"} onChange={() => setMatchType("prefix")} /> every graph under this prefix
            </label>
          </fieldset>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Reason <span style={{ color: "var(--bkb-textMuted)", fontSize: 12 }}>shown to anyone who is refused</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Allen Institute taxonomies" style={field} />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Reserved for <span style={{ color: "var(--bkb-textMuted)", fontSize: 12 }}>optional: that space&apos;s managers may use it</span>
            <select value={spaceSlug} onChange={(e) => setSpaceSlug(e.target.value)} style={field}>
              <option value="">Admins only</option>
              {spaces.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.slug})</option>)}
            </select>
          </label>
        </div>
        <div>
          <button type="submit" className="bkb-btn bkb-btn-primary" disabled={busy || !iri.trim()} style={{ fontSize: 13 }}>
            {busy ? "Reserving…" : "Reserve"}
          </button>
        </div>
      </form>

      <section className="bkb-card" style={{ padding: 0, overflowX: "auto" }}>
        {items === null ? (
          <div style={{ padding: 18, fontSize: 13, color: "var(--bkb-textMuted)" }}>Loading reservations…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--bkb-textMuted)", borderBottom: "1px solid var(--bkb-border)" }}>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Graph IRI</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Covers</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Reserved for</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Reason</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>By</th>
                <th style={{ padding: "10px 14px" }}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={`${r.iri}-${r.match_type}`} style={{ borderBottom: "1px solid var(--bkb-border)" }}>
                  <td className="bkb-mono" style={{ padding: "10px 14px", wordBreak: "break-all" }}>{r.iri}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{r.match_type === "prefix" ? "prefix" : "this graph"}</td>
                  <td style={{ padding: "10px 14px" }}>{r.system ? "nobody (system)" : r.space_slug ?? "admins only"}</td>
                  <td style={{ padding: "10px 14px", color: "var(--bkb-textMuted)" }}>{r.reason ?? "—"}</td>
                  <td style={{ padding: "10px 14px", color: "var(--bkb-textMuted)" }}>
                    {r.system ? "built in" : r.created_by ?? "—"}
                    {r.created_at ? <div style={{ fontSize: 11 }}>{new Date(r.created_at * 1000).toLocaleDateString()}</div> : null}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    {!r.system && (
                      <button className="bkb-btn bkb-btn-ghost" type="button" onClick={() => remove(r)} style={{ fontSize: 12, padding: "4px 10px", color: "var(--bkb-danger)" }}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
