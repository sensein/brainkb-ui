"use client";

/**
 * /knowledge-base/synth-scholar/[id] — public review detail.
 *
 * Tabbed UI (Review | Provenance) that swaps content inline using a URL hash
 * (#provenance) — no full-page navigation, shareable state, browser
 * back/forward respected via the hashchange listener.
 *
 * The Review tab opens with an overview (research question, included-study
 * count, dates, status, and a method note when the review's limitations state how
 * screening was done) and section links, then the long-form content (abstract →
 * intro → methods → flow → synthesis → studies → RoB → GRADE → limitations →
 * conclusions → references). The Provenance tab renders the animated
 * pipeline timeline component.
 */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
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
import LiteratureShell from "../LiteratureShell";
import { ProvenanceTimelinePublic } from "@/src/app/components/synth-scholar/ProvenanceTimelinePublic";
import type {
  ArticleSummary,
  ExportFormat,
  GRADEAssessment,
  ReviewDetail,
} from "@/src/types/synthScholar";
import {
  CopyableId,
  DownloadMenu,
  MethodNote,
  OverviewSection,
  Section,
  SectionNav,
  StudiesTable,
  formatDate,
  methodStatements,
  type DownloadOption,
  type Fact,
  type NavItem,
} from "../reviewParts";

const DOWNLOADS: (DownloadOption & { key: ExportFormat })[] = [
  { key: "pdf", label: "PDF", hint: "manuscript" },
  { key: "markdown", label: "Markdown", hint: ".md" },
  { key: "bibtex", label: "BibTeX", hint: "references" },
  { key: "ttl", label: "Turtle", hint: "RDF" },
  { key: "json", label: "JSON", hint: "full data" },
];

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
    <LiteratureShell
      compact
      back={{ href: "/knowledge-base/synth-scholar", label: "All literature reviews" }}
      eyebrow="Literature review · run on BrainKB"
      title={data?.title || (isLoading ? "Loading…" : "Review")}
      lead={
        <div className="lead flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: 14 }}>
          {data?.completed_at && <span>Completed {formatDate(data.completed_at)}</span>}
          {reviewId && <CopyableId label="Review ID" value={reviewId} />}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6">
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
                <div className="px-3 py-2">
                  <DownloadMenu
                    options={DOWNLOADS}
                    busyKey={exportMut.isPending ? exportMut.variables?.format ?? "pending" : null}
                    onPick={(key) => exportMut.mutate({ reviewId, format: key as ExportFormat })}
                  />
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
            {activeTab === "review" && <ReviewTab data={data} />}
          </>
        )}
      </div>
    </LiteratureShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function ReviewTab({ data }: { data: ReviewDetail }) {
  const studies = data.included_articles ?? [];
  const hasStudies = studies.length > 0;
  const method = methodStatements(data.limitations);

  const facts: Fact[] = [
    { label: "Included studies", value: <span className="tabular-nums">{studies.length}</span> },
    ...(data.status ? [{ label: "Review status", value: data.status.charAt(0).toUpperCase() + data.status.slice(1) }] : []),
    ...(data.completed_at ? [{ label: "Completed", value: formatDate(data.completed_at) }] : []),
    ...(data.created_at ? [{ label: "Run started", value: formatDate(data.created_at) }] : []),
  ];

  const nav: NavItem[] = [
    { id: "overview", label: "Overview" },
    ...(data.structured_abstract ? [{ id: "abstract", label: "Abstract" }] : []),
    ...(data.introduction_text ? [{ id: "introduction", label: "Introduction" }] : []),
    ...((data.search_queries?.length ?? 0) > 0 ? [{ id: "methods", label: "Methods" }] : []),
    ...(data.flow ? [{ id: "prisma-flow", label: "PRISMA flow" }] : []),
    ...(data.synthesis_text ? [{ id: "synthesis", label: "Synthesis" }] : []),
    ...(hasStudies ? [{ id: "included-studies", label: "Included studies" }] : []),
    ...(data.bias_assessment ? [{ id: "risk-of-bias", label: "Risk of bias" }] : []),
    ...((data.grade_assessments?.length ?? 0) > 0 ? [{ id: "grade", label: "Certainty (GRADE)" }] : []),
    ...(data.limitations ? [{ id: "limitations", label: "Limitations" }] : []),
    ...(data.conclusions_text ? [{ id: "conclusions", label: "Conclusions" }] : []),
    ...(hasStudies ? [{ id: "references", label: "References" }] : []),
  ];

  return (
    <>
      <OverviewSection
        question={data.research_question}
        facts={facts}
        methodNote={<MethodNote statements={method} limitationsId={data.limitations ? "limitations" : undefined} />}
      />

      <SectionNav items={nav} />

      {data.structured_abstract && (
        <Section id="abstract" title="Abstract">
          <MarkdownContent>{data.structured_abstract}</MarkdownContent>
        </Section>
      )}

      {data.introduction_text && (
        <Section id="introduction" title="Introduction">
          <MarkdownContent>{data.introduction_text}</MarkdownContent>
        </Section>
      )}

      {(data.search_queries?.length ?? 0) > 0 && (
        <Section id="methods" title="Methods — search strategy">
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

      {data.synthesis_text && (
        <Section id="synthesis" title="Synthesis">
          <MarkdownContent>{data.synthesis_text}</MarkdownContent>
        </Section>
      )}

      {hasStudies && (
        <Section id="included-studies" title={`Included studies (${studies.length})`}>
          <StudiesTable
            showAuthors
            studies={studies.map((a: ArticleSummary) => ({
              pmid: a.pmid, doi: a.doi, year: a.year, title: a.title,
              journal: a.journal, authors: a.authors, rob: a.rob_overall,
            }))}
          />
        </Section>
      )}

      {data.bias_assessment && (
        <Section id="risk-of-bias" title="Risk of bias assessment">
          <MarkdownContent>{data.bias_assessment}</MarkdownContent>
        </Section>
      )}

      {data.grade_assessments && data.grade_assessments.length > 0 && (
        <Section id="grade" title="GRADE — certainty of evidence">
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
        <Section id="limitations" title="Limitations">
          <MarkdownContent>{data.limitations}</MarkdownContent>
        </Section>
      )}

      {data.conclusions_text && (
        <Section id="conclusions" title="Conclusions">
          <MarkdownContent>{data.conclusions_text}</MarkdownContent>
        </Section>
      )}

      {hasStudies && (
        <Section id="references" title="References">
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            {studies.map((a: ArticleSummary, i: number) => (
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
    ["Title/abstract screened", flow.screened_title_abstract],
    ["Excluded at title/abstract", flow.excluded_title_abstract],
    ["Full-text sought", flow.sought_fulltext],
    ["Eligibility assessed", flow.assessed_eligibility],
    ["Excluded (eligibility)", flow.excluded_eligibility],
    ["Included in synthesis", flow.included_synthesis],
  ];
  return (
    <Section id="prisma-flow" title="PRISMA flow">
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
