"use client";

/**
 * /browse/<page>/<id> — detail view for a single entity.
 *
 * Deliberately schema-agnostic: one query fetches every triple the entity
 * takes part in, in both directions, and the page sorts them rather than
 * following a per-class field list, so a class needs no configuration to get
 * a working detail page.
 *
 * Sections: Overview (the entity's plain values), Connections (anything
 * pointing at another entity, in either direction, with incoming references
 * phrased from this record's side, e.g. "Tissue sample derived from this
 * Donor"), Source & history (provenance-style values such as dates and
 * versions), and a collapsed Technical details view with the raw triples.
 *
 * Note that "points at another entity" is not the same as "is an IRI":
 * the BICAN data links by typed literal
 * (`prov:wasDerivedFrom "BC-…"^^prov:Entity`) holding the target's local id,
 * which refTarget() resolves against the current entity's namespace. Which
 * datatypes count is configured, so IRI-linked data works too.
 *
 * Config lives in src/config/yaml/class-browser.yaml (`detailQueryTemplate`,
 * plus an optional per-class `description`).
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import MarketingHeader from "../../../components/marketing/MarketingHeader";
import MarketingFooter from "../../../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../../../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../../../components/marketing/tokens";
import ModelFigure, { type ModelEdge } from "../../ModelFigure";
import browserConfig from "@/src/config/yaml/class-browser.yaml";
import "../../browse.css";

type ClassEntry = { name: string; category: string; description?: string };
type ModelSource = { name?: string; url?: string; classUrlTemplate?: string } | null;
type PageConfig = {
  slug: string;
  title: string;
  classes: ClassEntry[];
  graph?: string;
  detailQueryTemplate?: string;
  model?: ModelSource;
};
type Term = { value?: string; type?: string; datatype?: string };
type Row = { direction?: Term; predicate?: Term; other?: Term; otherCategory?: Term; otherLabel?: Term };

const CONFIG = browserConfig as {
  defaults: {
    graph: string;
    detailQueryTemplate: string;
    entityRefDatatypes?: string[];
    model?: ModelSource;
  };
  pages: PageConfig[];
};

const ENTITY_REF_DATATYPES = CONFIG.defaults.entityRefDatatypes ?? [];

// Where a term points, or null if it is a plain value. A term is a reference
// either because it is an IRI, or because it is a literal carrying one of the
// configured reference datatypes — the BICAN data uses the latter, storing the
// target's local id, which we resolve against the current entity's namespace.
function refTarget(term: Term | undefined, currentId: string): string | null {
  if (!term?.value) return null;
  if (term.type === "uri") return term.value;
  if (term.datatype && ENTITY_REF_DATATYPES.includes(term.datatype)) {
    const base = currentId.slice(0, currentId.lastIndexOf("/") + 1);
    return base ? `${base}${term.value}` : null;
  }
  return null;
}

// Show the last path segment of a predicate IRI — the full IRI is noise in a
// label, but keep it as the title attribute so it stays inspectable.
function shortLabel(iri: string): string {
  const tail = iri.split(/[#/]/).filter(Boolean).pop();
  return tail || iri;
}

// Readable form of a predicate or class local name: "was_derived_from" and
// "wasDerivedFrom" both become "was derived from", "TissueSample" becomes
// "Tissue sample".
function words(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .toLowerCase();
}
function sentence(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
// Well-known predicates get a plain name; anything else is its local name in
// words. Keyed by local name so it works across namespaces.
const PREDICATE_LABELS: Record<string, string> = {
  label: "Name",
  category: "Type",
  type: "RDF type",
  full_name: "Full name",
  identifier: "Identifier",
  url: "Website",
};
function predicateLabel(iri: string): string {
  const local = shortLabel(iri);
  return PREDICATE_LABELS[local] ?? sentence(words(local));
}
function className(name?: string): string | undefined {
  return name ? sentence(words(name)) : undefined;
}
// Incoming reference, phrased from this record's side: other --p--> this.
// "wasDerivedFrom" reads "Tissue sample derived from this Donor"; a noun
// predicate such as "provider" reads "Resource with this Organization as
// provider", a verb such as "annotates" reads "… that annotates this …". A leading was/is is dropped so the phrase reads as a relative
// clause.
function inverseLabel(predicateIri: string, otherClass: string | undefined, thisClass: string | undefined): string {
  const phrase = words(shortLabel(predicateIri));
  const subject = otherClass ?? "Records";
  const object = `this ${thisClass ?? "record"}`;
  const verbal = /^(was|is|has|had)\b/.test(phrase) || /\b(by|from|of|on|to|in|with|for|at)$/.test(phrase);
  if (verbal) return `${subject} ${phrase.replace(/^(was|is)\s+/, "")} ${object}`;
  // A single present-tense verb ("annotates"): "Dissection roi polygon that
  // annotates this Brain slab".
  if (/^[a-z]+[^s]s$/.test(phrase)) return `${subject} that ${phrase} ${object}`;
  return `${subject} with ${object} as ${phrase}`;
}

// Provenance-style values, grouped under "Source & history" rather than
// Overview. Matched on the predicate's local name, case-insensitively.
const HISTORY_PREDICATE =
  /^(generated_?at_?time|invalidated_?at_?time|was_?generated_?by|was_?attributed_?to|was_?revision_?of|was_?informed_?by|was_?quoted_?from|had_?primary_?source|created|modified|issued|date.*|.*_date|version|version_?info|source|provenance|license|citation|creator|contributor|publisher)$/i;

// Labels for identifiers whose meaning is fixed and well known, shown next to
// the raw id. Only NCBI Taxonomy ids for the species BICAN data covers;
// anything not listed here is shown as-is rather than guessed.
const KNOWN_IDS: Record<string, string> = {
  "NCBITaxon:9606": "Homo sapiens (human)",
  "NCBITaxon:10090": "Mus musculus (house mouse)",
  "NCBITaxon:10116": "Rattus norvegicus (Norway rat)",
  "NCBITaxon:9544": "Macaca mulatta (rhesus macaque)",
  "NCBITaxon:9541": "Macaca fascicularis (crab-eating macaque)",
  "NCBITaxon:9483": "Callithrix jacchus (common marmoset)",
};
function knownLabel(value: string): string | undefined {
  // Accept the CURIE and the OBO PURL form of the same id.
  const m = value.match(/NCBITaxon[:_](\d+)$/);
  return m ? KNOWN_IDS[`NCBITaxon:${m[1]}`] : undefined;
}

type Group = { key: string; label: string; title: string; rows: Row[] };

// Rows sharing a label become one field with several values, in first-seen
// order.
function groupRows(rows: Row[], labelFor: (row: Row) => string): Group[] {
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const label = labelFor(row);
    const predicate = row.predicate?.value ?? "";
    const existing = groups.get(label);
    if (existing) existing.rows.push(row);
    else groups.set(label, { key: `${label}|${predicate}`, label, title: predicate, rows: [row] });
  }
  return [...groups.values()];
}

export default function EntityDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const rawId = typeof params?.id === "string" ? params.id : "";
  const page = CONFIG.pages.find((p) => p.slug === slug);

  if (!page) notFound();

  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense>
      <DetailView page={page} id={decodeURIComponent(rawId)} />
    </Suspense>
  );
}

function DetailView({ page, id }: { page: PageConfig; id: string }) {
  // `from` is the list page's query (class and filters), passed along links
  // between records so the back link returns to the list as it was left.
  const from = useSearchParams()?.get("from") ?? "";
  const linkSuffix = from ? `?from=${encodeURIComponent(from)}` : "";
  const graph = page.graph ?? CONFIG.defaults.graph;
  const template = page.detailQueryTemplate ?? CONFIG.defaults.detailQueryTemplate;
  // Merge the page's model over the defaults, so a page can set just a name
  // and url and still inherit classUrlTemplate. `model: null` opts out
  // entirely (the diagnostic page is not a view onto a model).
  const model =
    page.model === undefined
      ? CONFIG.defaults.model
      : page.model === null
        ? null
        : { ...CONFIG.defaults.model, ...page.model };
  const classTemplate = model?.classUrlTemplate;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const localId = id.split("/").filter(Boolean).pop() || id;
      const base = id.slice(0, id.lastIndexOf("/") + 1);
      const sparqlQuery = template
        .replace(/\{\{graph\}\}/g, graph)
        .replace(/\{\{localId\}\}/g, localId)
        .replace(/\{\{base\}\}/g, base)
        .replace(/\{\{id\}\}/g, id);
      const response = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: `detail-${page.slug}-${id}`, sparqlQuery }),
      });
      const json = await response.json();
      if (!response.ok || json?.success === false) {
        throw new Error(json?.error || `Query failed (HTTP ${response.status})`);
      }
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [graph, template, id, page.slug]);

  useEffect(() => {
    load();
  }, [load]);

  // "class" rows are not content: they carry each neighbour's category so the
  // figure can name what this record is actually connected to.
  const neighbourCategory = new Map<string, string>();
  const neighbourLabel = new Map<string, string>();
  for (const row of rows) {
    if (row.direction?.value === "class" && row.other?.value && row.otherCategory?.value) {
      neighbourCategory.set(row.other.value, row.otherCategory.value);
    }
    if (row.direction?.value === "label" && row.other?.value && row.otherLabel?.value) {
      neighbourLabel.set(row.other.value, row.otherLabel.value);
    }
  }

  const outgoing = rows.filter((r) => r.direction?.value === "out");
  const attributes = outgoing.filter((r) => refTarget(r.other, id) === null);
  const connections = outgoing.filter((r) => refTarget(r.other, id) !== null);
  const incoming = rows.filter((r) => r.direction?.value === "in");

  // The category attribute tells us which of the page's classes this is, so
  // the configured description can be shown without a second query.
  const category = attributes.find((r) => r.predicate?.value?.endsWith("/category"))?.other?.value;
  const entityClass = page.classes.find((c) => c.category === category);
  const label = attributes.find((r) => r.predicate?.value?.endsWith("#label"))?.other?.value;

  // The figure is built from this record's own connections, not from the
  // model: the schema says TissueSample.was_derived_from points at a Donor,
  // but in the data it points at a DissectionRoiPolygon, and the figure
  // should show what is actually there. Nodes are the neighbours' classes,
  // taken from ?otherCategory. The model's own view lives on the class list
  // page instead.
  const classNameFor = (category?: string) =>
    page.classes.find((c) => c.category === category)?.name;
  const modelEdges: ModelEdge[] = [];
  const seenEdges = new Set<string>();
  for (const row of [...connections, ...incoming]) {
    const isIn = row.direction?.value === "in";
    const neighbourIri = isIn
      ? row.other?.type === "uri"
        ? row.other.value
        : refTarget(row.other, id)
      : refTarget(row.other, id);
    const neighbour = classNameFor(
      neighbourIri ? neighbourCategory.get(neighbourIri) : undefined,
    );
    const label = row.predicate?.value ? shortLabel(row.predicate.value) : "";
    if (!neighbour || !label || !entityClass) continue;
    const edge = isIn
      ? { from: neighbour, to: entityClass.name, label }
      : { from: entityClass.name, to: neighbour, label };
    const key = `${edge.from}|${edge.label}|${edge.to}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    modelEdges.push(edge);
  }
  const hasModelEdges = !!entityClass && modelEdges.length > 0;

  // Where a row's other end points, in either direction (null for a value).
  const targetOf = (row: Row): string | null =>
    row.direction?.value === "in"
      ? row.other?.type === "uri"
        ? row.other.value ?? null
        : refTarget(row.other, id)
      : refTarget(row.other, id);

  const thisClass = className(entityClass?.name);
  const overview = groupRows(
    attributes.filter((r) => !HISTORY_PREDICATE.test(shortLabel(r.predicate?.value ?? ""))),
    (r) => predicateLabel(r.predicate?.value ?? ""),
  );
  const history = groupRows(
    attributes.filter((r) => HISTORY_PREDICATE.test(shortLabel(r.predicate?.value ?? ""))),
    (r) => predicateLabel(r.predicate?.value ?? ""),
  );
  const connectionGroups = [
    ...groupRows(connections, (r) => predicateLabel(r.predicate?.value ?? "")),
    ...groupRows(incoming, (r) => {
      const target = targetOf(r);
      const other = classNameFor(target ? neighbourCategory.get(target) : undefined);
      return inverseLabel(r.predicate?.value ?? "", className(other), thisClass);
    }),
  ];
  const rawRows = rows.filter((r) => r.direction?.value === "out" || r.direction?.value === "in");

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

      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "72px 28px 104px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Link
            href={`/browse/${page.slug}${
              from ? `?${from}` : entityClass ? `?class=${encodeURIComponent(entityClass.name)}` : ""
            }`}
            style={{ color: COLORS.muted, fontSize: 14, fontWeight: 500 }}
          >
            ← {page.title}
          </Link>
          <h1
            style={{
              margin: 0,
              font: "400 clamp(28px,3.4vw,42px)/1.1 var(--font-instrument-serif), serif",
              letterSpacing: "-.02em",
              color: COLORS.accent,
            }}
          >
            {label || shortLabel(id)}
          </h1>
          <code
            title={id}
            style={{ font: "400 13px var(--font-plex-mono, monospace)", color: COLORS.muted, wordBreak: "break-all" }}
          >
            ID {shortLabel(id)}
          </code>
          {entityClass && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 760 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ font: "500 12px var(--font-plex-mono)", color: COLORS.accentPurple }}>
                  {entityClass.name}
                </span>
                {classTemplate && (
                  <a
                    href={classTemplate.replace(/\{\{class\}\}/g, entityClass.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 500, color: COLORS.accent }}
                  >
                    Class definition ↗
                  </a>
                )}
              </div>
              {entityClass.description && (
                <p style={{ margin: 0, color: COLORS.body, fontSize: 16, lineHeight: 1.6 }}>
                  {entityClass.description}
                </p>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "48px 0", color: COLORS.muted }}>
            <Loader2 size={18} className="animate-spin" />
            Loading…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              ...CARD_SURFACE,
              borderColor: "#c0643a",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              color: "#8c3d1f",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            <AlertCircle size={18} style={{ flex: "none", marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600 }}>Could not load this entity</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div style={{ ...CARD_SURFACE, color: COLORS.body, fontSize: 15, lineHeight: 1.6 }}>
            Nothing found for this entity in{" "}
            <code style={{ font: "400 13px var(--font-plex-mono, monospace)" }}>{graph}</code>.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            <TermSection
              title="Overview"
              groups={overview}
              pageSlug={page.slug}
              targetOf={targetOf}
              neighbourLabel={neighbourLabel}
              linkSuffix={linkSuffix}
            />
            <TermSection
              title="Connections"
              groups={connectionGroups}
              pageSlug={page.slug}
              targetOf={targetOf}
              neighbourLabel={neighbourLabel}
              linkSuffix={linkSuffix}
            />
            {entityClass && hasModelEdges && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>
                  How this record connects
                </span>
                <div style={{ ...CARD_SURFACE, padding: 18 }}>
                  <ModelFigure edges={modelEdges} current={entityClass.name} />
                </div>
              </div>
            )}
            <TermSection
              title="Source & history"
              groups={history}
              pageSlug={page.slug}
              targetOf={targetOf}
              neighbourLabel={neighbourLabel}
              linkSuffix={linkSuffix}
            />
            <details className="detail-tech">
              <summary>Technical details: RDF identifiers ({rawRows.length} triples)</summary>
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, color: COLORS.body }}>
                  Subject IRI{" "}
                  <code style={{ font: "400 12px var(--font-plex-mono)", wordBreak: "break-all" }}>{id}</code>
                  {" "}in graph{" "}
                  <code style={{ font: "400 12px var(--font-plex-mono)", wordBreak: "break-all" }}>{graph}</code>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", font: "400 12px var(--font-plex-mono)" }}>
                    <thead>
                      <tr>
                        {["Direction", "Predicate", "Value", "Datatype"].map((h) => (
                          <th
                            key={h}
                            style={{ textAlign: "left", padding: "6px 8px", color: COLORS.muted, borderBottom: `1px solid ${COLORS.border}` }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.map((r, i) => (
                        <tr key={i}>
                          {[
                            r.direction?.value === "in" ? "incoming (subject)" : "outgoing",
                            r.predicate?.value ?? "",
                            r.other?.value ?? "",
                            r.other?.datatype ?? (r.other?.type === "uri" ? "IRI" : ""),
                          ].map((cell, j) => (
                            <td
                              key={j}
                              style={{
                                padding: "6px 8px",
                                color: COLORS.body,
                                verticalAlign: "top",
                                wordBreak: "break-all",
                                borderBottom: `1px solid ${COLORS.border}`,
                              }}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}

function TermSection({
  title,
  groups,
  pageSlug,
  targetOf,
  neighbourLabel,
  linkSuffix,
}: {
  title: string;
  groups: Group[];
  pageSlug: string;
  targetOf: (row: Row) => string | null;
  neighbourLabel: Map<string, string>;
  linkSuffix: string;
}) {
  if (groups.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, font: "400 24px/1.1 var(--font-instrument-serif), serif", color: COLORS.accentPurple }}>
        {title}
      </h2>
      <div style={{ ...CARD_SURFACE, padding: 0, overflowX: "auto" }}>
        <table className="detail-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {groups.map((group, i) => {
              const border = i === groups.length - 1 ? "none" : `1px solid ${COLORS.border}`;
              return (
                <tr key={group.key}>
                  <th
                    scope="row"
                    title={group.title}
                    className="detail-term-label"
                    style={{
                      textAlign: "left",
                      padding: "12px 18px",
                      borderBottom: border,
                      verticalAlign: "top",
                      width: "30%",
                      minWidth: 160,
                    }}
                  >
                    {group.label}
                  </th>
                  <td
                    style={{
                      padding: "12px 18px",
                      borderBottom: border,
                      color: COLORS.body,
                      verticalAlign: "top",
                      wordBreak: "break-word",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {group.rows.map((row, j) => (
                        <div key={`${row.other?.value ?? ""}-${j}`}>
                          <TermValue
                            row={row}
                            target={targetOf(row)}
                            pageSlug={pageSlug}
                            neighbourLabel={neighbourLabel}
                            linkSuffix={linkSuffix}
                          />
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TermValue({
  row,
  target,
  pageSlug,
  neighbourLabel,
  linkSuffix,
}: {
  row: Row;
  target: string | null;
  pageSlug: string;
  neighbourLabel: Map<string, string>;
  linkSuffix: string;
}) {
  const value = row.other?.value || "";
  if (target) {
    // A connection reads as the neighbour's name when it has one, with its
    // local id beside it; the full IRI stays available as the title.
    const name = neighbourLabel.get(target);
    return (
      <>
        <Link
          href={`/browse/${pageSlug}/${encodeURIComponent(target)}${linkSuffix}`}
          title={target}
          style={{ color: COLORS.accentPurple, fontWeight: 500 }}
        >
          {name ?? shortLabel(target)}
        </Link>
        {name && <span className="detail-resolved">{shortLabel(target)}</span>}
      </>
    );
  }
  const known = knownLabel(value);
  if (/^https?:\/\//.test(value)) {
    // External links (schema:url, RRID resolver) are stored as literals so
    // they are not taken for connections.
    return (
      <>
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accentPurple }}>
          {known ?? value}
        </a>
        {known && <span className="detail-resolved">{value}</span>}
      </>
    );
  }
  if (!value) return <span style={{ color: COLORS.muted }}>Not recorded</span>;
  return (
    <>
      {known ?? value}
      {known && <span className="detail-resolved">{value}</span>}
    </>
  );
}
