"use client";

/**
 * /knowledge-base/synth-scholar/ingested/[id] — a SynthScholar review ingested
 * from a run's output directory (query_service /api/synthscholar/reviews).
 *
 * Who may see it is the space's rule: public spaces are open to anyone, private
 * ones to their members (the query service answers 404 otherwise). Tabs, synced to
 * the URL hash: Review (an overview, then the review's own text and studies), Manuscript (the run's
 * review.manuscript.md with its figures), Files (everything kept) and Provenance.
 */

import React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Activity, AlertCircle, FileText, FolderOpen, Loader2, ScrollText } from "lucide-react";
import { MarkdownContent } from "@/src/app/components/synth-scholar/MarkdownContent";
import {
  ReviewFiles,
  ReviewManuscript,
  ReviewProvenanceDetails,
  downloadFile,
  hasManuscript,
} from "@/src/app/components/synth-scholar/ReviewOutputs";
import {
  fetchIngestedFile,
  getIngestedReview,
  type IngestedArticle,
  type IngestedReview,
} from "@/src/services/api/synthScholarIngest";
import LiteratureShell from "../../LiteratureShell";
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
  readableSlug,
  searchDateRange,
  type Fact,
  type NavItem,
} from "../../reviewParts";

const DOWNLOADS = [
  { key: "review.pdf", label: "PDF", hint: "manuscript" },
  { key: "review.md", label: "Markdown", hint: ".md" },
  { key: "review.bib", label: "BibTeX", hint: "references" },
  { key: "review.ttl", label: "Turtle", hint: "RDF" },
  { key: "review.json", label: "JSON", hint: "full data" },
];

type Tab = "review" | "manuscript" | "files" | "provenance";
const TABS: Tab[] = ["review", "manuscript", "files", "provenance"];

export default function IngestedReviewPage() {
  const params = useParams();
  const reviewId = decodeURIComponent((params?.id as string) || "");
  // A review is unique per space: ?space= says which copy (links from the list carry it).
  const space = useSearchParams()?.get("space") || null;
  const [review, setReview] = React.useState<IngestedReview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("review");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [spaceName, setSpaceName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reviewId) return;
    getIngestedReview(reviewId, space).then(setReview).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [reviewId, space]);

  React.useEffect(() => {
    const sync = () => {
      const h = window.location.hash.replace(/^#/, "") as Tab;
      setTab(TABS.includes(h) ? h : "review");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const switchTab = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.hash = t === "review" ? "" : t;
    window.history.replaceState(null, "", url.toString());
  };

  // The space's display name (GET /api/spaces lists the spaces the caller may see).
  React.useEffect(() => {
    const slug = review?.space_slug;
    if (!slug) return;
    fetch("/api/spaces", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const hit = ((body?.spaces ?? []) as { slug?: string; name?: string }[]).find((x) => x.slug === slug);
        if (hit?.name) setSpaceName(hit.name);
      })
      .catch(() => undefined);
  }, [review?.space_slug]);

  // Files come from the copy actually shown (its space), even when the link had none.
  const shownSpace = review?.space_slug || space;
  const load = React.useCallback((path: string) => fetchIngestedFile(reviewId, path, shownSpace), [reviewId, shownSpace]);
  const files = review?.files ?? [];
  const has = (p: string) => files.some((f) => f.path === p);
  const grab = (path: string) => {
    setBusy(path);
    downloadFile(load, path).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setBusy(null));
  };
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "review", label: "Review", icon: <FileText className="w-4 h-4" /> },
    ...(hasManuscript(files) ? [{ id: "manuscript" as Tab, label: "Manuscript", icon: <ScrollText className="w-4 h-4" /> }] : []),
    { id: "files", label: `Files (${files.length})`, icon: <FolderOpen className="w-4 h-4" /> },
    { id: "provenance", label: "Provenance", icon: <Activity className="w-4 h-4" /> },
  ];
  const d = review?.detail;

  return (
    <LiteratureShell
      compact
      back={{ href: "/knowledge-base/synth-scholar", label: "All literature reviews" }}
      eyebrow="Literature review · imported into BrainKB"
      title={review?.title || (error ? "Review" : "Loading…")}
      lead={
        <div className="lead flex flex-wrap items-center gap-x-4 gap-y-1" style={{ fontSize: 14 }}>
          {review && (
            <span>
              In {spaceName || readableSlug(review.space_slug)}
              {review.space_visibility === "private" ? " (private space)" : ""}
            </span>
          )}
          {review?.run_completed_at && <span>Completed {formatDate(review.run_completed_at)}</span>}
          {review?.imported_at && <span>Imported {formatDate(review.imported_at)}</span>}
          {reviewId && <CopyableId label="Review ID" value={reviewId} />}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6">
        {!review && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading review…</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">Could not load the review</h3>
              <p className="text-red-700">{error}</p>
              <p className="text-red-700 text-sm mt-1">A review in a private space is visible to the space&apos;s members only — sign in if you are one.</p>
            </div>
          </div>
        )}

        {review && d && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="border-b border-gray-200 px-2 flex items-center justify-between flex-wrap gap-2">
                <nav className="flex flex-wrap" role="tablist" aria-label="Review tabs">
                  {tabs.map((t) => (
                    <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => switchTab(t.id)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        tab === t.id ? "border-sky-500 text-sky-700" : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </nav>
                <div className="px-3 py-2">
                  <DownloadMenu options={DOWNLOADS.filter((o) => has(o.key))} busyKey={busy} onPick={grab} />
                </div>
              </div>
            </div>

            {tab === "provenance" && <ReviewProvenanceDetails review={review} />}
            {tab === "manuscript" && (
              <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-10">
                <ReviewManuscript load={load} files={files} />
              </section>
            )}
            {tab === "files" && (
              <Section title="Files kept with this review">
                <ReviewFiles load={load} files={files} />
              </Section>
            )}
            {tab === "review" && <ReviewText review={review} spaceName={spaceName} />}
          </>
        )}
      </div>
    </LiteratureShell>
  );
}

function ReviewText({ review, spaceName }: { review: IngestedReview; spaceName: string | null }) {
  const d = review.detail;
  const flow = d.flow as Record<string, number> | null;
  const cells: [string, unknown][] = flow ? [
    ["Identified", flow.total_identified], ["Duplicates removed", flow.duplicates_removed], ["After dedup", flow.after_dedup],
    ["Title/abstract screened", flow.screened_title_abstract], ["Excluded at title/abstract", flow.excluded_title_abstract],
    ["Full-text sought", flow.sought_fulltext], ["Eligibility assessed", flow.assessed_eligibility],
    ["Excluded (eligibility)", flow.excluded_eligibility], ["Included in synthesis", flow.included_synthesis],
  ] : [];
  const md = (id: string, title: string, text: string) =>
    text ? <Section id={id} title={title}><MarkdownContent>{text}</MarkdownContent></Section> : null;
  const studies = d.included_articles;
  const searched = searchDateRange((review.manifest?.local_run?.search_log ?? []).map((e) => e.date));
  const r = d.retrieval;

  const facts: Fact[] = [
    { label: "Included studies", value: <span className="tabular-nums">{studies.length}</span> },
    ...(r && r.included > 0 ? [{ label: "Read in full text", value: `${r.with_full_text} of ${r.included}` }] : []),
    ...(searched ? [{ label: "Searched", value: searched }] : []),
    ...(review.run_completed_at ? [{ label: "Review completed", value: formatDate(review.run_completed_at) }] : []),
    {
      label: "Status",
      value: `Imported into BrainKB${review.imported_at ? ` ${formatDate(review.imported_at)}` : ""} · ${spaceName || readableSlug(review.space_slug)}`,
    },
  ];

  const nav: NavItem[] = [
    { id: "overview", label: "Overview" },
    ...(d.structured_abstract ? [{ id: "abstract", label: "Abstract" }] : []),
    ...(d.introduction_text ? [{ id: "introduction", label: "Introduction" }] : []),
    ...(d.search_queries.length > 0 ? [{ id: "methods", label: "Methods" }] : []),
    ...(cells.length > 0 ? [{ id: "prisma-flow", label: "PRISMA flow" }] : []),
    ...(d.synthesis_text ? [{ id: "synthesis", label: "Synthesis" }] : []),
    ...(studies.length > 0 ? [{ id: "included-studies", label: "Included studies" }] : []),
    ...(d.bias_assessment ? [{ id: "risk-of-bias", label: "Risk of bias" }] : []),
    ...(d.grade_assessments.length > 0 ? [{ id: "grade", label: "Certainty (GRADE)" }] : []),
    ...(d.limitations ? [{ id: "limitations", label: "Limitations" }] : []),
    ...(d.conclusions_text ? [{ id: "conclusions", label: "Conclusions" }] : []),
  ];

  return (
    <>
      <OverviewSection
        question={d.research_question}
        facts={facts}
        methodNote={<MethodNote statements={methodStatements(d.limitations)} limitationsId={d.limitations ? "limitations" : undefined} />}
      />
      <SectionNav items={nav} />
      {md("abstract", "Abstract", d.structured_abstract)}
      {md("introduction", "Introduction", d.introduction_text)}
      {d.search_queries.length > 0 && (
        <Section id="methods" title="Methods — search strategy">
          <ul className="list-disc pl-5 space-y-1.5">
            {d.search_queries.map((q, i) => <li key={i} className="font-mono text-xs text-gray-800 break-words">{q}</li>)}
          </ul>
        </Section>
      )}
      {cells.length > 0 && (
        <Section id="prisma-flow" title="PRISMA flow">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cells.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
                <div className="text-2xl font-light text-gray-900 mt-1 tabular-nums">{value == null ? "—" : String(value)}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
      {md("synthesis", "Synthesis", d.synthesis_text)}
      {studies.length > 0 && (
        <Section id="included-studies" title={`Included studies (${studies.length})`}>
          <StudiesTable
            showRead
            studies={studies.map((a: IngestedArticle & { pmc_id?: string; pmcid?: string }) => ({
              pmid: a.pmid, doi: a.doi, pmcid: a.pmcid || a.pmc_id, year: a.year, title: a.title, journal: a.journal,
              authors: a.authors, rob: a.rob_overall,
              read: a.full_text ? `full text${a.full_text_source ? ` (${a.full_text_source.replace(/_/g, " ")})` : ""}` : "abstract",
            }))}
          />
        </Section>
      )}
      {md("risk-of-bias", "Risk of bias assessment", d.bias_assessment)}
      {d.grade_assessments.length > 0 && (
        <Section id="grade" title="GRADE — certainty of evidence">
          <div className="space-y-4">
            {d.grade_assessments.map((g, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                  <h3 className="text-base font-semibold text-gray-900">{g.outcome}</h3>
                  <span className="text-xs font-semibold uppercase text-gray-700">{g.overall_certainty}</span>
                </div>
                {g.summary && <p className="text-sm text-gray-700 leading-relaxed">{g.summary}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
      {md("limitations", "Limitations", d.limitations)}
      {md("conclusions", "Conclusions", d.conclusions_text)}
    </>
  );
}
