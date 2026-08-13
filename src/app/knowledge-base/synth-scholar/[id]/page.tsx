"use client";

/**
 * /knowledge-base/synth-scholar/[id] — public review detail.
 *
 * Tabbed UI (Review | Provenance) that swaps content inline using a URL hash
 * (#provenance) — no full-page navigation, shareable state, browser
 * back/forward respected via the hashchange listener.
 *
 * The Review tab renders the full long-form content (abstract → intro →
 * methods → flow → studies → synthesis → RoB → GRADE → limitations →
 * conclusions → references). The Provenance tab renders the animated
 * pipeline timeline component.
 */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  BookOpen,
  Loader2,
  AlertCircle,
  Activity,
  FileText,
} from "lucide-react";
// Public (unauthenticated) reads — see usePublicReview*. The authenticated hooks
// cannot serve this page: they need a session to exchange for an ml_service token,
// and their endpoints 404 for anyone who is not the review's author, so even a
// published review was invisible to its readers.
import {
  usePublicReview,
  usePublicReviewLog,
  useExportPublicReview,
} from "@/src/hooks/useSynthScholar";
import { MarkdownContent } from "@/src/app/components/synth-scholar/MarkdownContent";
import { ProvenanceTimelinePublic } from "@/src/app/components/synth-scholar/ProvenanceTimelinePublic";
import type {
  ArticleSummary,
  GRADEAssessment,
  ReviewDetail,
} from "@/src/types/synthScholar";

export default function PublicReviewDetailPage() {
  const params = useParams();
  const reviewId = decodeURIComponent((params?.id as string) || "");
  const { data, isLoading, error } = usePublicReview(reviewId || undefined);
  const log = usePublicReviewLog(reviewId || undefined);
  const exportMut = useExportPublicReview();

  const isPublicCompleted =
    data?.is_public === true && data?.status === "completed";

  // Tab state synced to URL hash so it's shareable + survives refresh.
  const [activeTab, setActiveTab] = React.useState<"review" | "provenance">("review");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () =>
      setActiveTab(window.location.hash === "#provenance" ? "provenance" : "review");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const switchTab = (tab: "review" | "provenance") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.hash = tab === "provenance" ? "provenance" : "";
      window.history.replaceState(null, "", url.toString());
    }
  };

  return (
    <div className="kb-page-margin">
      {/* Hero */}
      <div className="grid fix-left-margin grid-cols-1 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent" />
          <div className="relative px-8 py-10">
            <Link
              href="/knowledge-base/synth-scholar"
              className="inline-flex items-center gap-1 text-sky-100 hover:text-white text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to public reviews
            </Link>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100 mb-2">
              SynthScholar · PRISMA-guided literature review
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {data?.title || (isLoading ? "Loading…" : "Review")}
            </h1>
            <p className="font-mono text-xs text-sky-100/90">{reviewId}</p>
            {data?.completed_at && (
              <p className="text-xs text-sky-100/80 mt-2">
                Completed {new Date(data.completed_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid fix-left-margin grid-cols-1 gap-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading review…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Could not load review</h3>
                <p className="text-red-700">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && data && !isPublicCompleted && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800">
                  Review not publicly available
                </h3>
                <p className="text-amber-700">
                  This review is either still running or has not been shared publicly by its
                  author.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && data && isPublicCompleted && (
          <>
            {/* Tabs + downloads */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-2 flex items-center justify-between flex-wrap gap-2">
                <nav className="flex" role="tablist" aria-label="Review tabs">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "review"}
                    onClick={() => switchTab("review")}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === "review"
                        ? "border-sky-500 text-sky-700"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}
                  >
                    <FileText className="w-4 h-4" /> Review
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "provenance"}
                    onClick={() => switchTab("provenance")}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === "provenance"
                        ? "border-emerald-500 text-emerald-700"
                        : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Provenance
                  </button>
                </nav>
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => exportMut.mutate({ reviewId, format: "markdown" })}
                    disabled={exportMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => exportMut.mutate({ reviewId, format: "bibtex" })}
                    disabled={exportMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-sky-600 text-sky-700 rounded hover:bg-sky-50 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" /> BibTeX
                  </button>
                  <button
                    type="button"
                    onClick={() => exportMut.mutate({ reviewId, format: "json" })}
                    disabled={exportMut.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </button>
                </div>
              </div>
              {exportMut.error && (
                <p className="text-xs text-red-600 px-5 py-2 border-t border-red-100">
                  {(exportMut.error as Error).message}
                </p>
              )}
            </div>

            {/* ── Provenance tab ───────────────────────────────────── */}
            {activeTab === "provenance" && (
              <ProvenanceTimelinePublic
                review={data}
                logEvents={log.data?.log_events ?? []}
                log={log.data?.log ?? []}
              />
            )}

            {/* ── Review tab ──────────────────────────────────────── */}
            {activeTab === "review" && (
              <>
                {data.structured_abstract && (
                  <Section title="Abstract">
                    <MarkdownContent>{data.structured_abstract}</MarkdownContent>
                  </Section>
                )}

                {data.introduction_text && (
                  <Section title="Introduction">
                    <MarkdownContent>{data.introduction_text}</MarkdownContent>
                  </Section>
                )}

                {(data.search_queries?.length ?? 0) > 0 && (
                  <Section title="Methods — search strategy">
                    <p className="text-sm text-gray-600 mb-3">
                      Final approved search queries used across all configured databases:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      {data.search_queries.map((q: string, i: number) => (
                        <li key={i} className="font-mono text-xs text-gray-800 break-words">
                          {q}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {data.flow && <PRISMAFlowCard flow={data.flow} />}

                {data.included_articles && data.included_articles.length > 0 && (
                  <Section title={`Included studies (${data.included_articles.length})`}>
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-700 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 text-left">PMID / DOI</th>
                            <th className="px-3 py-2 text-left">Year</th>
                            <th className="px-3 py-2 text-left">Title</th>
                            <th className="px-3 py-2 text-left">Authors</th>
                            <th className="px-3 py-2 text-left">RoB</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.included_articles.map((a: ArticleSummary) => (
                            <tr key={a.pmid || a.doi || a.title} className="align-top">
                              <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">
                                {a.pmid || a.doi || "—"}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                                {a.year || "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {a.title || "(untitled)"}
                                {a.journal && (
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    {a.journal}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600">
                                {a.authors || "—"}
                              </td>
                              <td className="px-3 py-2">
                                <RoBChip rating={a.rob_overall} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Section>
                )}

                {data.synthesis_text && (
                  <Section title="Synthesis">
                    <MarkdownContent>{data.synthesis_text}</MarkdownContent>
                  </Section>
                )}

                {data.bias_assessment && (
                  <Section title="Risk of bias assessment">
                    <MarkdownContent>{data.bias_assessment}</MarkdownContent>
                  </Section>
                )}

                {data.grade_assessments && data.grade_assessments.length > 0 && (
                  <Section title="GRADE — certainty of evidence">
                    <div className="space-y-4">
                      {data.grade_assessments.map((g: GRADEAssessment, i: number) => (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-lg p-4 bg-gray-50/50"
                        >
                          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                            <h3 className="text-base font-semibold text-gray-900">
                              {g.outcome}
                            </h3>
                            <CertaintyChip certainty={g.overall_certainty} />
                          </div>
                          {g.summary && (
                            <p className="text-sm text-gray-700 leading-relaxed">{g.summary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {data.limitations && (
                  <Section title="Limitations">
                    <MarkdownContent>{data.limitations}</MarkdownContent>
                  </Section>
                )}

                {data.conclusions_text && (
                  <Section title="Conclusions">
                    <MarkdownContent>{data.conclusions_text}</MarkdownContent>
                  </Section>
                )}

                {data.included_articles && data.included_articles.length > 0 && (
                  <Section title="References">
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      {data.included_articles.map((a: ArticleSummary, i: number) => (
                        <li key={i} className="text-gray-800">
                          {a.authors && <span>{a.authors}. </span>}
                          {a.year && <span>({a.year}). </span>}
                          <span className="font-medium">{a.title || "(untitled)"}</span>
                          {a.journal && (
                            <span>
                              . <em>{a.journal}</em>
                            </span>
                          )}
                          {a.doi && (
                            <span>
                              .{" "}
                              <a
                                href={`https://doi.org/${a.doi.replace(/^https?:\/\/doi\.org\//, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 hover:underline break-all"
                              >
                                {a.doi}
                              </a>
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </Section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
        {title}
      </h2>
      <div className="text-gray-800">{children}</div>
    </section>
  );
}

function PRISMAFlowCard({
  flow,
}: {
  flow: ReviewDetail["flow"];
}) {
  if (!flow) return null;
  const cells: Array<[string, number | string]> = [
    ["Identified", flow.total_identified],
    ["Duplicates removed", flow.duplicates_removed],
    ["After dedup", flow.after_dedup],
    ["T/A screened", flow.screened_title_abstract],
    ["Excluded (T/A)", flow.excluded_title_abstract],
    ["Full-text sought", flow.sought_fulltext],
    ["Eligibility assessed", flow.assessed_eligibility],
    ["Excluded (eligibility)", flow.excluded_eligibility],
    ["Included in synthesis", flow.included_synthesis],
  ];
  return (
    <Section title="PRISMA flow">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cells.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3"
          >
            <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              {label}
            </div>
            <div className="text-2xl font-light text-gray-900 mt-1 tabular-nums">{value}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function RoBChip({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-xs text-gray-400">—</span>;
  const r = rating.toLowerCase();
  const cls = r.includes("low")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : r.includes("high")
      ? "bg-red-50 text-red-700 border-red-200"
      : r.includes("some") || r.includes("moderate")
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${cls}`}
    >
      {rating}
    </span>
  );
}

function CertaintyChip({ certainty }: { certainty?: string }) {
  if (!certainty) return null;
  const c = certainty.toLowerCase();
  const cls = c.includes("high")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : c.includes("very low")
      ? "bg-red-50 text-red-700 border-red-200"
      : c.includes("low")
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : c.includes("moderate")
          ? "bg-sky-50 text-sky-700 border-sky-200"
          : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border ${cls}`}
    >
      {certainty}
    </span>
  );
}
