"use client";

/**
 * /taxonomy — the newest release of the HMBA basal ganglia cell-type taxonomy.
 * Pick a taxon to see its earlier revision, the papers whose extracted
 * entities point at it (in any revision), and the epigenome portal data linked
 * to it. Data comes from the query service's stored queries (via
 * /api/stored-query), so signed-out visitors can read it when the space is public.
 * /taxonomy?taxon=<taxon IRI> opens on that taxon (links from /literature).
 *
 * Local preview without a backend: in `next dev`, /taxonomy?sample=1 loads
 * /dev/taxonomy-sample.json instead (git-ignored, not deployed).
 */

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ChevronRight, ChevronDown, FileText, Activity } from "lucide-react";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../components/marketing/tokens";
import {
  type Binding, type CellCount, type CellSummary, type Epigenome, type EpiSummary, type Marker, type PaperHit, type Revision, type Taxon, type Taxonomy, type Track, type Enhancer,
  LEVEL_ORDER, toCellSummary, toDonorCounts, toRegionCounts, buildEpigenome, buildMarkers, buildPapers, buildRevisions, buildTaxonomy, descendants, lineage, toEnhancer, toTrack,
} from "./model";

// Where the taxonomy, gene records and epigenome nodes live, and the paper extractions.
const TAX_GRAPH = "https://brainkb.org/graph/bican-basal-ganglia/";
const SAMPLE_URL = "/dev/taxonomy-sample.json";
const GRAPH_FOR_QUERIES = TAX_GRAPH;

type Sample = {
  taxa: Binding[]; revisions: Binding[]; markers: Binding[]; papers: Binding[]; epi: Binding[];
  tracks: Record<string, Binding[]>; enhancers: Record<string, Binding[]>; details: Record<string, Binding[]>;
  clusters?: Record<string, Binding[]>;
  cells?: Record<string, { summary: Binding[]; regions: Binding[]; donors: Binding[] }>;
};

// Rows of one of the query service's stored queries (core/stored_queries.py),
// run on the taxonomy graph as the caller; `capped` says the result reached the query's
// row cap. Signed-out visitors can read public spaces this way.
type Rows = Binding[] & { capped?: boolean };
async function runStored(name: string, params: Record<string, string> = {}): Promise<Rows> {
  const qs = new URLSearchParams({ graph: GRAPH_FOR_QUERIES, ...params });
  const response = await fetch(`/api/stored-query/${encodeURIComponent(name)}?${qs}`);
  // A proxy or load balancer in front of the app answers timeouts with an HTML page.
  const json = await response.json().catch(() => null);
  if (!json) throw new Error(`Query failed (HTTP ${response.status}${response.status === 504 ? ", timed out" : ""})`);
  if (!response.ok || json.error) throw new Error(json.error || `Query failed (HTTP ${response.status})`);
  const rows: Rows = Array.isArray(json.message?.results?.bindings) ? json.message.results.bindings : [];
  rows.capped = !!json.capped;
  return rows;
}


// IRIs are pasted into queries between <...>; refuse anything that could break out.
const unsafeIri = (iri: string) => /[<>"{}\s]/.test(iri);

export default function TaxonomyPage() {
  return (
    <Suspense>
      <TaxonomyView />
    </Suspense>
  );
}

function TaxonomyView() {
  const searchParams = useSearchParams();
  const useSample = process.env.NODE_ENV === "development" && searchParams?.get("sample") === "1";
  const linkedTaxon = searchParams?.get("taxon") ?? null;

  const [sample, setSample] = useState<Sample | null>(null);
  const [rows, setRows] = useState<Record<"taxa" | "revisions" | "markers" | "papers" | "markerPapers" | "epi", Binding[]>>({
    taxa: [], revisions: [], markers: [], papers: [], markerPapers: [], epi: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sideErrors, setSideErrors] = useState<string[]>([]);

  const [species, setSpecies] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [withPapers, setWithPapers] = useState(false);
  const [withEpi, setWithEpi] = useState(false);
  const [renamedOnly, setRenamedOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (useSample) {
          const res = await fetch(SAMPLE_URL);
          if (!res.ok) throw new Error(`No local sample at ${SAMPLE_URL}`);
          const s: Sample = await res.json();
          if (!cancelled) { setSample(s); setRows({ taxa: s.taxa, revisions: s.revisions, markers: s.markers, papers: s.papers, markerPapers: [], epi: s.epi }); }
          return;
        }
        const taxa = await runStored("taxonomy.taxa");
        if (cancelled) return;
        setRows((r) => ({ ...r, taxa }));
        if (taxa.capped) setSideErrors((e) => [...e, `taxa: only the first ${taxa.length} rows were loaded`]);
        // The rest fills in as it arrives; a failure there leaves the tree usable.
        const side: [keyof typeof rows, string][] = [
          ["revisions", "taxonomy.revisions"], ["markers", "taxonomy.markers"], ["papers", "taxonomy.papers"],
          ["markerPapers", "taxonomy.marker_papers"], ["epi", "taxonomy.epigenome_summaries"],
        ];
        side.forEach(([key, name]) =>
          runStored(name)
            .then((data) => {
              if (cancelled) return;
              setRows((r) => ({ ...r, [key]: data }));
              if (data.capped) setSideErrors((e) => [...e, `${key}: only the first ${data.length} rows were loaded`]);
            })
            .catch((err) => { if (!cancelled) setSideErrors((e) => [...e, `${key}: ${err instanceof Error ? err.message : "query failed"}`]); }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useSample]);

  const taxonomy = useMemo(() => buildTaxonomy(rows.taxa), [rows.taxa]);
  const revisions = useMemo(() => buildRevisions(rows.revisions), [rows.revisions]);
  const markers = useMemo(() => buildMarkers(rows.markers), [rows.markers]);
  const papers = useMemo(() => buildPapers([...rows.papers, ...rows.markerPapers]), [rows.papers, rows.markerPapers]);
  const epigenome = useMemo(() => buildEpigenome(rows.epi), [rows.epi]);

  const currentSpecies = species ?? taxonomy.species[0] ?? null;
  const renamed = (t: Taxon) => {
    const prev = revisions.get(t.id)?.[0];
    return !!prev?.label && prev.label !== t.label;
  };
  const paperCount = (id: string) => new Set((papers.get(id) ?? []).map((p) => p.paper)).size;
  const epiOf = (id: string) => (epigenome.byTaxon.get(id) ?? []).map((s) => epigenome.summaries.get(s)!);

  // Open on the linked taxon, if it is in the newest release.
  useEffect(() => {
    const t = linkedTaxon ? taxonomy.taxa.get(linkedTaxon) : undefined;
    if (t) { setSpecies(t.species); setSelectedId(t.id); }
  }, [taxonomy, linkedTaxon]);

  // Otherwise start on the first taxon that has both papers and epigenome data.
  useEffect(() => {
    if (selectedId || (linkedTaxon && taxonomy.taxa.has(linkedTaxon)) || !currentSpecies || rows.papers.length === 0 || rows.epi.length === 0) return;
    const pick = [...taxonomy.taxa.values()].filter((t) => t.species === currentSpecies)
      .sort((a, b) => paperCount(b.id) - paperCount(a.id))
      .find((t) => paperCount(t.id) > 0 && epiOf(t.id).length > 0);
    if (pick) setSelectedId(pick.id);
  }, [taxonomy, currentSpecies, rows.papers, rows.epi]); // eslint-disable-line react-hooks/exhaustive-deps

  // Taxa that pass the filters, plus their ancestors so the tree stays connected.
  const needle = search.trim().toLowerCase();
  const filtering = !!needle || withPapers || withEpi || renamedOnly;
  const shown = useMemo(() => {
    const keep = new Set<string>();
    for (const t of taxonomy.taxa.values()) {
      if (t.species !== currentSpecies) continue;
      const ok = (!needle || t.label.toLowerCase().includes(needle) || t.accession.toLowerCase().includes(needle)
                  || (revisions.get(t.id) ?? []).some((r) => r.label?.toLowerCase().includes(needle)))
        && (!withPapers || paperCount(t.id) > 0) && (!withEpi || epiOf(t.id).length > 0) && (!renamedOnly || renamed(t));
      if (ok) lineage(taxonomy, t.id).forEach((a) => keep.add(a.id));
    }
    return keep;
  }, [taxonomy, currentSpecies, needle, withPapers, withEpi, renamedOnly, revisions, papers, epigenome]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = selectedId ? taxonomy.taxa.get(selectedId) : undefined;
  const speciesTaxa = [...taxonomy.taxa.values()].filter((t) => t.species === currentSpecies);
  const version = speciesTaxa.find((t) => t.version)?.version;

  return (
    <div
      className={`${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: COLORS.pageBg, color: COLORS.ink,
               fontFamily: "var(--font-plex-sans), system-ui, sans-serif" }}
    >
      <MarketingHeader />

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "64px 16px 96px", width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0, font: "400 clamp(32px,4vw,48px)/1.05 var(--font-instrument-serif), serif", letterSpacing: "-.02em", color: COLORS.accent }}>
            Cell-type taxonomy
          </h1>
          <p style={{ margin: 0, maxWidth: 860, color: COLORS.body, fontSize: 16, lineHeight: 1.55 }}>
            The newest release of the HMBA basal ganglia taxonomy. Pick a cell type to compare it with its previous
            revision, see the papers that mention it (under any revision), and the epigenomic data linked to it.
          </p>
          <span style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.muted }}>
            {useSample ? "Local sample (new taxonomy + epigenome, not yet ingested) · " : ""}
            {TAX_GRAPH}
          </span>
        </div>

        {loading && <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.body }}><Loader2 size={18} className="animate-spin" /> Loading taxonomy…</div>}

        {!loading && error && (
          <div style={{ ...CARD_SURFACE, borderColor: "#c0643a", display: "flex", gap: 10, color: "#8c3d1f", fontSize: 14, lineHeight: 1.6 }}>
            <AlertCircle size={18} style={{ flex: "none", marginTop: 2 }} />
            <div><div style={{ fontWeight: 600 }}>Could not load the taxonomy</div><div>{error}</div></div>
          </div>
        )}

        {!loading && !error && taxonomy.taxa.size === 0 && (
          <div style={{ ...CARD_SURFACE, color: COLORS.body, fontSize: 15 }}>No cell-type taxa found in this graph.</div>
        )}

        {!loading && !error && taxonomy.taxa.size > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <Segmented value={currentSpecies ?? ""} onChange={(s) => { setSpecies(s); setSelectedId(null); }}
                options={taxonomy.species.map((s) => [s, s] as [string, string])} />
              <input type="search" placeholder="Search cell types or accessions" value={search}
                onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, minWidth: 240 }} />
              <label style={controlLabel}><input type="checkbox" checked={withPapers} onChange={(e) => setWithPapers(e.target.checked)} /> In papers</label>
              <label style={controlLabel}><input type="checkbox" checked={withEpi} onChange={(e) => setWithEpi(e.target.checked)} /> With epigenomic data</label>
              <label style={controlLabel}><input type="checkbox" checked={renamedOnly} onChange={(e) => setRenamedOnly(e.target.checked)} /> Renamed</label>
              <span style={{ marginLeft: "auto", font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>
                {speciesTaxa.length} taxa{version ? ` · release ${version}` : ""}
              </span>
            </div>
            {sideErrors.length > 0 && (
              <div style={{ fontSize: 13, color: "#8c3d1f" }}>Some details could not be loaded or may be incomplete ({sideErrors.join("; ")}).</div>
            )}

            <div className="grid gap-4 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)]" style={{ alignItems: "start" }}>
              <div style={{ ...CARD_SURFACE, padding: "10px 0", maxHeight: 760, overflow: "auto" }}>
                {(taxonomy.roots.get(currentSpecies ?? "") ?? []).filter((id) => shown.has(id)).map((id) => (
                  <TreeNode key={id} id={id} depth={0} taxonomy={taxonomy} shown={shown} forceOpen={filtering}
                    selectedId={selectedId} onSelect={setSelectedId} renamed={renamed} paperCount={paperCount}
                    epiCount={(x) => epiOf(x).reduce((n, s) => n + s.tracks, 0)} />
                ))}
                {shown.size === 0 && <div style={{ padding: "10px 18px", color: COLORS.muted, fontSize: 14 }}>No taxa match the filters.</div>}
              </div>

              {selected ? (
                <TaxonPanel key={selected.id} taxon={selected} taxonomy={taxonomy} revisions={revisions.get(selected.id) ?? []}
                  markers={markers} papers={papers} epigenome={epigenome} sample={sample} onSelect={setSelectedId} />
              ) : (
                <div style={{ ...CARD_SURFACE, color: COLORS.muted, fontSize: 15 }}>Pick a cell type on the left.</div>
              )}
            </div>
          </>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}

function TreeNode({ id, depth, taxonomy, shown, forceOpen, selectedId, onSelect, renamed, paperCount, epiCount }: {
  id: string; depth: number; taxonomy: Taxonomy; shown: Set<string>; forceOpen: boolean; selectedId: string | null;
  onSelect: (id: string) => void; renamed: (t: Taxon) => boolean; paperCount: (id: string) => number; epiCount: (id: string) => number;
}) {
  const t = taxonomy.taxa.get(id)!;
  const kids = t.children.filter((c) => shown.has(c));
  // Open down to Subclass by default; selecting a taxon opens the path to it.
  const onPath = !!selectedId && lineage(taxonomy, selectedId).some((a) => a.id === id) && selectedId !== id;
  const [open, setOpen] = useState(depth < 2);
  const isOpen = forceOpen || open || onPath;
  const active = id === selectedId;
  const nPapers = paperCount(id), nTracks = epiCount(id);
  return (
    <div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 6, padding: `5px 14px 5px ${10 + depth * 16}px`,
                 background: active ? COLORS.chipBg : "transparent", cursor: "pointer" }}
        onClick={() => onSelect(id)}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!isOpen); }}
          aria-label={isOpen ? "Collapse" : "Expand"}
          style={{ width: 16, height: 16, padding: 0, border: "none", background: "none", color: COLORS.muted, cursor: "pointer", visibility: kids.length ? "visible" : "hidden", flex: "none" }}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color ?? COLORS.borderStrong, flex: "none" }} />
        <span style={{ fontSize: 14, color: COLORS.ink, fontWeight: active ? 600 : 400, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {t.label}
        </span>
        {renamed(t) && <span title="Renamed in this release" style={chip}>renamed</span>}
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, flex: "none", font: "500 11px var(--font-plex-mono)", color: COLORS.muted }}>
          {nPapers > 0 && <span title={`${nPapers} paper${nPapers === 1 ? "" : "s"}`} style={{ display: "flex", alignItems: "center", gap: 2 }}><FileText size={12} />{nPapers}</span>}
          {nTracks > 0 && <span title={`${nTracks} epigenome tracks`} style={{ display: "flex", alignItems: "center", gap: 2 }}><Activity size={12} />{nTracks}</span>}
        </span>
      </div>
      {isOpen && kids.map((c) => (
        <TreeNode key={c} id={c} depth={depth + 1} taxonomy={taxonomy} shown={shown} forceOpen={forceOpen} selectedId={selectedId}
          onSelect={onSelect} renamed={renamed} paperCount={paperCount} epiCount={epiCount} />
      ))}
    </div>
  );
}

function TaxonPanel({ taxon, taxonomy, revisions, markers, papers, epigenome, sample, onSelect }: {
  taxon: Taxon; taxonomy: Taxonomy; revisions: Revision[]; markers: Map<string, Marker[]>; papers: Map<string, PaperHit[]>;
  epigenome: Epigenome; sample: Sample | null; onSelect: (id: string) => void;
}) {
  const chain = lineage(taxonomy, taxon.id);
  const sameAccession = [...taxonomy.taxa.values()].filter((t) => t.accession === taxon.accession && t.id !== taxon.id);
  return (
    <aside style={{ ...CARD_SURFACE, padding: 22, display: "flex", flexDirection: "column", gap: 20, fontSize: 14, color: COLORS.body, minWidth: 0 }}>
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>
          {chain.slice(0, -1).map((a) => (
            <span key={a.id}><button onClick={() => onSelect(a.id)} style={{ ...linkButton, fontSize: 13 }}>{a.label}</button> ›</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: taxon.color ?? COLORS.borderStrong, flex: "none" }} />
          <span style={{ font: "400 28px/1.1 var(--font-instrument-serif), serif", color: COLORS.ink }}>{taxon.label}</span>
        </div>
        <div style={{ marginTop: 6, font: "400 12px var(--font-plex-mono)", color: COLORS.muted, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          <span>{taxon.level}</span><span>{taxon.accession}</span><span>{taxon.species}</span>
          {taxon.version && <span>release {taxon.version}</span>}
          {taxon.clusters > 0 && <span title="Leaf clusters of the taxonomy that fall under this cell type">{taxon.clusters} cluster{taxon.clusters === 1 ? "" : "s"}</span>}
          {taxon.cl && <a href={`https://www.ebi.ac.uk/ols4/search?q=${encodeURIComponent(taxon.cl)}`} target="_blank" rel="noreferrer" style={{ color: COLORS.accentPurple }}>{taxon.cl}</a>}
        </div>
        {sameAccession.length > 0 && (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <span style={{ color: COLORS.muted }}>Same cell type in </span>
            {sameAccession.map((t, i) => (
              <span key={t.id}>{i > 0 && ", "}<button onClick={() => onSelect(t.id)} style={{ ...linkButton, fontSize: 13 }}>{t.species}</button></span>
            ))}
          </div>
        )}
      </div>

      <RevisionSection taxon={taxon} revisions={revisions} />

      <ChildrenSection taxon={taxon} taxonomy={taxonomy} sample={sample} onSelect={onSelect} />

      {(markers.get(taxon.id)?.length ?? 0) > 0 && (
        <div>
          <div style={panelHeading}>Curated markers</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {markers.get(taxon.id)!.map((m) => <GeneChip key={m.gene} m={m} />)}
          </div>
        </div>
      )}

      <PapersSection taxon={taxon} taxonomy={taxonomy} revisions={revisions} papers={papers} sample={sample} />

      <CellsSection taxon={taxon} sample={sample} />

      <EpigenomeSection taxon={taxon} epigenome={epigenome} sample={sample} />
    </aside>
  );
}

// Earlier names only; the full record of a revision is in the graph.
function RevisionSection({ taxon, revisions }: { taxon: Taxon; revisions: Revision[] }) {
  const earlier = revisions.filter((r, i) => r.label && r.label !== taxon.label && revisions.findIndex((x) => x.label === r.label) === i);
  return (
    <div style={{ fontSize: 13 }}>
      <span style={{ color: COLORS.muted }}>Previous names: </span>
      {earlier.length === 0
        ? <span style={{ color: COLORS.muted }}>–</span>
        : earlier.map((r, i) => (
            <span key={r.id}>{i > 0 && ", "}<span style={{ color: COLORS.ink }}>{r.label}</span>
              {r.version && <span style={{ color: COLORS.muted }}> (release {r.version})</span>}</span>
          ))}
    </div>
  );
}

// Named children as links; for a taxon without any, the clusters under it
// (they carry only a label, so there is nothing to open).
function ChildrenSection({ taxon, taxonomy, sample, onSelect }: {
  taxon: Taxon; taxonomy: Taxonomy; sample: Sample | null; onSelect: (id: string) => void;
}) {
  const [clusters, setClusters] = useState<string[] | null>(null);
  const leaf = taxon.children.length === 0;
  useEffect(() => {
    setClusters(null);
    if (!leaf || taxon.clusters === 0) return;
    const toLabels = (rows: Binding[]) =>
      [...new Set(rows.map((r) => r.label?.value).filter((l): l is string => !!l))]
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (sample) { setClusters(toLabels(sample.clusters?.[taxon.id] ?? [])); return; }
    let cancelled = false;
    runStored("taxonomy.clusters", { taxon: taxon.id })
      .then((r) => { if (!cancelled) setClusters(toLabels(r)); })
      .catch(() => { if (!cancelled) setClusters([]); });
    return () => { cancelled = true; };
  }, [taxon.id, taxon.clusters, leaf, sample]);

  if (!leaf) {
    // Named after the children's level: a Class lists its Subclasses, and so on.
    const levels = [...new Set(taxon.children.map((id) => taxonomy.taxa.get(id)!.level))];
    const heading = levels.map((l) => (l.endsWith("s") ? `${l}es` : `${l}s`)).join(" / ");
    return (
      <div>
        <div style={panelHeading}>{heading} ({taxon.children.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {taxon.children.map((id) => {
            const c = taxonomy.taxa.get(id)!;
            return (
              <button key={id} onClick={() => onSelect(id)}
                style={{ ...chip, cursor: "pointer", border: `1px solid ${COLORS.border}`, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color ?? COLORS.borderStrong }} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  if (taxon.clusters === 0) return null;
  return (
    <div>
      <div style={panelHeading}>Clusters ({taxon.clusters})</div>
      {clusters === null
        ? <span style={{ color: COLORS.muted, fontSize: 13 }}>Loading…</span>
        : <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {clusters.map((l) => <span key={l} style={chip}>{l}</span>)}
          </div>}
    </div>
  );
}

const HOW_LABEL: Record<string, string> = {
  exact: "exact match", narrow: "narrower match", broad: "broader match", close: "close match", related: "related", marker: "via marker gene",
};

function PapersSection({ taxon, taxonomy, revisions, papers, sample }: {
  taxon: Taxon; taxonomy: Taxonomy; revisions: Revision[]; papers: Map<string, PaperHit[]>; sample: Sample | null;
}) {
  const [withChildren, setWithChildren] = useState(false);
  const below = descendants(taxonomy, taxon.id);
  const childHits = below.flatMap((id) => papers.get(id) ?? []);
  const hits = [...(papers.get(taxon.id) ?? []), ...(withChildren ? childHits : [])];
  const childPapers = new Set(childHits.map((h) => h.paper)).size;
  const childLevels = LEVEL_ORDER.filter((l) => childHits.some((h) => taxonomy.taxa.get(h.taxon)?.level === l))
    .map((l) => `${l}${l.endsWith("s") ? "es" : "s"}`);
  const levelList = childLevels.length > 1 ? `${childLevels.slice(0, -1).join(", ")} and ${childLevels.at(-1)}` : childLevels[0] ?? "cell types below";
  const byPaper = new Map<string, PaperHit[]>();
  for (const h of hits) byPaper.set(h.paper, [...(byPaper.get(h.paper) ?? []), h]);
  const revisionName = (h: PaperHit) => {
    if (h.hit === h.taxon) return "this release";
    const r = revisions.find((x) => x.id === h.hit);
    return r ? (r.version ? `release ${r.version}` : "earlier release") : "earlier release";
  };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={panelHeading}>Papers</div>
        {childHits.length > 0 && (
          <label style={{ ...controlLabel, fontSize: 12 }}>
            <input type="checkbox" checked={withChildren} onChange={(e) => setWithChildren(e.target.checked)} />
            Also papers on its {levelList} ({childPapers} paper{childPapers === 1 ? "" : "s"})
          </label>
        )}
      </div>
      {byPaper.size === 0 && <span style={{ color: COLORS.muted }}>No extracted entity points at this cell type in any revision.</span>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[...byPaper].map(([paper, list]) => (
          <div key={paper} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ color: COLORS.ink, fontWeight: 500 }}>{list[0].title}</div>
            {list[0].doi && (
              <a href={`https://doi.org/${list[0].doi.replace(/^https?:\/\/doi.org\//, "")}`} target="_blank" rel="noreferrer"
                style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.accentPurple }}>{list[0].doi}</a>
            )}
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {list.map((h) => (
                <MentionRow key={`${h.entity} ${h.hit} ${h.how}`} hit={h} sample={sample}
                  via={`${HOW_LABEL[h.how] ?? h.how} → ${h.taxon === taxon.id ? "" : `${taxonomy.taxa.get(h.taxon)?.label ?? ""}, `}${revisionName(h)}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MentionRow({ hit, via, sample }: { hit: PaperHit; via: string; sample: Sample | null }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Binding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || rows) return;
    if (sample) { setRows(sample.details[hit.entity] ?? []); return; }
    if (unsafeIri(hit.entity)) { setError("Unexpected entity IRI"); return; }
    runStored("literature.mentions", { entity: hit.entity })
      .then(setRows).catch((err) => setError(err instanceof Error ? err.message : "Query failed"));
  }, [open, rows, hit.entity, sample]);
  const sentences = (rows ?? []).filter((r) => !r.title?.value || r.title.value === hit.title);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{ ...linkButton, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{hit.entityLabel}
      </button>
      <span style={{ fontSize: 12, color: COLORS.muted }}> · {hit.mentions} mention{hit.mentions === 1 ? "" : "s"} · {via}{hit.how === "marker" && hit.gene ? "" : ""}</span>
      {open && (
        <div style={{ margin: "4px 0 4px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {error && <span style={{ color: "#8c3d1f" }}>{error}</span>}
          {!error && !rows && <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Loader2 size={12} className="animate-spin" /> Loading…</span>}
          {rows && sentences.length === 0 && <span style={{ color: COLORS.muted }}>No sentences recorded.</span>}
          {sentences.slice(0, 3).map((r, i) => (
            <div key={i} style={{ fontSize: 13, lineHeight: 1.5, borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 8 }}>
              <Highlighted text={clip(r.sentence?.value ?? "")} term={r.surface?.value ?? ""} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// How many cells of the taxonomy's data file fall in this cell type, and how
// they split over brain regions and donors.
function CellsSection({ taxon, sample }: { taxon: Taxon; sample: Sample | null }) {
  const [data, setData] = useState<{ summary?: CellSummary; regions: CellCount[]; donors: CellCount[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setData(null); setError(null);
    const build = (summary: Binding[], regions: Binding[], donors: Binding[]) =>
      ({ summary: summary[0] ? toCellSummary(summary[0]) : undefined, regions: toRegionCounts(regions), donors: toDonorCounts(donors) });
    if (sample) {
      const c = sample.cells?.[taxon.id];
      setData(build(c?.summary ?? [], c?.regions ?? [], c?.donors ?? []));
      return;
    }
    if (unsafeIri(taxon.id)) { setError("Unexpected taxon IRI"); return; }
    let cancelled = false;
    Promise.all(["taxonomy.cells", "taxonomy.cell_regions", "taxonomy.cell_donors"].map((name) =>
      runStored(name, { taxon: taxon.id })))
      .then(([s, r, d]) => { if (!cancelled) setData(build(s, r, d)); })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [taxon.id, sample]);

  if (error) return <div><div style={panelHeading}>Cells</div><span style={{ color: "#8c3d1f", fontSize: 13 }}>{error}</span></div>;
  if (!data) return <div><div style={panelHeading}>Cells</div><span style={{ color: COLORS.muted, fontSize: 13 }}>Loading…</span></div>;
  const s = data.summary;
  if (!s) return null;
  const n = (x: number) => x.toLocaleString("en-US");
  const facts = [
    s.fraction !== undefined ? `${(s.fraction * 100).toFixed(s.fraction < 0.01 ? 2 : 1)}% of the taxonomy` : undefined,
    s.donors !== undefined ? `${n(s.donors)} donor${s.donors === 1 ? "" : "s"}` : undefined,
    s.regions !== undefined ? `${n(s.regions)} region${s.regions === 1 ? "" : "s"}` : undefined,
    s.samples !== undefined ? `${n(s.samples)} cell sample${s.samples === 1 ? "" : "s"}` : undefined,
  ].filter(Boolean);
  return (
    <div>
      <div style={panelHeading}>Cells</div>
      <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13 }}>
          <span style={{ color: COLORS.ink, fontWeight: 600 }}>{n(s.cells)} cells</span>
          {facts.length > 0 && <span style={{ color: COLORS.muted }}> · {facts.join(" · ")}</span>}
          {s.url && <> · <a href={s.url} target="_blank" rel="noreferrer" style={{ color: COLORS.accentPurple }}>taxonomy data file (.h5ad) ↗</a></>}
        </div>
        {data.regions.length > 0 && <CountBars title="By region" counts={data.regions} total={s.cells}
          note="The tissue sample has no structure in BrainKB; the region is the one named in the taxonomy data file." />}
        {data.donors.length > 0 && <CountBars title="By donor" counts={data.donors} total={s.cells} />}
      </div>
    </div>
  );
}

function CountBars({ title, counts, total, note }: { title: string; counts: CellCount[]; total: number; note?: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? counts : counts.slice(0, 8);
  const max = counts[0]?.cells || 1;
  return (
    <div>
      <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(80px, 180px) 64px", gap: "6px 12px", alignItems: "center", fontSize: 13 }}>
        {shown.map((c) => (
          <Fragment key={c.id}>
            <span style={{ minWidth: 0, lineHeight: 1.35 }}>
              <span style={{ color: COLORS.ink }}>{c.label}</span>
              {c.fallback && note && <span title={note} style={{ color: COLORS.muted }}> *</span>}
              {(c.detail || c.parent) && (
                <span style={{ display: "block", font: "400 11px var(--font-plex-mono)", color: COLORS.muted }}>
                  {[c.detail, c.parent ? `in ${c.parent}` : undefined].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
            <span style={{ height: 8, borderRadius: 4, background: COLORS.chipBg, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${Math.max(2, (c.cells / max) * 100)}%`, background: COLORS.accentPurple, borderRadius: 4 }} />
            </span>
            <span style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.body, textAlign: "right" }} title={`${((c.cells / total) * 100).toFixed(1)}%`}>
              {c.cells.toLocaleString("en-US")}
            </span>
          </Fragment>
        ))}
      </div>
      {counts.length > shown.length && (
        <button onClick={() => setAll(true)} style={{ ...linkButton, fontSize: 12, marginTop: 4 }}>Show all {counts.length}</button>
      )}
      {note && shown.some((c) => c.fallback) && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>* {note}</div>}
    </div>
  );
}

function EpigenomeSection({ taxon, epigenome, sample }: { taxon: Taxon; epigenome: Epigenome; sample: Sample | null }) {
  const ids = useMemo(
    () => [...(epigenome.byTaxon.get(taxon.id) ?? []), ...(epigenome.byAccession.get(taxon.accession) ?? [])],
    [epigenome, taxon.id, taxon.accession],
  );
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [enhancers, setEnhancers] = useState<Enhancer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (ids.length === 0) return;
    if (sample) {
      setTracks(ids.flatMap((s) => (sample.tracks[s] ?? []).map(toTrack)));
      setEnhancers(ids.flatMap((s) => (sample.enhancers[s] ?? []).map(toEnhancer)));
      return;
    }
    if (ids.some(unsafeIri)) { setError("Unexpected summary IRI"); return; }
    runStored("taxonomy.epigenome_tracks", { summaries: ids.join(" ") }).then((r) => setTracks(r.map(toTrack))).catch((e) => setError(String(e?.message ?? e)));
    runStored("taxonomy.epigenome_enhancers", { summaries: ids.join(" ") }).then((r) => setEnhancers(r.map(toEnhancer))).catch((e) => setError(String(e?.message ?? e)));
  }, [ids, sample, taxon.id]);

  if (ids.length === 0) {
    return <div><div style={panelHeading}>Epigenomic data</div><span style={{ color: COLORS.muted }}>No epigenome portal data for this cell type.</span></div>;
  }
  const summaries = ids.map((s) => epigenome.summaries.get(s)!);
  const multiSpecies = summaries.length > 1;
  const trackCount = summaries.reduce((n, s) => n + s.tracks, 0);
  const enhancerCount = summaries.reduce((n, s) => n + s.enhancers, 0);
  return (
    <div>
      <div style={panelHeading}>Epigenomic data</div>
      <div style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: COLORS.muted }}>
          {trackCount} track{trackCount === 1 ? "" : "s"}{enhancerCount ? ` and ${enhancerCount} marker enhancers` : ""} from the{" "}
          <a href="https://basalganglia.epigenomes.net" target="_blank" rel="noreferrer" style={{ color: COLORS.accentPurple, fontWeight: 500 }}>Basal Ganglia Epigenome Portal ↗</a>
        </div>
        {error && <div style={{ color: "#8c3d1f" }}>{error}</div>}
        {!error && !tracks && <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><Loader2 size={14} className="animate-spin" /> Loading tracks…</div>}
        {tracks && summaries.map((s) => (
          <MeasurementList key={s.id} summary={s} tracks={tracks.filter((t) => t.summary === s.id)} titled={multiSpecies} />
        ))}
        {enhancers && enhancers.length > 0 && <EnhancerTable enhancers={enhancers} />}
      </div>
    </div>
  );
}

// One line per measurement the portal has for this cell type, with its track
// files inline; a measurement without a file here is only on the portal.
function MeasurementList({ summary, tracks, titled }: { summary: EpiSummary; tracks: Track[]; titled: boolean }) {
  const byMeasurement = new Map<string, Track[]>(summary.measurements.map((m) => [m, []]));
  for (const t of tracks) byMeasurement.set(t.measurement, [...(byMeasurement.get(t.measurement) ?? []), t]);
  return (
    <div>
      {titled && (
        <div style={{ fontSize: 13, color: COLORS.ink, fontWeight: 500, marginBottom: 4 }}>
          {summary.species}{!summary.taxon && <span style={{ color: COLORS.muted, fontWeight: 400 }}> · matched by accession</span>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 190px) minmax(0, 1fr)", gap: "4px 12px", fontSize: 13 }}>
        {[...byMeasurement].sort((a, b) => a[0].localeCompare(b[0])).map(([m, list]) => (
          <Fragment key={m}>
            <span style={{ color: COLORS.body }}>{m}</span>
            <span>
              {list.length === 0
                ? <span style={{ color: COLORS.muted }}>on the portal</span>
                : list.sort((a, b) => a.label.localeCompare(b.label)).map((t, i) => (
                    <span key={t.id}>{i > 0 && <span style={{ color: COLORS.muted }}> · </span>}
                      {t.url ? <a href={t.url} target="_blank" rel="noreferrer" title={t.label} style={{ color: COLORS.accentPurple }}>{trackName(t)}</a> : trackName(t)}
                    </span>
                  ))}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// The link text says what differs between files: the assay and lab, not the
// cell type (it is the selected one) or the measurement (it heads the row).
const trackName = (t: Track) =>
  [t.assay, t.lab, t.format, t.match && t.match !== "exact" ? `${t.match} match` : undefined].filter(Boolean).join(", ") || t.label;

function EnhancerTable({ enhancers }: { enhancers: Enhancer[] }) {
  const [all, setAll] = useState(false);
  const sorted = [...enhancers].sort((a, b) => a.symbol.localeCompare(b.symbol) || (b.abc ?? 0) - (a.abc ?? 0));
  const shown = all ? sorted : sorted.slice(0, 12);
  const th = { textAlign: "left" as const, padding: "6px 8px", font: "500 11px var(--font-plex-mono)", color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" as const };
  const td = { padding: "5px 8px", borderBottom: `1px solid ${COLORS.border}`, fontSize: 13, verticalAlign: "top" as const };
  return (
    <div>
      <div style={{ ...panelHeading, marginBottom: 4 }}>Marker-gene enhancers (activity by contact)</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={th}>Gene</th><th style={th}>Region (hg38)</th><th style={th}>Type</th><th style={{ ...th, textAlign: "right" }}>ABC</th><th style={th}>Specific</th></tr></thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.id}>
                <td style={{ ...td, fontWeight: 500, color: COLORS.ink }}>{e.symbol}</td>
                <td style={{ ...td, font: "400 12px var(--font-plex-mono)" }}>{e.region}</td>
                <td style={td}>{e.regionType}</td>
                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.abc?.toFixed(3)}</td>
                <td style={td} title={e.sharedLabels.join("; ")}>{e.specific ? "yes" : `no · shared with ${e.shared}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 12 && (
        <button onClick={() => setAll(!all)} style={{ ...linkButton, fontSize: 13, marginTop: 6 }}>{all ? "Show fewer" : `Show all ${sorted.length}`}</button>
      )}
    </div>
  );
}

function GeneChip({ m }: { m: Marker }) {
  const ensg = m.identifier?.startsWith("ENS") ? m.identifier : undefined;
  const style = { ...chip, fontSize: 12, padding: "3px 8px", color: COLORS.ink, textDecoration: "none" };
  return ensg
    ? <a href={`https://www.ensembl.org/id/${ensg}`} target="_blank" rel="noreferrer" title={ensg} style={style}>{m.symbol}</a>
    : <span title={m.identifier} style={style}>{m.symbol}</span>;
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 999, overflow: "hidden" }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          style={{ padding: "6px 14px", border: "none", cursor: "pointer", font: "500 13px var(--font-plex-mono)",
                   background: v === value ? COLORS.ink : COLORS.cardBg, color: v === value ? COLORS.pageBg : COLORS.body }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Highlighted({ text, term }: { text: string; term: string }) {
  const i = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: COLORS.chipBg, color: COLORS.ink, padding: "0 2px", borderRadius: 3 }}>{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

const clip = (s: string) => (s.length > 360 ? `${s.slice(0, 359)}…` : s);
const panelHeading = { font: "500 11px var(--font-plex-mono)", textTransform: "uppercase" as const, letterSpacing: ".06em", color: COLORS.muted, marginBottom: 6 };
const linkButton = { background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.accentPurple, fontWeight: 500, fontSize: 14, textAlign: "left" as const };
const chip = { display: "inline-block", padding: "1px 7px", borderRadius: 999, background: COLORS.chipBg, color: COLORS.body, font: "500 11px var(--font-plex-sans)", whiteSpace: "nowrap" as const };
const controlLabel = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.body } as const;
const inputStyle = { background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: COLORS.ink } as const;
