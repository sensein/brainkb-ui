"use client";

/**
 * /browse/<page>/<id> — detail view for a single entity.
 *
 * Deliberately schema-agnostic: one query fetches every triple the entity
 * takes part in, in both directions, and the page sorts them rather than
 * following a per-class field list, so a class needs no configuration to get
 * a working detail page.
 *
 * Two sections: the entity's plain values (untitled, directly under the
 * header) and Connections — anything pointing at another entity, in either
 * direction, with incoming references marked "←".
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

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import MarketingHeader from "../../../components/marketing/MarketingHeader";
import MarketingFooter from "../../../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../../../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../../../components/marketing/tokens";
import ModelFigure, { type ModelEdge } from "../../ModelFigure";
import browserConfig from "@/src/config/yaml/class-browser.yaml";

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
type Row = { direction?: Term; predicate?: Term; other?: Term; otherCategory?: Term };

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

export default function EntityDetailPage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const rawId = typeof params?.id === "string" ? params.id : "";
  const page = CONFIG.pages.find((p) => p.slug === slug);

  if (!page) notFound();

  return <DetailView page={page} id={decodeURIComponent(rawId)} />;
}

function DetailView({ page, id }: { page: PageConfig; id: string }) {
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
  for (const row of rows) {
    if (row.direction?.value === "class" && row.other?.value && row.otherCategory?.value) {
      neighbourCategory.set(row.other.value, row.otherCategory.value);
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
          <Link href={`/browse/${page.slug}`} style={{ color: COLORS.muted, fontSize: 14, fontWeight: 500 }}>
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
          <code style={{ font: "400 13px var(--font-plex-mono, monospace)", color: COLORS.muted, wordBreak: "break-all" }}>
            {id}
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
            <TermSection rows={attributes} pageSlug={page.slug} currentId={id} />
            <TermSection
              title="Connections"
              rows={[...connections, ...incoming]}
              pageSlug={page.slug}
              currentId={id}
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
          </>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}

function TermSection({
  title,
  rows,
  pageSlug,
  currentId,
}: {
  title?: string;
  rows: Row[];
  pageSlug: string;
  currentId: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {title && (
        <h2 style={{ margin: 0, font: "400 24px/1.1 var(--font-instrument-serif), serif", color: COLORS.accentPurple }}>
          {title}
        </h2>
      )}
      <div style={{ ...CARD_SURFACE, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {rows.map((row, i) => {
              const predicate = row.predicate?.value || "";
              const value = row.other?.value || "";
              const incoming = row.direction?.value === "in";
              // Incoming rows name the *other* entity, which is always a real
              // IRI subject; outgoing ones may be literal references.
              const target = incoming
                ? (row.other?.type === "uri" ? row.other.value ?? null : refTarget(row.other, currentId))
                : refTarget(row.other, currentId);
              return (
                <tr key={`${predicate}-${value}-${i}`}>
                  <th
                    scope="row"
                    title={predicate}
                    style={{
                      textAlign: "left",
                      padding: "12px 18px",
                      borderBottom: i === rows.length - 1 ? "none" : `1px solid ${COLORS.border}`,
                      font: "500 12px var(--font-plex-mono)",
                      color: COLORS.muted,
                      whiteSpace: "nowrap",
                      verticalAlign: "top",
                      width: "1%",
                    }}
                  >
                    {incoming ? `← ${shortLabel(predicate)} of` : shortLabel(predicate)}
                  </th>
                  <td
                    style={{
                      padding: "12px 18px",
                      borderBottom: i === rows.length - 1 ? "none" : `1px solid ${COLORS.border}`,
                      color: COLORS.body,
                      verticalAlign: "top",
                      wordBreak: "break-word",
                    }}
                  >
                    {target ? (
                      // Both directions render as the local id: outgoing rows
                      // carry it as a literal, incoming ones as a full IRI.
                      // The IRI stays available as the title attribute.
                      <Link
                        href={`/browse/${pageSlug}/${encodeURIComponent(target)}`}
                        title={target}
                        style={{ color: COLORS.accentPurple, fontWeight: 500 }}
                      >
                        {shortLabel(target)}
                      </Link>
                    ) : /^https?:\/\//.test(value) ? (
                      // External links (schema:url, RRID resolver) are stored
                      // as literals so they are not taken for connections.
                      <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accentPurple }}>
                        {value}
                      </a>
                    ) : (
                      value
                    )}
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
