"use client";

/**
 * /literature — papers processed by StructSense and the biological entities
 * extracted from them (cell types, genes, brain regions, species), each linked
 * to the record it maps to: a cell type to its taxon on /taxonomy, a gene to
 * Ensembl/NCBI, a region to its ontology term. Data comes from the query
 * service's stored queries (via /api/stored-query), so signed-out visitors can
 * read it when the space is public.
 *
 * Local preview without a backend: in `next dev`, /literature?sample=1 loads
 * /dev/literature-sample.json instead (git-ignored, not deployed).
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, ChevronRight, ChevronDown } from "lucide-react";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../components/marketing/tokens";
import {
  type Binding, type Entity, type GroupKey, type Link as EntityLink, type Paper, type Target,
  GROUPS, buildEntities, buildPapers, buildTargets, isMapped, typeLabel,
} from "./model";

const GRAPH = "https://brainkb.org/graph/bican-basal-ganglia/";
const SAMPLE_URL = "/dev/literature-sample.json";
const GRAPH_FOR_QUERIES = GRAPH;
const ROWS_SHOWN = 15;

type Sample = { papers: Binding[]; entities: Binding[]; targets: Binding[]; details: Record<string, Binding[]> };

// Rows of one of the query service's stored queries (core/stored_queries.py),
// run on GRAPH as the caller; `capped` says the result reached the query's
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

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function LiteraturePage() {
  return (
    <Suspense>
      <LiteratureView />
    </Suspense>
  );
}

function LiteratureView() {
  const searchParams = useSearchParams();
  const useSample = process.env.NODE_ENV === "development" && searchParams?.get("sample") === "1";

  const [sample, setSample] = useState<Sample | null>(null);
  const [rows, setRows] = useState<Record<"papers" | "entities" | "targets", Binding[]>>({ papers: [], entities: [], targets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [capped, setCapped] = useState<string[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<Set<GroupKey>>(new Set(GROUPS.map((g) => g.key)));
  const [mappedOnly, setMappedOnly] = useState(false);

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
          if (!cancelled) { setSample(s); setRows({ papers: s.papers, entities: s.entities, targets: s.targets }); }
          return;
        }
        const [papers, entities] = await Promise.all([
          runStored("literature.papers"),
          runStored("literature.entities"),
        ]);
        if (cancelled) return;
        setRows((r) => ({ ...r, papers, entities }));
        setCapped([
          ...(papers.capped ? [`papers (first ${papers.length})`] : []),
          ...(entities.capped ? [`entities (first ${entities.length} rows)`] : []),
        ]);
        // Target names fill in afterwards; without them rows still show the entity.
        runStored("literature.targets")
          .then((targets) => {
            if (cancelled) return;
            setRows((r) => ({ ...r, targets }));
            if (targets.capped) setCapped((c) => [...c, `linked records (first ${targets.length})`]);
          })
          .catch((err) => { if (!cancelled) setTargetsError(err instanceof Error ? err.message : "query failed"); });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [useSample]);

  const papers = useMemo(() => buildPapers(rows.papers), [rows.papers]);
  const entities = useMemo(() => buildEntities(rows.entities), [rows.entities]);
  const targets = useMemo(() => buildTargets(rows.targets), [rows.targets]);

  const needle = search.trim().toLowerCase();
  const targetText = (e: Entity) => e.links.map((l) => { const t = targets.get(l.target); return `${t?.label ?? ""} ${t?.previousLabel ?? ""}`; }).join(" ");
  const matches = (e: Entity) => !needle || e.label.toLowerCase().includes(needle) || targetText(e).toLowerCase().includes(needle);
  // Entities the filters keep; a paper is listed when its title or one of these matches.
  const kept = useMemo(
    () => entities.filter((e) => groups.has(e.group) && (!mappedOnly || isMapped(e, targets))),
    [entities, groups, mappedOnly, targets],
  );
  const byPaper = useMemo(() => {
    const m = new Map<string, Entity[]>();
    for (const e of kept) m.set(e.paper, [...(m.get(e.paper) ?? []), e]);
    return m;
  }, [kept]);
  const listed = papers.filter((p) => !needle || p.title.toLowerCase().includes(needle) || (byPaper.get(p.id) ?? []).some(matches));

  useEffect(() => {
    if (listed.length > 0 && (!selectedId || !listed.some((p) => p.id === selectedId))) setSelectedId(listed[0].id);
  }, [listed, selectedId]);

  const selected = papers.find((p) => p.id === selectedId);

  const toggleGroup = (g: GroupKey) => setGroups((s) => {
    const next = new Set(s);
    if (next.has(g)) next.delete(g); else next.add(g);
    return next.size === 0 ? s : next;
  });

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
            Literature
          </h1>
          <p style={{ margin: 0, maxWidth: 860, color: COLORS.body, fontSize: 16, lineHeight: 1.55 }}>
            Papers and what they mention. Cell types, genes, brain regions and species were extracted from each paper
            with StructSense and linked to the records they refer to: a cell type to its place in the taxonomy, a gene
            to its annotation, a region to its ontology term.
          </p>
          <span style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.muted }}>
            {useSample ? "Local sample · " : ""}{GRAPH}
          </span>
        </div>

        {loading && <div style={{ display: "flex", alignItems: "center", gap: 10, color: COLORS.body }}><Loader2 size={18} className="animate-spin" /> Loading papers…</div>}

        {!loading && error && (
          <div style={{ ...CARD_SURFACE, borderColor: "#c0643a", display: "flex", gap: 10, color: "#8c3d1f", fontSize: 14, lineHeight: 1.6 }}>
            <AlertCircle size={18} style={{ flex: "none", marginTop: 2 }} />
            <div><div style={{ fontWeight: 600 }}>Could not load the papers</div><div>{error}</div></div>
          </div>
        )}

        {!loading && !error && papers.length === 0 && (
          <div style={{ ...CARD_SURFACE, color: COLORS.body, fontSize: 15 }}>No papers found in this graph.</div>
        )}

        {!loading && !error && papers.length > 0 && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <input type="search" placeholder="Search entities or titles (e.g. DRD1, astrocyte)" value={search}
                onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, minWidth: 300 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {GROUPS.filter((g) => entities.some((e) => e.group === g.key)).map((g) => (
                  <button key={g.key} onClick={() => toggleGroup(g.key)} aria-pressed={groups.has(g.key)}
                    style={{ ...toggle, ...(groups.has(g.key) ? toggleOn : {}) }}>{g.label}</button>
                ))}
              </div>
              <label style={controlLabel}><input type="checkbox" checked={mappedOnly} onChange={(e) => setMappedOnly(e.target.checked)} /> Only linked</label>
              <span style={{ marginLeft: "auto", font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>
                {plural(listed.length, "paper")} · {plural(kept.filter((e) => listed.some((p) => p.id === e.paper) && matches(e)).length, "entity", "entities")}
              </span>
            </div>
            {capped.length > 0 && <div style={{ fontSize: 13, color: "#8c3d1f" }}>The list may be incomplete: only part of the {capped.join(", ")} was loaded.</div>}
            {targetsError && <div style={{ fontSize: 13, color: "#8c3d1f" }}>Linked records could not be loaded ({targetsError}).</div>}

            <div className="grid gap-4 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]" style={{ alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {listed.map((p) => (
                  <PaperCard key={p.id} paper={p} entities={byPaper.get(p.id) ?? []} selected={p.id === selectedId} onSelect={() => setSelectedId(p.id)} />
                ))}
                {listed.length === 0 && <div style={{ ...CARD_SURFACE, color: COLORS.muted, fontSize: 14 }}>No paper mentions “{search}”.</div>}
              </div>

              {selected ? (
                <PaperPanel key={selected.id} paper={selected} entities={byPaper.get(selected.id) ?? []} targets={targets}
                  matches={matches} needle={needle} sample={sample} />
              ) : (
                <div style={{ ...CARD_SURFACE, color: COLORS.muted, fontSize: 15 }}>Pick a paper on the left.</div>
              )}
            </div>
          </>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}

function PaperCard({ paper, entities, selected, onSelect }: { paper: Paper; entities: Entity[]; selected: boolean; onSelect: () => void }) {
  const counts = GROUPS.map((g) => [g.label, entities.filter((e) => e.group === g.key).length] as const).filter(([, n]) => n > 0);
  return (
    <button onClick={onSelect}
      style={{ ...CARD_SURFACE, padding: "12px 14px", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
               borderColor: selected ? COLORS.accentPurple : undefined, boxShadow: selected ? `0 0 0 1px ${COLORS.accentPurple}` : undefined }}>
      <span style={{ color: COLORS.ink, fontWeight: 500, fontSize: 14, lineHeight: 1.35 }}>{paper.title}</span>
      <span style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.muted }}>{[paper.journal, paper.year].filter(Boolean).join(" · ")}</span>
      <span style={{ fontSize: 12, color: COLORS.body }}>{counts.map(([l, n]) => `${n} ${l.toLowerCase()}`).join(" · ") || "No entities match the filters"}</span>
    </button>
  );
}

function PaperPanel({ paper, entities, targets, matches, needle, sample }: {
  paper: Paper; entities: Entity[]; targets: Map<string, Target>; matches: (e: Entity) => boolean; needle: string; sample: Sample | null;
}) {
  const shown = entities.filter(matches);
  const mentions = entities.reduce((n, e) => n + e.mentions, 0);
  return (
    <aside style={{ ...CARD_SURFACE, padding: 22, display: "flex", flexDirection: "column", gap: 20, fontSize: 14, color: COLORS.body, minWidth: 0 }}>
      <div>
        <div style={{ font: "400 26px/1.15 var(--font-instrument-serif), serif", color: COLORS.ink }}>{paper.title}</div>
        <div style={{ marginTop: 8, font: "400 12px var(--font-plex-mono)", color: COLORS.muted, display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
          {paper.journal && <span>{paper.journal}</span>}
          {paper.year && <span>{paper.year}</span>}
          {paper.doi && (
            <a href={`https://doi.org/${paper.doi.replace(/^https?:\/\/doi.org\//, "")}`} target="_blank" rel="noreferrer" style={{ color: COLORS.accentPurple }}>
              doi:{paper.doi} ↗
            </a>
          )}
          <span>{plural(entities.length, "entity", "entities")} · {plural(mentions, "mention")}</span>
        </div>
      </div>
      {needle && shown.length < entities.length && (
        <div style={{ fontSize: 13, color: COLORS.muted }}>Showing {shown.length} of {entities.length} entities matching “{needle}”.</div>
      )}
      {GROUPS.map((g) => {
        const list = shown.filter((e) => e.group === g.key).sort((a, b) => b.mentions - a.mentions || a.label.localeCompare(b.label));
        return list.length > 0 && <EntityGroup key={g.key} label={g.label} entities={list} targets={targets} needle={needle} sample={sample} />;
      })}
      {shown.length === 0 && <span style={{ color: COLORS.muted }}>No entities match the filters.</span>}
    </aside>
  );
}

function EntityGroup({ label, entities, targets, needle, sample }: {
  label: string; entities: Entity[]; targets: Map<string, Target>; needle: string; sample: Sample | null;
}) {
  const [all, setAll] = useState(false);
  const rows = all || needle ? entities : entities.slice(0, ROWS_SHOWN);
  return (
    <div>
      <div style={panelHeading}>{label} ({entities.length})</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((e) => <EntityRow key={e.id} entity={e} targets={targets} needle={needle} sample={sample} />)}
      </div>
      {rows.length < entities.length && (
        <button onClick={() => setAll(true)} style={{ ...linkButton, fontSize: 13, marginTop: 6 }}>Show all {entities.length}</button>
      )}
    </div>
  );
}

const HOW_LABEL: Record<string, string> = { exact: "exact", close: "close", broad: "broader", narrow: "narrower", related: "related" };

function EntityRow({ entity, targets, needle, sample }: { entity: Entity; targets: Map<string, Target>; needle: string; sample: Sample | null }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Binding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || rows) return;
    if (sample) { setRows(sample.details[entity.id] ?? []); return; }
    if (unsafeIri(entity.id)) { setError("Unexpected entity IRI"); return; }
    runStored("literature.mentions", { entity: entity.id })
      .then(setRows).catch((e) => setError(String(e?.message ?? e)));
  }, [open, rows, entity.id, sample]);

  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "6px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 220px) 52px minmax(0, 1fr)", gap: 10, alignItems: "baseline" }}>
        <button onClick={() => setOpen(!open)} title={typeLabel(entity.type)}
          style={{ ...linkButton, color: COLORS.ink, fontWeight: 500, display: "inline-flex", alignItems: "baseline", gap: 4, minWidth: 0 }}>
          {open ? <ChevronDown size={13} style={{ flex: "none" }} /> : <ChevronRight size={13} style={{ flex: "none" }} />}
          <span style={{ overflowWrap: "anywhere" }}><Highlighted text={entity.label} term={needle} /></span>
        </button>
        <span style={{ font: "400 12px var(--font-plex-mono)", color: COLORS.muted, textAlign: "right" }}>{entity.mentions}×</span>
        <span style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          {entity.links.length === 0 && <span style={{ color: COLORS.muted }}>not linked</span>}
          {entity.links.map((l) => <TargetLink key={l.target} link={l} target={targets.get(l.target)} needle={needle} />)}
        </span>
      </div>
      {open && (
        <div style={{ margin: "6px 0 4px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
          {error && <span style={{ color: "#8c3d1f", fontSize: 13 }}>{error}</span>}
          {!error && !rows && <span style={{ color: COLORS.muted, fontSize: 13, display: "inline-flex", gap: 6, alignItems: "center" }}><Loader2 size={13} className="animate-spin" /> Loading sentences…</span>}
          {rows && rows.length === 0 && <span style={{ color: COLORS.muted, fontSize: 13 }}>No sentences recorded.</span>}
          {rows?.map((r, i) => (
            <div key={i} style={{ fontSize: 13, lineHeight: 1.5, color: COLORS.body, borderLeft: `2px solid ${COLORS.border}`, paddingLeft: 10 }}>
              <Highlighted text={clip(r.sentence?.value ?? "")} term={r.surface?.value ?? ""} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TargetLink({ link, target, needle }: { link: EntityLink; target?: Target; needle: string }) {
  const how = HOW_LABEL[link.how] ?? link.how;
  if (!target) return <span style={{ color: COLORS.muted }}>{how} → …</span>;
  const name = <Highlighted text={target.label} term={needle} />;
  const style = { color: COLORS.accentPurple, fontWeight: 500 };
  return (
    <span style={{ overflowWrap: "anywhere" }}>
      <span style={{ color: COLORS.muted }}>{how} → </span>
      {!target.href ? <span style={{ color: COLORS.muted }}>{name}</span>
        : target.href.startsWith("/") ? <Link href={target.href} style={style}>{name}</Link>
        : <a href={target.href} target="_blank" rel="noreferrer" style={style}>{name} ↗</a>}
      {target.previousLabel && <span style={{ color: COLORS.muted }}> (in the paper’s release: <Highlighted text={target.previousLabel} term={needle} />)</span>}
      {target.detail && <span style={{ color: COLORS.muted, font: "400 11px var(--font-plex-mono)" }}> {target.detail}</span>}
    </span>
  );
}

const clip = (s: string) => (s.length > 360 ? `${s.slice(0, 359)}…` : s);

function Highlighted({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (!t) return <>{text}</>;
  const i = text.toLowerCase().indexOf(t.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark style={{ background: "#f6e7b0", color: "inherit", borderRadius: 2 }}>{text.slice(i, i + t.length)}</mark>{text.slice(i + t.length)}</>;
}

const panelHeading = { font: "500 11px var(--font-plex-mono)", textTransform: "uppercase" as const, letterSpacing: ".06em", color: COLORS.muted, marginBottom: 6 };
const linkButton = { background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.accentPurple, fontWeight: 500, fontSize: 14, textAlign: "left" as const };
const controlLabel = { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.body } as const;
const inputStyle = { background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 13, color: COLORS.ink } as const;
const toggle = {
  padding: "5px 11px", borderRadius: 999, border: `1px solid ${COLORS.borderStrong}`, background: "transparent",
  color: COLORS.body, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
} as const;
const toggleOn = { background: COLORS.ink, borderColor: COLORS.ink, color: COLORS.pageBg } as const;
