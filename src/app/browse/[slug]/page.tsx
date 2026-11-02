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

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import MarketingHeader from "../../components/marketing/MarketingHeader";
import MarketingFooter from "../../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../../components/marketing/fonts";
import { COLORS, CARD_SURFACE } from "../../components/marketing/tokens";
import ModelFigure, { type ModelEdge } from "../ModelFigure";
import FilterMenu, { type FilterOption } from "../FilterMenu";
import browserConfig from "@/src/config/yaml/class-browser.yaml";
import "../browse.css";

// `queryTemplate` on a class overrides the page's, which overrides defaults —
// useful for diagnostic entries that ask a different shape of question.
// `noun` is how the row count reads ("120 resources"); entity/entities
// otherwise.
type ClassEntry = { name: string; category: string; queryTemplate?: string; noun?: [string, string] };
// `emptyLabel` replaces "Not recorded" for a missing value in that column.
type Column = { key: string; label: string; emptyLabel?: string };
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
  // Free-text search over these keys, alongside the filters.
  search?: { keys: string[]; placeholder?: string };
  // The column that carries the row's link (instead of the id), and an
  // optional column shown under it. When set, the id moves under the name.
  primaryColumn?: string;
  secondaryColumn?: string;
};

// Entity ids are IRIs; the last segment is the part worth reading in a
// table. The full IRI stays as the link's title.
function shortId(iri: string): string {
  return iri.split("/").filter(Boolean).pop() || iri;
}

// Option value for rows with nothing in the filtered column. GROUP_CONCAT
// over no values gives "", so empty strings count as missing too. It appears
// in the URL, so it is kept readable.
const NOT_LISTED = "__none__";

function cellValues(row: Binding, spec: FilterSpec): string[] {
  const raw = row[spec.key]?.value;
  if (!raw) return [NOT_LISTED];
  const values = spec.separator ? raw.split(spec.separator).map((v) => v.trim()).filter(Boolean) : [raw];
  return values.length ? values : [NOT_LISTED];
}

const EMPTY_LABEL = "Not recorded";

// Normalised for search: case- and accent-insensitive.
function fold(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

  // useSearchParams needs a Suspense boundary in the app router.
  return (
    <Suspense>
      <BrowseView page={page} />
    </Suspense>
  );
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

  // The selected class and filters live in the URL
  // (?class=Resource&type=Tools&type=Metadata), so coming back from a detail
  // page, or reloading, lands on the same view. replace rather than push keeps
  // these changes out of the back-button history.
  const router = useRouter();
  const searchParams = useSearchParams();
  const listQuery = searchParams?.toString() ?? "";
  const classParam = searchParams?.get("class");
  const selected = page.classes.find((c) => c.name === classParam) ?? page.classes[0];
  const replaceQuery = (params: URLSearchParams) =>
    router.replace(`/browse/${page.slug}?${params.toString()}`, { scroll: false });
  // Switching class drops the filters: their values belong to the old class.
  const setSelected = (entry: ClassEntry) => replaceQuery(new URLSearchParams({ class: entry.name }));

  // What the schema says about the selected class, regardless of what has
  // been ingested. The per-record view on the detail page is data-derived.
  const modelEdges = (page.modelEdges ?? []).filter(
    (e) => e.from === selected.name || e.to === selected.name,
  );
  const [rows, setRows] = useState<Binding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    load(selected);
  }, [selected, load]);

  // Filtering is client-side over the rows already loaded, so it needs no
  // extra query.
  const filterSpecs = page.filters ?? [];
  // Selected values per filter key, read from the URL. Values within a filter
  // are OR'd, filters are AND'd with each other.
  const selections: Record<string, Set<string>> = Object.fromEntries(
    filterSpecs.map((spec) => [spec.key, new Set(searchParams?.getAll(spec.key) ?? [])]),
  );
  const setFilter = (key: string, values: Set<string>) => {
    const params = new URLSearchParams(listQuery);
    params.set("class", selected.name);
    params.delete(key);
    for (const v of values) params.append(key, v);
    replaceQuery(params);
  };
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
  // Free-text search. The input is local state so typing stays responsive;
  // the URL (?q=) follows shortly after, so back navigation restores it.
  const searchSpec = page.search;
  const urlQuery = searchParams?.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  // The last value this page wrote to ?q=. The URL only overrides the input
  // when it changed for another reason (class switch, back navigation), so a
  // write landing mid-typing does not undo the keystrokes after it.
  const pushedQuery = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery !== pushedQuery.current) {
      pushedQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);
  useEffect(() => {
    if (!searchSpec || query.trim() === urlQuery.trim()) return;
    const timer = setTimeout(() => {
      pushedQuery.current = query.trim() ? query : "";
      const params = new URLSearchParams(listQuery);
      params.set("class", selected.name);
      if (query.trim()) params.set("q", query);
      else params.delete("q");
      replaceQuery(params);
    }, 250);
    return () => clearTimeout(timer);
    // replaceQuery is recreated every render; the inputs that matter are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, urlQuery, listQuery, selected.name, searchSpec]);
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const matchesSearch = (row: Binding) => {
    if (!searchSpec || terms.length === 0) return true;
    const haystack = fold(searchSpec.keys.map((k) => row[k]?.value ?? "").join(" "));
    return terms.every((t) => haystack.includes(t));
  };
  const shownRows = visibleRows.filter(matchesSearch);

  const anyFilterActive = Object.values(selections).some((v) => v.size > 0) || terms.length > 0;
  const clearAll = () => {
    setQuery("");
    pushedQuery.current = "";
    replaceQuery(new URLSearchParams({ class: selected.name }));
  };
  const [nounOne, nounMany] = selected.noun ?? ["entity", "entities"];
  const countLabel = (n: number) => `${n} ${n === 1 ? nounOne : nounMany}`;

  // With a primary column the name carries the link and the id moves under
  // it. Columns with no value in any row (an Organization has no provider)
  // are left out rather than shown as a column of "Not recorded".
  const primaryKey = page.primaryColumn;
  const secondaryKey = page.secondaryColumn;
  const shownColumns = primaryKey
    ? columns.filter((c) => c.key === primaryKey || rows.some((r) => r[c.key]?.value))
    : columns;
  const detailHref = (iri: string) =>
    `/browse/${page.slug}/${encodeURIComponent(iri)}${listQuery ? `?from=${encodeURIComponent(listQuery)}` : ""}`;
  const canLink = page.linkIds !== false;
  const missing = (col?: Column) => <span style={{ color: COLORS.muted }}>{col?.emptyLabel ?? EMPTY_LABEL}</span>;

  // The cell for one column. The primary cell is the readable name linked to
  // the record, then the description, then the id in small monospace.
  const renderCell = (row: Binding, col: Column): ReactNode => {
    const iri = row.id?.value;
    if (primaryKey && col.key === primaryKey) {
      const name = row[col.key]?.value;
      const desc = secondaryKey ? row[secondaryKey]?.value : undefined;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {iri && canLink ? (
            <Link href={detailHref(iri)} title={iri} style={{ color: COLORS.accentPurple, fontWeight: 600 }}>
              {name || shortId(iri)}
            </Link>
          ) : (
            <span style={{ fontWeight: 600 }}>{name || (iri ? shortId(iri) : EMPTY_LABEL)}</span>
          )}
          {desc && <span className="browse-desc">{desc}</span>}
          {iri && (
            <span className="browse-id" title={iri}>
              ID {shortId(iri)}
            </span>
          )}
        </div>
      );
    }
    if (col.key === "id" && iri && canLink) {
      return (
        <Link href={detailHref(iri)} title={iri} style={{ color: COLORS.accentPurple, fontWeight: 500 }}>
          {shortId(iri)}
        </Link>
      );
    }
    return row[col.key]?.value || missing(col);
  };

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
                No <strong>{selected.name}</strong> {nounMany} found in{" "}
                <code style={{ font: "400 13px var(--font-plex-mono, monospace)" }}>{graph}</code>.
              </div>
            )}

            {!loading && !error && rows.length > 0 && (
              <>
                {(filterMenus.length > 0 || searchSpec) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
                    {searchSpec && (
                      <input
                        type="search"
                        className="browse-search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchSpec.placeholder ?? "Search"}
                        aria-label={searchSpec.placeholder ?? `Search ${nounMany}`}
                      />
                    )}
                    {filterMenus.map(({ spec, label, options }) => (
                      <FilterMenu
                        key={spec.key}
                        label={label}
                        options={options}
                        selected={selections[spec.key] ?? new Set()}
                        onChange={(next) => setFilter(spec.key, next)}
                      />
                    ))}
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
                  <span role="status" style={{ font: "500 13px var(--font-plex-mono)", color: COLORS.muted }}>
                    {anyFilterActive ? `${shownRows.length} of ${countLabel(rows.length)}` : countLabel(rows.length)}
                    {anyFilterActive && (
                      <button type="button" className="browse-clear" onClick={clearAll}>
                        Clear search and filters
                      </button>
                    )}
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
                {shownRows.length === 0 && (
                  <div style={{ ...CARD_SURFACE, color: COLORS.body, fontSize: 15, lineHeight: 1.6 }}>
                    No {nounMany} match{terms.length > 0 ? <> &ldquo;{query.trim()}&rdquo;</> : null}
                    {terms.length > 0 && Object.values(selections).some((v) => v.size > 0) ? " with" : ""}
                    {Object.values(selections).some((v) => v.size > 0) ? " the selected filters" : ""}.{" "}
                    <button type="button" className="browse-clear" onClick={clearAll}>
                      Clear search and filters
                    </button>
                  </div>
                )}
                {shownRows.length > 0 && (
                  <div className="browse-table" style={{ ...CARD_SURFACE, padding: 0, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr>
                          {shownColumns.map((col) => (
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
                        {shownRows.map((row, i) => (
                          <tr key={row.id?.value ?? i}>
                            {shownColumns.map((col) => (
                              <td
                                key={col.key}
                                style={{
                                  padding: "12px 18px",
                                  borderBottom: i === shownRows.length - 1 ? "none" : `1px solid ${COLORS.border}`,
                                  color: COLORS.body,
                                  verticalAlign: "top",
                                  wordBreak: "break-word",
                                  minWidth: col.key === primaryKey ? 220 : undefined,
                                }}
                              >
                                {renderCell(row, col)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* Narrow screens: one compact card per row instead of a squeezed table. */}
                {shownRows.length > 0 && (
                  <ul className="browse-cards">
                    {shownRows.map((row, i) => {
                      const iri = row.id?.value;
                      const head = shownColumns.find((c) => c.key === (primaryKey ?? "id")) ?? shownColumns[0];
                      const rest = shownColumns.filter((c) => c !== head && c.key !== "id");
                      return (
                        <li key={iri ?? i} style={{ ...CARD_SURFACE, padding: 16 }}>
                          {head && renderCell(row, head)}
                          {rest.length > 0 && (
                            <dl>
                              {rest.map((col) => (
                                <div key={col.key}>
                                  <dt>{col.label}</dt>
                                  <dd>{renderCell(row, col)}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {iri && canLink && (
                            <Link href={detailHref(iri)} className="browse-card-action">
                              View details →
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
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
