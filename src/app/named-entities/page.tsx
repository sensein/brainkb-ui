"use client";

/**
 * /named-entities — papers and the named entities StructSense extracted from
 * them, as a network (with a table view of the same rows). Data comes from
 * the NER graph through /api/knowledge-base, like the browse pages, so it
 * needs a signed-in session.
 *
 * Local preview without a backend: in `next dev`, /named-entities?sample=1
 * loads /dev/named-entities-sample.json instead (git-ignored, not deployed).
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../components/marketing/tokens";
import EntityNetwork from "./EntityNetwork";
import FilterMenu, { type FilterOption } from "../browse/FilterMenu";
import { NETWORK_QUERY, DETAIL_QUERY, PAPER_QUERY, TAXONOMY_QUERY, GENE_QUERY } from "./queries";
import {
  type Binding, type Entity, type GeneData, type GeneRecord, type GroupKey, type Paper, type Taxon, type Taxonomy,
  GROUPS, LEVEL_ORDER, buildGenes, buildNetwork, buildTaxonomy, colorOf, genesFor, isProvisional, taxaFor, typeLabel,
} from "./model";

const GRAPH = "https://brainkb.org/graph/named-entity-test/";
const SAMPLE_URL = "/dev/named-entities-sample.json";
const MIN_MENTION_OPTIONS = [1, 2, 3, 5, 10];

type Sample = {
  network: Binding[]; details: Record<string, Binding[]>; papers: Record<string, Binding[]>;
  taxonomy?: Binding[]; genes?: Binding[];
};

async function runQuery(slug: string, sparqlQuery: string): Promise<Binding[]> {
  const response = await fetch("/api/knowledge-base", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, sparqlQuery }),
  });
  const json = await response.json();
  if (!response.ok || json?.success === false) {
    throw new Error(json?.error || `Query failed (HTTP ${response.status})`);
  }
  return Array.isArray(json.data) ? json.data : [];
}

export default function NamedEntitiesPage() {
  return (
    <Suspense>
      <NamedEntitiesView />
    </Suspense>
  );
}

function NamedEntitiesView() {
  const searchParams = useSearchParams();
  const useSample = process.env.NODE_ENV === "development" && searchParams?.get("sample") === "1";

  const [rows, setRows] = useState<Binding[]>([]);
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"network" | "table">("network");
  const [minMentions, setMinMentions] = useState(3);
  const [sharedOnly, setSharedOnly] = useState(false);
  // Methods and the other uncoloured classes start hidden; their legend chip turns them back on.
  const [hidden, setHidden] = useState<Set<GroupKey>>(new Set(["other"]));
  // Specific ner: classes to show; empty means all (as in the browse filters).
  const [classes, setClasses] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTaxonomy, setShowTaxonomy] = useState(true);
  const [taxonomyRows, setTaxonomyRows] = useState<Binding[]>([]);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);
  const [showGenes, setShowGenes] = useState(true);
  const [geneRows, setGeneRows] = useState<Binding[]>([]);
  const [geneError, setGeneError] = useState<string | null>(null);

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
          if (!cancelled) { setSample(s); setRows(s.network); setTaxonomyRows(s.taxonomy ?? []); setGeneRows(s.genes ?? []); }
        } else {
          const data = await runQuery("named-entities-network", NETWORK_QUERY.replace(/\{\{graph\}\}/g, GRAPH));
          if (!cancelled) setRows(data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useSample]);

  // The taxonomy loads separately, so the network shows as soon as it is ready.
  useEffect(() => {
    if (useSample) return;
    let cancelled = false;
    runQuery("named-entities-taxonomy", TAXONOMY_QUERY.replace(/\{\{graph\}\}/g, GRAPH))
      .then((data) => { if (!cancelled) setTaxonomyRows(data); })
      .catch((err) => { if (!cancelled) setTaxonomyError(err instanceof Error ? err.message : "Query failed"); });
    runQuery("named-entities-genes", GENE_QUERY.replace(/\{\{graph\}\}/g, GRAPH))
      .then((data) => { if (!cancelled) setGeneRows(data); })
      .catch((err) => { if (!cancelled) setGeneError(err instanceof Error ? err.message : "Query failed"); });
    return () => { cancelled = true; };
  }, [useSample]);

  const network = useMemo(() => buildNetwork(rows), [rows]);
  const taxonomy = useMemo(() => buildTaxonomy(taxonomyRows), [taxonomyRows]);
  const geneData = useMemo(() => buildGenes(geneRows), [geneRows]);
  const groupCounts = useMemo(() => {
    const c = new Map<GroupKey, number>();
    for (const e of network.entities) c.set(e.group, (c.get(e.group) ?? 0) + 1);
    return c;
  }, [network]);
  const classOptions: FilterOption[] = useMemo(() => {
    const c = new Map<string, number>();
    for (const e of network.entities) c.set(e.type, (c.get(e.type) ?? 0) + 1);
    return [...c].sort((a, b) => b[1] - a[1]).map(([type, count]) => ({ value: type, label: typeLabel(type), count }));
  }, [network]);

  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      network.entities.filter(
        (e) =>
          !hidden.has(e.group) &&
          (classes.size === 0 || classes.has(e.type)) &&
          e.total >= minMentions &&
          (!sharedOnly || e.byPaper.size > 1) &&
          (!needle || e.label.toLowerCase().includes(needle) || e.type.toLowerCase().includes(needle)),
      ),
    [network, hidden, classes, minMentions, sharedOnly, needle],
  );
  // The selection is either an entity or a paper.
  const selected = network.entities.find((e) => e.id === selectedId) ?? null;
  const selectedPaper = network.papers.find((p) => p.id === selectedId) ?? null;
  const selectedTaxon = (selectedId && taxonomy.taxa.get(selectedId)) || null;
  // Only the part of the taxonomy reachable from the visible entities is drawn.
  const shownTaxonomy = useMemo(
    () => (showTaxonomy ? taxaFor(taxonomy, new Set(visible.map((e) => e.id))) : { taxa: [], links: [] }),
    [showTaxonomy, taxonomy, visible],
  );
  const selectedGene = (selectedId && geneData.genes.get(selectedId)) || null;
  // Gene records for the visible genes, and their curated-marker links to the taxa in view.
  // With a record shown, a marker link runs record -> taxon instead of entity -> taxon.
  const shownGenes = useMemo(() => {
    if (!showGenes) return { genes: [], links: [], markerLinks: [], taxonLinks: shownTaxonomy.links };
    const g = genesFor(geneData, new Set(visible.map((e) => e.id)));
    const inView = new Set(shownTaxonomy.taxa.map((t) => t.id));
    const markerLinks = g.genes.flatMap((r) => [...r.markerOf].filter((t) => inView.has(t)).map((t) => ({ gene: r.id, taxon: t })));
    const withRecord = new Set(g.links.map((l) => l.entity));
    const taxonLinks = shownTaxonomy.links.filter((l) => l.relation !== "marker" || !withRecord.has(l.entity));
    return { ...g, markerLinks, taxonLinks };
  }, [showGenes, geneData, visible, shownTaxonomy]);
  const paperTitle = useMemo(() => new Map(network.papers.map((p) => [p.id, p.title])), [network]);

  const toggleGroup = (key: GroupKey) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  return (
    <div
      className={`${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: COLORS.pageBg,
        color: COLORS.ink,
        fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
      }}
    >
      <MarketingHeader />

      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 28px 96px", width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <h1 style={{ margin: 0, font: "400 clamp(32px,4vw,48px)/1.05 var(--font-instrument-serif), serif", letterSpacing: "-.02em", color: COLORS.accent }}>
            Named entities
          </h1>
          <p style={{ margin: 0, maxWidth: 860, color: COLORS.body, fontSize: 16, lineHeight: 1.55 }}>
            Entities extracted from papers by StructSense. Each paper is a dark node; its entities cluster around it,
            and entities mentioned by more than one paper sit between them. Click a paper for its details, or an entity
            to see where it is mentioned.
          </p>
          <span style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.muted }}>
            {useSample ? "Local sample (snapshot) · " : ""}
            {GRAPH}
          </span>
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.body }}>
            <Loader2 size={18} className="animate-spin" /> Loading entities…
          </div>
        )}

        {!loading && error && (
          <div style={{ ...CARD_SURFACE, borderColor: "#c0643a", display: "flex", gap: 10, alignItems: "flex-start", color: "#8c3d1f", fontSize: 14, lineHeight: 1.6 }}>
            <AlertCircle size={18} style={{ flex: "none", marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Could not load named entities</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && network.entities.length === 0 && (
          <div style={{ ...CARD_SURFACE, color: COLORS.body, fontSize: 15 }}>No named entities found in this graph.</div>
        )}

        {!loading && !error && network.entities.length > 0 && (
          <>
            {/* Controls: one row above the chart. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <Segmented value={view} onChange={setView} options={[["network", "Network"], ["table", "Table"]]} />
              <FilterMenu label="Classes" options={classOptions} selected={classes} onChange={setClasses} />
              <label style={controlLabel}>
                Min. mentions
                <select value={minMentions} onChange={(e) => setMinMentions(Number(e.target.value))} style={inputStyle}>
                  {MIN_MENTION_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label style={controlLabel}>
                <input type="checkbox" checked={sharedOnly} onChange={(e) => setSharedOnly(e.target.checked)} />
                In several papers only
              </label>
              <label style={controlLabel} title={taxonomyError ?? undefined}>
                <input type="checkbox" checked={showTaxonomy} onChange={(e) => setShowTaxonomy(e.target.checked)} />
                Taxonomy{taxonomy.taxa.size > 0 ? ` (${shownTaxonomy.taxa.length})` : taxonomyError ? " (unavailable)" : ""}
              </label>
              <label style={controlLabel} title={geneError ?? undefined}>
                <input type="checkbox" checked={showGenes} onChange={(e) => setShowGenes(e.target.checked)} />
                Gene records{geneData.genes.size > 0 ? ` (${shownGenes.genes.length})` : geneError ? " (unavailable)" : ""}
              </label>
              <input
                type="search"
                placeholder="Search entities or types"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ ...inputStyle, minWidth: 220 }}
              />
              <span style={{ marginLeft: "auto", font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>
                {visible.length} of {network.entities.length} entities · {network.papers.length} papers
              </span>
            </div>

            {/* Legend doubles as the group filter. */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {GROUPS.map((g) => {
                const off = hidden.has(g.key);
                return (
                  <button
                    key={g.key}
                    onClick={() => toggleGroup(g.key)}
                    aria-pressed={!off}
                    title={g.types.length ? g.types.map(typeLabel).join(", ") : "All other types"}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
                      background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 999,
                      font: "500 13px var(--font-plex-sans)", color: off ? COLORS.muted : COLORS.ink,
                      cursor: "pointer", opacity: off ? 0.55 : 1,
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: off ? "transparent" : g.color, border: `2px solid ${g.color}` }} />
                    {g.label}
                    <span style={{ color: COLORS.muted }}>{groupCounts.get(g.key) ?? 0}</span>
                  </button>
                );
              })}
              <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 13, color: COLORS.body }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: COLORS.ink }} /> Paper
              </span>
              {showTaxonomy && taxonomy.taxa.size > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 13, color: COLORS.body }}>
                  <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden><path d="M0,-6L6,0L0,6L-6,0Z" fill={COLORS.cardBg} stroke={COLORS.ink} strokeWidth="1.5" /></svg>
                  Taxon <span style={{ color: COLORS.muted }}>(dashed: non-exact match · dotted: curated marker)</span>
                </span>
              )}
              {showGenes && geneData.genes.size > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", fontSize: 13, color: COLORS.body }}>
                  <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden><rect x="-4.5" y="-4.5" width="9" height="9" rx="1" fill={COLORS.cardBg} stroke={COLORS.ink} strokeWidth="1.3" /></svg>
                  Gene record
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selected || selectedPaper || selectedTaxon || selectedGene ? "minmax(0,1fr) 340px" : "minmax(0,1fr)", gap: 16, alignItems: "start" }}>
              <div style={{ ...CARD_SURFACE, padding: 0, overflow: "hidden" }}>
                {view === "network" ? (
                  <EntityNetwork papers={network.papers} entities={visible} taxa={shownTaxonomy.taxa}
                    taxonLinks={shownGenes.taxonLinks} genes={shownGenes.genes} geneLinks={shownGenes.links}
                    markerLinks={shownGenes.markerLinks} selectedId={selectedId} onSelect={setSelectedId} />
                ) : (
                  <EntityTable entities={visible} paperTitle={paperTitle} onSelect={setSelectedId} />
                )}
              </div>
              {selected && (
                <DetailPanel
                  entity={selected}
                  taxonomy={taxonomy}
                  geneData={geneData}
                  onSelectTaxon={setSelectedId}
                  paperTitle={paperTitle}
                  sample={sample}
                  onClose={() => setSelectedId(null)}
                />
              )}
              {selectedGene && (
                <GenePanel
                  gene={selectedGene}
                  geneData={geneData}
                  taxonomy={taxonomy}
                  entities={network.entities}
                  onSelect={setSelectedId}
                  onClose={() => setSelectedId(null)}
                />
              )}
              {selectedTaxon && (
                <TaxonPanel
                  taxon={selectedTaxon}
                  taxonomy={taxonomy}
                  entities={network.entities}
                  onSelect={setSelectedId}
                  onClose={() => setSelectedId(null)}
                />
              )}
              {selectedPaper && (
                <PaperPanel
                  paper={selectedPaper}
                  entities={network.entities}
                  sample={sample}
                  onSelectEntity={setSelectedId}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </div>
          </>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}

const controlLabel = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.body } as const;
const inputStyle = {
  background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8,
  padding: "6px 10px", fontSize: 13, color: COLORS.ink,
} as const;

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div style={{ display: "flex", border: `1px solid ${COLORS.border}`, borderRadius: 999, overflow: "hidden" }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          style={{
            padding: "6px 14px", border: "none", cursor: "pointer", font: "500 13px var(--font-plex-mono)",
            background: v === value ? COLORS.ink : COLORS.cardBg, color: v === value ? COLORS.pageBg : COLORS.body,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EntityTable({ entities, paperTitle, onSelect }: {
  entities: Entity[]; paperTitle: Map<string, string>; onSelect: (id: string) => void;
}) {
  const sorted = [...entities].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  const th = { textAlign: "left" as const, padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, font: "500 12px var(--font-plex-mono)", color: COLORS.muted, whiteSpace: "nowrap" as const };
  const td = { padding: "10px 18px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.body, verticalAlign: "top" as const, fontSize: 14 };
  return (
    <div style={{ maxHeight: 640, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, background: COLORS.cardBg }}>
          <tr>
            <th style={th}>Entity</th><th style={th}>Type</th><th style={{ ...th, textAlign: "right" }}>Mentions</th>
            <th style={th}>Papers</th><th style={th}>Concept</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={5} style={{ ...td, color: COLORS.muted }}>No entities match the filters.</td></tr>
          )}
          {sorted.map((e) => (
            <tr key={e.id}>
              <td style={td}>
                <button onClick={() => onSelect(e.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.accentPurple, fontWeight: 500, textAlign: "left" }}>
                  {e.label}
                </button>
              </td>
              <td style={td}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: colorOf(e.group), marginRight: 8 }} />
                {typeLabel(e.type)}
              </td>
              <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{e.total}</td>
              <td style={td}>{[...e.byPaper.keys()].map((p) => shortTitle(paperTitle.get(p) ?? p)).join("; ")}</td>
              <td style={{ ...td, font: "400 12px var(--font-plex-mono)" }}>
                {isProvisional(e.concept) ? <span style={{ color: COLORS.muted }}>no ontology match</span> : e.concept}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const shortTitle = (t: string) => (t.length > 48 ? `${t.slice(0, 47)}…` : t);

function DetailPanel({ entity, taxonomy, geneData, onSelectTaxon, paperTitle, sample, onClose }: {
  entity: Entity; taxonomy: Taxonomy; geneData: GeneData; onSelectTaxon: (id: string) => void;
  paperTitle: Map<string, string>; sample: Sample | null; onClose: () => void;
}) {
  const mapped = taxonomy.links.filter((l) => l.entity === entity.id && taxonomy.taxa.has(l.taxon));
  const records = geneData.links.filter((l) => l.entity === entity.id).map((l) => geneData.genes.get(l.gene)!);
  const [mentions, setMentions] = useState<Binding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMentions(null);
    setError(null);
    try {
      if (sample) {
        setMentions(sample.details[entity.id] ?? []);
      } else if (unsafeIri(entity.id)) {
        throw new Error("Unexpected entity IRI");
      } else {
        const q = DETAIL_QUERY.replace(/\{\{graph\}\}/g, GRAPH).replace(/\{\{entity\}\}/g, entity.id);
        setMentions(await runQuery(`named-entities-detail-${entity.id}`, q));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    }
  }, [entity.id, sample]);
  useEffect(() => { load(); }, [load]);

  return (
    <aside style={{ ...CARD_SURFACE, padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14, color: COLORS.body, maxHeight: 640, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ font: "400 22px/1.15 var(--font-instrument-serif), serif", color: COLORS.ink }}>{entity.label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(entity.group) }} />
            {typeLabel(entity.type)} · {entity.total} mention{entity.total === 1 ? "" : "s"}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 18, alignSelf: "flex-start" }}>×</button>
      </div>

      <div>
        <div style={panelHeading}>Concept</div>
        {isProvisional(entity.concept)
          ? <span style={{ color: COLORS.muted }}>No ontology term found (provisional BrainKB concept)</span>
          : <code style={{ font: "400 12px var(--font-plex-mono)", wordBreak: "break-all" }}>{entity.concept}</code>}
      </div>

      {records.length > 0 && (
        <div>
          <div style={panelHeading}>Gene record</div>
          {records.map((g) => (
            <div key={g.id}>
              <button onClick={() => onSelectTaxon(g.id)} style={linkButton}>{g.symbol}</button>
              <span style={{ color: COLORS.muted }}> · {g.species}{g.identifier && ` · ${g.identifier}`}</span>
            </div>
          ))}
        </div>
      )}

      {mapped.length > 0 && (
        <div>
          <div style={panelHeading}>Taxonomy</div>
          {mapped.map((l) => {
            const t = taxonomy.taxa.get(l.taxon)!;
            return (
              <div key={l.taxon}>
                <span style={{ color: COLORS.muted }}>{l.relation === "marker" ? "curated marker of" : `${l.relation} match`} → </span>
                <button onClick={() => onSelectTaxon(t.id)} style={linkButton}>{t.label}</button>
                <span style={{ color: COLORS.muted }}> · {t.level} · {t.accession}</span>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div style={panelHeading}>Papers</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          {[...entity.byPaper].map(([p, n]) => (
            <li key={p}>{paperTitle.get(p) ?? p} <span style={{ color: COLORS.muted }}>({n})</span></li>
          ))}
        </ul>
      </div>

      <div>
        <div style={panelHeading}>Mentions</div>
        {error && <div style={{ color: "#8c3d1f" }}>{error}</div>}
        {!error && !mentions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}
        {mentions && mentions.length === 0 && <div style={{ color: COLORS.muted }}>No sentences recorded.</div>}
        {mentions && mentions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mentions.map((m, i) => (
              <blockquote key={i} style={{ margin: 0, paddingLeft: 10, borderLeft: `2px solid ${COLORS.border}`, lineHeight: 1.5 }}>
                <Highlighted text={clip(m.sentence?.value ?? "")} term={m.surface?.value ?? ""} />
              </blockquote>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

const panelHeading = { font: "500 11px var(--font-plex-mono)", textTransform: "uppercase" as const, letterSpacing: ".06em", color: COLORS.muted, marginBottom: 6 };

// Some "sentences" are whole figure panels; keep the panel readable.
const clip = (s: string) => (s.length > 360 ? `${s.slice(0, 359)}…` : s);

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

// IRIs are pasted into queries between <...>; refuse anything that could break out.
const unsafeIri = (iri: string) => /[<>"{}\s]/.test(iri);

function PaperPanel({ paper, entities, sample, onSelectEntity, onClose }: {
  paper: Paper; entities: Entity[]; sample: Sample | null;
  onSelectEntity: (id: string) => void; onClose: () => void;
}) {
  const [rows, setRows] = useState<Binding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allAuthors, setAllAuthors] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    setAllAuthors(false);
    (async () => {
      try {
        if (sample) {
          if (!cancelled) setRows(sample.papers?.[paper.id] ?? []);
          return;
        }
        if (unsafeIri(paper.id)) throw new Error("Unexpected paper IRI");
        const q = PAPER_QUERY.replace(/\{\{graph\}\}/g, GRAPH).replace(/\{\{paper\}\}/g, paper.id);
        const data = await runQuery(`named-entities-paper-${paper.id}`, q);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Query failed");
      }
    })();
    return () => { cancelled = true; };
  }, [paper.id, sample]);

  const meta = useMemo(() => {
    const all = (key: string) => (rows ?? []).filter((r) => r.key?.value === key).map((r) => r.value?.value ?? "");
    const comments = all("comment");
    const ordered = comments.find((c) => c.startsWith("authors, in order:"));
    return {
      journal: all("journal")[0],
      date: all("date")[0] || all("year")[0],
      doi: all("doi")[0] || paper.doi,
      pmid: all("pmid")[0],
      pmcid: all("pmcid")[0],
      // dcterms:creator is an unordered set; the ordered list is only in a comment.
      authors: ordered
        ? ordered.replace("authors, in order:", "").split(";").map((a) => a.trim()).filter(Boolean)
        : all("author").sort(),
      authorsOrdered: !!ordered,
      sources: comments.find((c) => c.startsWith("metadata read from:"))?.replace("metadata read from:", "").trim(),
      relations: Number(all("relations")[0] ?? 0),
      causal: Number(all("causal")[0] ?? 0),
    };
  }, [rows, paper.doi]);

  // Extraction summary from the rows already loaded for the network.
  const summary = useMemo(() => {
    const mine = entities.filter((e) => e.byPaper.has(paper.id));
    const byType = new Map<string, { count: number; group: Entity["group"] }>();
    for (const e of mine) {
      const t = byType.get(e.type) ?? { count: 0, group: e.group };
      t.count += 1;
      byType.set(e.type, t);
    }
    return {
      entities: mine.length,
      mentions: mine.reduce((n, e) => n + (e.byPaper.get(paper.id) ?? 0), 0),
      shared: mine.filter((e) => e.byPaper.size > 1).length,
      types: [...byType].sort((a, b) => b[1].count - a[1].count),
      top: [...mine].sort((a, b) => (b.byPaper.get(paper.id) ?? 0) - (a.byPaper.get(paper.id) ?? 0)).slice(0, 8),
    };
  }, [entities, paper.id]);

  const maxType = summary.types[0]?.[1].count ?? 1;
  const authorsShown = allAuthors ? meta.authors : meta.authors.slice(0, 6);
  const link = { color: COLORS.accentPurple, fontWeight: 500 } as const;

  return (
    <aside style={{ ...CARD_SURFACE, padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14, color: COLORS.body, maxHeight: 640, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ ...panelHeading, marginBottom: 4 }}>Paper</div>
          <div style={{ font: "400 21px/1.2 var(--font-instrument-serif), serif", color: COLORS.ink }}>{paper.title}</div>
          {(meta.journal || meta.date) && (
            <div style={{ marginTop: 6 }}>
              {meta.journal && <em>{meta.journal}</em>}
              {meta.journal && meta.date && " · "}
              {meta.date}
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 18, alignSelf: "flex-start" }}>×</button>
      </div>

      {error && <div style={{ color: "#8c3d1f" }}>{error}</div>}
      {!error && !rows && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}

      {rows && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", font: "400 12px var(--font-plex-mono)" }}>
            {meta.doi && <a href={`https://doi.org/${meta.doi}`} target="_blank" rel="noreferrer" style={link}>DOI {meta.doi}</a>}
            {meta.pmid && <a href={`https://pubmed.ncbi.nlm.nih.gov/${meta.pmid}/`} target="_blank" rel="noreferrer" style={link}>PMID {meta.pmid}</a>}
            {meta.pmcid && <a href={`https://pmc.ncbi.nlm.nih.gov/articles/${meta.pmcid}/`} target="_blank" rel="noreferrer" style={link}>{meta.pmcid}</a>}
          </div>

          <div>
            <div style={panelHeading}>Authors {meta.authors.length > 0 && <span>({meta.authors.length})</span>}</div>
            {meta.authors.length === 0 ? (
              <span style={{ color: COLORS.muted }}>No authors recorded in this graph.</span>
            ) : (
              <>
                {authorsShown.join(", ")}
                {meta.authors.length > authorsShown.length && (
                  <>
                    {" "}
                    <button onClick={() => setAllAuthors(true)} style={{ ...link, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 14 }}>
                      and {meta.authors.length - authorsShown.length} more
                    </button>
                  </>
                )}
                {!meta.authorsOrdered && <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>Author order not recorded; shown alphabetically.</div>}
              </>
            )}
          </div>
        </>
      )}

      <div>
        <div style={panelHeading}>Extracted</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 12px" }}>
          <Stat value={summary.entities} label="entities" />
          <Stat value={summary.mentions} label="mentions" />
          <Stat value={summary.shared} label="shared with other papers" />
          {rows && <Stat value={meta.relations} label="relation statements" />}
          {rows && <Stat value={meta.causal} label="causal statements" />}
        </div>
      </div>

      <div>
        <div style={panelHeading}>Entities by class</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {summary.types.slice(0, 10).map(([type, { count, group }]) => (
            <div key={type} style={{ display: "grid", gridTemplateColumns: "118px 1fr 32px", gap: 8, alignItems: "center", fontSize: 13 }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={typeLabel(type)}>{typeLabel(type)}</span>
              <span style={{ height: 8, width: `${Math.max(4, (100 * count) / maxType)}%`, background: colorOf(group), borderRadius: "0 4px 4px 0" }} />
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{count}</span>
            </div>
          ))}
          {summary.types.length > 10 && <span style={{ color: COLORS.muted, fontSize: 12 }}>+ {summary.types.length - 10} more classes</span>}
        </div>
      </div>

      <div>
        <div style={panelHeading}>Most mentioned</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {summary.top.map((e) => (
            <button key={e.id} onClick={() => onSelectEntity(e.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", background: COLORS.pageBg, border: `1px solid ${COLORS.border}`, borderRadius: 999, cursor: "pointer", fontSize: 13, color: COLORS.ink }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(e.group) }} />
              {e.label}
              <span style={{ color: COLORS.muted }}>{e.byPaper.get(paper.id)}</span>
            </button>
          ))}
        </div>
      </div>

      {meta.sources && (
        <div style={{ color: COLORS.muted, fontSize: 12 }}>Metadata read from: {meta.sources}</div>
      )}
    </aside>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div style={{ font: "500 18px var(--font-plex-mono)", color: COLORS.ink }}>{value}</div>
      <div style={{ fontSize: 12, color: COLORS.muted }}>{label}</div>
    </div>
  );
}

const linkButton = { background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.accentPurple, fontWeight: 500, fontSize: 14, textAlign: "left" as const };

function TaxonPanel({ taxon, taxonomy, entities, onSelect, onClose }: {
  taxon: Taxon; taxonomy: Taxonomy; entities: Entity[]; onSelect: (id: string) => void; onClose: () => void;
}) {
  // Root first: Neighborhood > Class > ... > this taxon.
  const chain: Taxon[] = [];
  for (let t: Taxon | undefined = taxon; t && !chain.includes(t); t = t.parent ? taxonomy.taxa.get(t.parent) : undefined) {
    chain.unshift(t);
  }
  const children = [...taxonomy.taxa.values()].filter((t) => t.parent === taxon.id)
    .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || a.label.localeCompare(b.label));
  const byId = new Map(entities.map((e) => [e.id, e]));
  const mappedHere = taxonomy.links.filter((l) => l.taxon === taxon.id && byId.has(l.entity) && l.relation !== "marker");
  const markersHere = taxonomy.links.filter((l) => l.taxon === taxon.id && byId.has(l.entity) && l.relation === "marker");
  // Cell types mapped anywhere below this taxon.
  const below = new Set<string>();
  for (const l of taxonomy.links) {
    if (l.relation === "marker") continue;
    for (let t = taxonomy.taxa.get(l.taxon); t; t = t.parent ? taxonomy.taxa.get(t.parent) : undefined) {
      if (t.id === taxon.id) { below.add(l.entity); break; }
    }
  }

  return (
    <aside style={{ ...CARD_SURFACE, padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14, color: COLORS.body, maxHeight: 640, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ ...panelHeading, marginBottom: 4 }}>Taxon · {taxon.level}</div>
          <div style={{ font: "400 22px/1.15 var(--font-instrument-serif), serif", color: COLORS.ink }}>{taxon.label}</div>
          <div style={{ font: "400 12px var(--font-plex-mono)", marginTop: 6 }}>{taxon.accession}</div>
          {taxon.cl && <div style={{ font: "400 12px var(--font-plex-mono)" }}>{taxon.cl}</div>}
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 18, alignSelf: "flex-start" }}>×</button>
      </div>

      <div>
        <div style={panelHeading}>Hierarchy</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {chain.map((t, i) => (
            <div key={t.id} style={{ paddingLeft: i * 12 }}>
              {t.id === taxon.id
                ? <strong style={{ color: COLORS.ink }}>{t.label}</strong>
                : <button onClick={() => onSelect(t.id)} style={linkButton}>{t.label}</button>}
              <span style={{ color: COLORS.muted, fontSize: 12 }}> {t.level}</span>
            </div>
          ))}
        </div>
      </div>

      {children.length > 0 && (
        <div>
          <div style={panelHeading}>Children in view ({children.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {children.map((t) => (
              <button key={t.id} onClick={() => onSelect(t.id)}
                style={{ padding: "3px 10px", background: COLORS.pageBg, border: `1px solid ${COLORS.border}`, borderRadius: 999, cursor: "pointer", fontSize: 13, color: COLORS.ink }}>
                {t.label} <span style={{ color: COLORS.muted }}>{t.level}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {markersHere.length > 0 && (
        <div>
          <div style={panelHeading}>Curated markers mentioned in papers</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {markersHere.map((l) => byId.get(l.entity)!).map((e) => (
              <button key={e.id} onClick={() => onSelect(e.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", background: COLORS.pageBg, border: `1px dotted ${COLORS.borderStrong}`, borderRadius: 999, cursor: "pointer", fontSize: 13, color: COLORS.ink }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(e.group) }} />
                {e.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={panelHeading}>Extracted cell types</div>
        {below.size === 0 ? (
          <span style={{ color: COLORS.muted }}>None mapped here.</span>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...below].map((id) => byId.get(id)).filter((e): e is Entity => !!e).map((e) => {
              const direct = mappedHere.find((l) => l.entity === e.id);
              return (
                <button key={e.id} onClick={() => onSelect(e.id)} title={direct ? `${direct.relation} match to this taxon` : "mapped to a taxon below this one"}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", background: COLORS.pageBg, border: `1px ${direct ? "solid" : "dashed"} ${COLORS.border}`, borderRadius: 999, cursor: "pointer", fontSize: 13, color: COLORS.ink }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(e.group) }} />
                  {e.label}
                </button>
              );
            })}
          </div>
        )}
        {below.size > 0 && <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 6 }}>Solid: mapped to this taxon. Dashed: mapped to a taxon below it.</div>}
      </div>
    </aside>
  );
}

function GenePanel({ gene, geneData, taxonomy, entities, onSelect, onClose }: {
  gene: GeneRecord; geneData: GeneData; taxonomy: Taxonomy; entities: Entity[];
  onSelect: (id: string) => void; onClose: () => void;
}) {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const mentionedAs = geneData.links.filter((l) => l.gene === gene.id).map((l) => byId.get(l.entity)).filter((e): e is Entity => !!e);
  const markerOf = [...gene.markerOf].map((t) => taxonomy.taxa.get(t)).filter((t): t is Taxon => !!t);
  const ensembl = gene.identifier?.startsWith("ENS") ? `https://www.ensembl.org/id/${gene.identifier}` : undefined;
  return (
    <aside style={{ ...CARD_SURFACE, padding: 20, display: "flex", flexDirection: "column", gap: 14, fontSize: 14, color: COLORS.body, maxHeight: 640, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{ ...panelHeading, marginBottom: 4 }}>Gene record</div>
          <div style={{ font: "400 22px/1.15 var(--font-instrument-serif), serif", color: COLORS.ink }}>{gene.symbol}</div>
          {gene.description && <div style={{ marginTop: 4 }}>{gene.description}</div>}
          <div style={{ marginTop: 4 }}>
            {gene.species && <em>{gene.species}</em>}{gene.moltype && <> · {gene.moltype.replace(/_/g, " ")}</>}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.muted, fontSize: 18, alignSelf: "flex-start" }}>×</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, font: "400 12px var(--font-plex-mono)", wordBreak: "break-all" }}>
        {gene.identifier && (ensembl
          ? <a href={ensembl} target="_blank" rel="noreferrer" style={{ color: COLORS.accentPurple, fontWeight: 500 }}>{gene.identifier}</a>
          : <span>{gene.identifier}</span>)}
        <span>{gene.id.replace("urn:bkbit:", "BKBIT:")}</span>
        {gene.annotation && <span style={{ color: COLORS.muted }}>annotation {gene.annotation.replace("urn:bkbit:", "BKBIT:").slice(0, 22)}…</span>}
      </div>

      <div>
        <div style={panelHeading}>Mentioned as</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {mentionedAs.map((e) => (
            <button key={e.id} onClick={() => onSelect(e.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 10px", background: COLORS.pageBg, border: `1px solid ${COLORS.border}`, borderRadius: 999, cursor: "pointer", fontSize: 13, color: COLORS.ink }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: colorOf(e.group) }} />
              {e.label} <span style={{ color: COLORS.muted }}>{e.total}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={panelHeading}>Curated marker of</div>
        {markerOf.length === 0
          ? <span style={{ color: COLORS.muted }}>Not a curated marker of any taxon in this graph.</span>
          : markerOf.map((t) => (
            <div key={t.id}>
              <button onClick={() => onSelect(t.id)} style={linkButton}>{t.label}</button>
              <span style={{ color: COLORS.muted }}> · {t.level} · {t.accession}</span>
            </div>
          ))}
      </div>
    </aside>
  );
}
