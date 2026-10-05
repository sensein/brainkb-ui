"use client";

/**
 * /browse/<slug> — one page per Explore card. Classes run down the left; the
 * entities of the selected class fill the table. Pages, classes, columns, the
 * target graph and the SPARQL all come from
 * src/config/yaml/class-browser.yaml, so adding a page is a config change.
 *
 * Queries go through /api/knowledge-base (server-side SPARQL proxy), the same
 * route the knowledge-base pages use, which keeps tokens off the client.
 *
 * Styled with the marketing tokens rather than the app's --bkb-* theme, so
 * arriving here from /explore stays visually continuous (see SiteChrome).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../../components/marketing/tokens";
import ModelFigure, { type ModelEdge } from "../ModelFigure";
import FilterMenu, { type FilterOption } from "../FilterMenu";
import browserConfig from "@/src/config/yaml/class-browser.yaml";

// `queryTemplate` on a class overrides the page's, which overrides defaults —
// useful for diagnostic entries that ask a different shape of question.
type ClassEntry = { name: string; category: string; queryTemplate?: string };
type Column = { key: string; label: string };
// `separator` splits a cell holding several values (a GROUP_CONCAT) so each
// value is its own option. The label defaults to the column's.
type FilterSpec = { key: string; label?: string; separator?: string };
type ModelSource = { name?: string; url?: string; classUrlTemplate?: string } | null;
type Binding = Record<string, { value?: string } | undefined>;
type PageConfig = {
  slug: string;
  title: string;
  description: string;
  classes: ClassEntry[];
  graph?: string;
  columns?: Column[];
  queryTemplate?: string;
  // Diagnostic-style pages put raw IRIs in the id column, where shortening
  // and linking would mangle them.
  linkIds?: boolean;
  model?: ModelSource;
  modelEdges?: ModelEdge[];
  // Columns that get a multi-select filter above the table.
  filters?: FilterSpec[];
};

// Entity ids are IRIs; the last segment is the part worth reading in a
// table. The full IRI stays as the link's title.
function shortId(iri: string): string {
  return iri.split("/").filter(Boolean).pop() || iri;
}

// Option value for rows with nothing in the filtered column. GROUP_CONCAT
// over no values gives "", so empty strings count as missing too.
const NOT_LISTED = "\u0000none";

function cellValues(row: Binding, spec: FilterSpec): string[] {
  const raw = row[spec.key]?.value;
  if (!raw) return [NOT_LISTED];
  const values = spec.separator ? raw.split(spec.separator).map((v) => v.trim()).filter(Boolean) : [raw];
  return values.length ? values : [NOT_LISTED];
}

const CONFIG = browserConfig as {
  defaults: { graph: string; columns: Column[]; queryTemplate: string; model?: ModelSource };
  pages: PageConfig[];
};

export default function BrowsePage() {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const page = CONFIG.pages.find((p) => p.slug === slug);

  if (!page) notFound();

  return <BrowseView page={page} />;
}

function BrowseView({ page }: { page: PageConfig }) {
  const graph = page.graph ?? CONFIG.defaults.graph;
  const columns = page.columns ?? CONFIG.defaults.columns;
  const queryTemplate = page.queryTemplate ?? CONFIG.defaults.queryTemplate;
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

  const [selected, setSelected] = useState<ClassEntry>(page.classes[0]);

  // What the schema says about the selected class, regardless of what has
  // been ingested. The per-record view on the detail page is data-derived.
  const modelEdges = (page.modelEdges ?? []).filter(
    (e) => e.from === selected.name || e.to === selected.name,
  );
  const [rows, setRows] = useState<Binding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Selected values per filter key. Values within a filter are OR'd, filters
  // are AND'd with each other.
  const [selections, setSelections] = useState<Record<string, Set<string>>>({});

  const load = useCallback(
    async (entry: ClassEntry) => {
      setLoading(true);
      setError(null);
      try {
        const sparqlQuery = (entry.queryTemplate ?? queryTemplate)
          .replace(/\{\{graph\}\}/g, graph)
          .replace(/\{\{category\}\}/g, entry.category);
        const response = await fetch("/api/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: `browse-${page.slug}-${entry.name}`, sparqlQuery }),
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
    },
    [graph, queryTemplate, page.slug],
  );

  useEffect(() => {
    setSelections({});
    load(selected);
  }, [selected, load]);

  // Filtering is client-side over the rows already loaded, so it needs no
  // extra query.
  const filterSpecs = page.filters ?? [];
  const matches = (row: Binding, skipKey?: string) =>
    filterSpecs.every((spec) => {
      const chosen = selections[spec.key];
      if (spec.key === skipKey || !chosen?.size) return true;
      return cellValues(row, spec).some((v) => chosen.has(v));
    });
  const visibleRows = rows.filter((r) => matches(r));

  // Each filter's counts reflect the other filters, so they show what picking
  // that option would leave. A filter is hidden when the column has no values
  // at all for this class (Organizations have no provider).
  const filterMenus = filterSpecs
    .map((spec) => {
      const counts = new Map<string, number>();
      for (const row of rows) {
        if (!matches(row, spec.key)) continue;
        for (const v of cellValues(row, spec)) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const hasValues = rows.some((r) => !cellValues(r, spec).includes(NOT_LISTED));
      // Keep selected options listed even when their count drops to zero.
      for (const v of selections[spec.key] ?? []) if (!counts.has(v)) counts.set(v, 0);
      const options: FilterOption[] = [...counts.entries()]
        .map(([value, count]) => ({ value, count, label: value === NOT_LISTED ? "Not listed" : value }))
        .sort((x, y) =>
          x.value === NOT_LISTED ? 1 : y.value === NOT_LISTED ? -1 : x.label.localeCompare(y.label),
        );
      const label = spec.label ?? columns.find((c) => c.key === spec.key)?.label ?? spec.key;
      return { spec, label, options, hasValues };
    })
    .filter((m) => m.hasValues);
  const anyFilterActive = Object.values(selections).some((v) => v.size > 0);

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
          gap: 36,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Link href="/explore" style={{ color: COLORS.muted, fontSize: 14, fontWeight: 500 }}>
            ← Explore
          </Link>
          <h1
            style={{
              margin: 0,
              font: "400 clamp(34px,4.2vw,52px)/1.05 var(--font-instrument-serif), serif",
              letterSpacing: "-.02em",
              color: COLORS.accent,
            }}
          >
            {page.title}
          </h1>
          <p style={{ margin: 0, maxWidth: 900, color: COLORS.body, fontSize: 17, lineHeight: 1.6 }}>
            {page.description}
          </p>
          {model?.url && (
            <a
              href={model.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ alignSelf: "flex-start", fontSize: 14, fontWeight: 500, color: COLORS.accent }}
            >
              {model.name || "Model definition"} ↗
            </a>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
          <nav
            aria-label="Classes"
            style={{ flex: "0 1 240px", minWidth: 200, display: "flex", flexDirection: "column", gap: 4 }}
          >
            {page.classes.map((entry) => {
              const active = entry.name === selected.name;
              return (
                <button
                  key={entry.name}
                  onClick={() => setSelected(entry)}
                  aria-current={active ? "true" : undefined}
                  style={{
                    textAlign: "left",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid transparent",
                    background: active ? COLORS.accentPurple : "transparent",
                    color: active ? COLORS.cardBg : COLORS.body,
                    font: "500 14px var(--font-plex-mono, monospace)",
                    cursor: "pointer",
                  }}
                >
                  {entry.name}
                </button>
              );
            })}
          </nav>

          <div style={{ flex: "1 1 460px", minWidth: 0 }}>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "48px 0", color: COLORS.muted }}>
                <Loader2 size={18} className="animate-spin" />
                Loading {selected.name}…
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
                  <div style={{ fontWeight: 600 }}>Could not load {selected.name}</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {!loading && !error && rows.length === 0 && (
              <div style={{ ...CARD_SURFACE, color: COLORS.body, fontSize: 15, lineHeight: 1.6 }}>
                No <strong>{selected.name}</strong> entities found in{" "}
                <code style={{ font: "400 13px var(--font-plex-mono, monospace)" }}>{graph}</code>.
              </div>
            )}

            {!loading && !error && rows.length > 0 && (
              <>
                {filterMenus.length > 0 && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                    {filterMenus.map(({ spec, label, options }) => (
                      <FilterMenu
                        key={spec.key}
                        label={label}
                        options={options}
                        selected={selections[spec.key] ?? new Set()}
                        onChange={(next) => setSelections((prev) => ({ ...prev, [spec.key]: next }))}
                      />
                    ))}
                    {anyFilterActive && (
                      <button
                        onClick={() => setSelections({})}
                        style={{
                          border: "none",
                          background: "transparent",
                          fontSize: 13,
                          fontWeight: 500,
                          color: COLORS.accent,
                          cursor: "pointer",
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
                <div
                  style={{
                    marginBottom: 12,
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ font: "500 13px var(--font-plex-mono)", color: COLORS.muted }}>
                    {anyFilterActive && `${visibleRows.length} of `}
                    {rows.length} {rows.length === 1 ? "entity" : "entities"}
                  </span>
                  {classTemplate && (
                    <a
                      href={classTemplate.replace(/\{\{class\}\}/g, selected.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, fontWeight: 500, color: COLORS.accent }}
                    >
                      {selected.name} definition ↗
                    </a>
                  )}
                </div>
                <div style={{ ...CARD_SURFACE, padding: 0, overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            style={{
                              textAlign: "left",
                              padding: "14px 18px",
                              borderBottom: `1px solid ${COLORS.border}`,
                              font: "500 12px var(--font-plex-mono)",
                              color: COLORS.muted,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.length === 0 && (
                        <tr>
                          <td colSpan={columns.length} style={{ padding: "18px", color: COLORS.muted }}>
                            No entities match the selected filters.
                          </td>
                        </tr>
                      )}
                      {visibleRows.map((row, i) => (
                        <tr key={row.id?.value ?? i}>
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              style={{
                                padding: "12px 18px",
                                borderBottom: i === visibleRows.length - 1 ? "none" : `1px solid ${COLORS.border}`,
                                color: COLORS.body,
                                verticalAlign: "top",
                                wordBreak: "break-word",
                              }}
                            >
                              {col.key === "id" && row.id?.value && page.linkIds !== false ? (
                                <Link
                                  href={`/browse/${page.slug}/${encodeURIComponent(row.id.value)}`}
                                  title={row.id.value}
                                  style={{ color: COLORS.accentPurple, fontWeight: 500 }}
                                >
                                  {shortId(row.id.value)}
                                </Link>
                              ) : (
                                row[col.key]?.value || <span style={{ color: COLORS.muted }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {modelEdges.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>
              How {selected.name} relates in the model
            </span>
            <div style={{ ...CARD_SURFACE, padding: 18 }}>
              <ModelFigure edges={modelEdges} current={selected.name} />
            </div>
          </div>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}
