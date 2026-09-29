"use client";

/**
 * /browse/<page>/<id> — detail view for a single entity.
 *
 * Deliberately schema-agnostic: one query fetches every triple the entity
 * takes part in, in both directions, and the page sorts them rather than
 * following a per-class field list, so a class needs no configuration to get
 * a working detail page.
 *
 * Two sections: Basic information (plain values) and Connections (anything
 * pointing at another entity, in either direction — outgoing links plus the
 * triples that name this entity, which are marked "←").
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
import browserConfig from "@/src/config/yaml/class-browser.yaml";

type ClassEntry = { name: string; category: string; description?: string };
type PageConfig = {
  slug: string;
  title: string;
  classes: ClassEntry[];
  graph?: string;
  detailQueryTemplate?: string;
};
type Term = { value?: string; type?: string; datatype?: string };
type Row = { direction?: Term; predicate?: Term; other?: Term };

const CONFIG = browserConfig as {
  defaults: { graph: string; detailQueryTemplate: string; entityRefDatatypes?: string[] };
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

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const localId = id.split("/").filter(Boolean).pop() || id;
      const sparqlQuery = template
        .replace(/\{\{graph\}\}/g, graph)
        .replace(/\{\{localId\}\}/g, localId)
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

  const outgoing = rows.filter((r) => r.direction?.value === "out");
  const attributes = outgoing.filter((r) => refTarget(r.other, id) === null);
  const connections = outgoing.filter((r) => refTarget(r.other, id) !== null);
  const incoming = rows.filter((r) => r.direction?.value === "in");

  // The category attribute tells us which of the page's classes this is, so
  // the configured description can be shown without a second query.
  const category = attributes.find((r) => r.predicate?.value?.endsWith("/category"))?.other?.value;
  const entityClass = page.classes.find((c) => c.category === category);
  const label = attributes.find((r) => r.predicate?.value?.endsWith("#label"))?.other?.value;

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
              <span style={{ font: "500 12px var(--font-plex-mono)", color: COLORS.accentPurple }}>
                {entityClass.name}
              </span>
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
            <TermSection title="Basic information" rows={attributes} pageSlug={page.slug} currentId={id} />
            <TermSection
              title="Connections"
              rows={[...connections, ...incoming]}
              pageSlug={page.slug}
              currentId={id}
            />
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
  title: string;
  rows: Row[];
  pageSlug: string;
  currentId: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, font: "400 24px/1.1 var(--font-instrument-serif), serif", color: COLORS.accentPurple }}>
        {title}
      </h2>
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
                      <Link
                        href={`/browse/${pageSlug}/${encodeURIComponent(target)}`}
                        style={{ color: COLORS.accentPurple, fontWeight: 500 }}
                      >
                        {value}
                      </Link>
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
