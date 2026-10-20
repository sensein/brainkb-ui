"use client";

/**
 * /knowledge-base/synth-scholar/ingested/[id] — a SynthScholar review ingested
 * from a run's output directory (query_service /api/synthscholar/reviews).
 *
 * Who may see it is the space's rule: public spaces are open to anyone, private
 * ones to their members (the query service answers 404 otherwise). Tabs, synced to
 * the URL hash: Review (the review's own text and studies), Manuscript (the run's
 * review.manuscript.md with its figures), Files (everything kept) and Provenance.
 */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, AlertCircle, Download, FileText, FolderOpen, Loader2, ScrollText } from "lucide-react";
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

type Tab = "review" | "manuscript" | "files" | "provenance";
const TABS: Tab[] = ["review", "manuscript", "files", "provenance"];

export default function IngestedReviewPage() {
  const params = useParams();
  const reviewId = decodeURIComponent((params?.id as string) || "");
  const [review, setReview] = React.useState<IngestedReview | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("review");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!reviewId) return;
    getIngestedReview(reviewId).then(setReview).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [reviewId]);

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

  const load = React.useCallback((path: string) => fetchIngestedFile(reviewId, path), [reviewId]);
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
      eyebrow="Literature review · ingested"
      title={review?.title || (error ? "Review" : "Loading…")}
      lead={
        <p className="lead" style={{ fontSize: 14 }}>
          <span className="font-mono">{reviewId}</span>
          {review && (
            <>
              {review.run_completed_at ? ` · completed ${new Date(review.run_completed_at).toLocaleDateString()}` : ""}
              {` · in space ${review.space_slug}${review.space_visibility ? ` (${review.space_visibility})` : ""}`}
            </>
          )}
        </p>
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
                <div className="flex flex-wrap gap-2 px-3 py-2">
                  {[["review.pdf", "PDF"], ["review.md", "Markdown"], ["review.bib", "BibTeX"], ["review.ttl", "Turtle"], ["review.json", "JSON"]]
                    .filter(([p]) => has(p))
                    .map(([p, label], i) => (
                      <button key={p} type="button" onClick={() => grab(p)} disabled={busy === p}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50 ${
                          i === 0 ? "bg-sky-600 text-white hover:bg-sky-700" : "border border-sky-600 text-sky-700 hover:bg-sky-50"}`}>
                        {busy === p ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} {label}
                      </button>
                    ))}
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
            {tab === "review" && <ReviewText review={review} />}
          </>
        )}
      </div>
    </LiteratureShell>
  );
}

function ReviewText({ review }: { review: IngestedReview }) {
  const d = review.detail;
  const flow = d.flow as Record<string, number> | null;
  const cells: [string, unknown][] = flow ? [
    ["Identified", flow.total_identified], ["Duplicates removed", flow.duplicates_removed], ["After dedup", flow.after_dedup],
    ["T/A screened", flow.screened_title_abstract], ["Excluded (T/A)", flow.excluded_title_abstract],
    ["Full-text sought", flow.sought_fulltext], ["Eligibility assessed", flow.assessed_eligibility],
    ["Excluded (eligibility)", flow.excluded_eligibility], ["Included in synthesis", flow.included_synthesis],
  ] : [];
  const md = (title: string, text: string) => text ? <Section title={title}><MarkdownContent>{text}</MarkdownContent></Section> : null;
  return (
    <>
      {d.research_question && <Section title="Research question"><p className="text-gray-800">{d.research_question}</p></Section>}
      {md("Abstract", d.structured_abstract)}
      {md("Introduction", d.introduction_text)}
      {d.search_queries.length > 0 && (
        <Section title="Methods — search strategy">
          <ul className="list-disc pl-5 space-y-1.5">
            {d.search_queries.map((q, i) => <li key={i} className="font-mono text-xs text-gray-800 break-words">{q}</li>)}
          </ul>
        </Section>
      )}
      {cells.length > 0 && (
        <Section title="PRISMA flow">
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
      {d.included_articles.length > 0 && (
        <Section title={`Included studies (${d.included_articles.length})`}>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-700 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">PMID / DOI</th><th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-left">Title</th><th className="px-3 py-2 text-left">Read</th>
                  <th className="px-3 py-2 text-left">RoB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {d.included_articles.map((a: IngestedArticle, i) => (
                  <tr key={a.pmid || a.doi || i} className="align-top">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">{a.pmid || a.doi || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{a.year || "—"}</td>
                    <td className="px-3 py-2 text-gray-900">
                      {a.title || "(untitled)"}
                      {a.journal && <span className="block text-xs text-gray-500 mt-0.5">{a.journal}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {a.full_text ? `full text${a.full_text_source ? ` (${a.full_text_source.replace(/_/g, " ")})` : ""}` : "abstract"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{a.rob_overall || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {md("Synthesis", d.synthesis_text)}
      {md("Risk of bias assessment", d.bias_assessment)}
      {d.grade_assessments.length > 0 && (
        <Section title="GRADE — certainty of evidence">
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
      {md("Limitations", d.limitations)}
      {md("Conclusions", d.conclusions_text)}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="text-gray-800">{children}</div>
    </section>
  );
}
