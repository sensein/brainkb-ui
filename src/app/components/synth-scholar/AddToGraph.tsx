"use client";

/**
 * "Add to knowledge graph" for a review already in SynthScholar (run here or
 * imported). Lists only the spaces this user may write to — the query service's
 * own check — and pushes the review's RDF there as the user. A review goes into
 * the graph once; after that this shows where it went.
 */

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addReviewToGraph } from "@/src/services/api/synthScholar";
import type { GraphIngest } from "@/src/types/synthScholar";

type WritableSpace = { slug: string; name: string; visibility: string; parent_slug: string | null };

export function AddToGraph({ reviewId, ingests }: { reviewId: string; ingests: GraphIngest[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [spaces, setSpaces] = React.useState<WritableSpace[] | null>(null);
  const [reason, setReason] = React.useState<string | null>(null);
  const [slug, setSlug] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);

  React.useEffect(() => {
    if (!open || spaces) return;
    fetch("/api/spaces/writable")
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        setReason(d.can_ingest === false ? d.reason || "You can't ingest data yet." : null);
        setSpaces(d.spaces ?? []);
      })
      .catch((e) => { setSpaces([]); setReason(e instanceof Error ? e.message : String(e)); });
  }, [open, spaces]);

  if (ingests.length) {
    const g = ingests[0];
    return (
      <span className="bkb-btn bkb-btn-ghost" style={{ cursor: "default" }} title={g.graph_iri}>
        In the knowledge graph · {g.space_slug}
      </span>
    );
  }

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await addReviewToGraph(reviewId, slug);
      setMsg({ ok: !r.warning, text: r.warning || `Ingesting into ${r.graph_iri} (space ${r.space_slug}).` });
      qc.invalidateQueries({ queryKey: ["synth-scholar", "review", reviewId] });
      qc.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <button type="button" className="bkb-btn bkb-btn-ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Add to knowledge graph
      </button>
      {open && (
        <>
          {reason ? (
            <span style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>{reason}</span>
          ) : (
            <>
              <select
                aria-label="Space for the review's graph"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={busy || spaces === null}
                style={{ fontSize: 12, padding: "4px 6px", border: "1px solid var(--bkb-border)", borderRadius: 4, background: "var(--bkb-surface)", color: "var(--bkb-text)" }}
              >
                <option value="">{spaces === null ? "Loading spaces…" : spaces.length ? "Choose a space" : "No space you can add data to"}</option>
                {(spaces ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name} ({s.slug}) · {s.visibility}</option>
                ))}
              </select>
              <button type="button" className="bkb-btn bkb-btn-primary" onClick={submit} disabled={!slug || busy}>
                {busy ? "Adding…" : "Add"}
              </button>
            </>
          )}
        </>
      )}
      {msg && <span style={{ fontSize: 12, color: msg.ok ? "var(--bkb-success, #15803d)" : "var(--bkb-danger)" }}>{msg.text}</span>}
    </span>
  );
}
