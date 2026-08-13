"use client";

/**
 * ProvenanceTimelinePublic — Tailwind-styled animated provenance timeline
 * for the public review page.
 *
 * Renders the pipeline as a vertical timeline: search → screening → full
 * text → extraction → RoB → GRADE → synthesis → event log → done.
 * Animations are pure CSS keyframes scoped via styled-jsx so the component
 * is self-contained and can be embedded as a page tab.
 */

import React from "react";
import {
  Search,
  Filter,
  FileText,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import type { LogEvent } from "@/src/types/synthScholar";

// Loose review type — we only consume specific fields. Avoids tight coupling
// to the full ReviewDetail type so future schema changes don't ripple.
type ReviewLike = {
  search_queries?: string[];
  flow?: {
    total_identified: number;
    duplicates_removed: number;
    after_dedup: number;
    screened_title_abstract: number;
    excluded_title_abstract: number;
    sought_fulltext: number;
    assessed_eligibility: number;
    excluded_eligibility: number;
    included_synthesis: number;
  } | null;
  included_articles?: ReadonlyArray<{ rob_overall?: string }>;
  evidence_spans?: ReadonlyArray<unknown>;
  data_charting_rubrics?: ReadonlyArray<unknown>;
  bias_assessment?: string;
  grade_assessments?: ReadonlyArray<{ outcome: string; overall_certainty: string }>;
  synthesis_text?: string;
  completed_at?: string | null;
};

export function ProvenanceTimelinePublic({
  review,
  logEvents,
  log,
}: {
  review: ReviewLike;
  logEvents: LogEvent[];
  log: string[];
}) {
  const events: LogEvent[] =
    logEvents.length > 0
      ? logEvents
      : log.map((msg, i) => ({ step: i + 1, message: msg, timestamp: "" }));
  const steps = buildSteps(review, events);

  return (
    <div className="relative">
      <div
        className="prov-line absolute left-[27px] top-6 bottom-6 w-px bg-gradient-to-b from-emerald-300 via-sky-300 to-indigo-300"
        aria-hidden="true"
      />
      <ol className="relative space-y-4">
        {steps.map((step, idx) => (
          <Step key={step.id} step={step} index={idx} />
        ))}
      </ol>
      <p className="text-xs text-gray-500 mt-8 pl-14 italic">
        AI-assisted components were verified before publication. The full
        machine-readable provenance trail (per-LLM-call telemetry) is in the
        JSON / Markdown export.
      </p>
      <style jsx>{`
        @keyframes prov-step-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        :global(.prov-step) {
          animation: prov-step-in 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes prov-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        :global(.prov-dot) {
          animation: prov-pulse 2.4s ease-in-out infinite;
        }
        @keyframes prov-line-grow {
          0% { transform: scaleY(0); transform-origin: top; }
          100% { transform: scaleY(1); transform-origin: top; }
        }
        :global(.prov-line) {
          animation: prov-line-grow 800ms ease-out 200ms both;
        }
      `}</style>
    </div>
  );
}

// ── Step types + builder ───────────────────────────────────────────────

type StepKind = "search" | "screen" | "fulltext" | "extract" | "rob" | "synthesis" | "done";
type ProvStep = { id: string; kind: StepKind; title: string; subtitle?: string; body: React.ReactNode };

function buildSteps(review: ReviewLike, events: LogEvent[]): ProvStep[] {
  const out: ProvStep[] = [];

  if (review.search_queries && review.search_queries.length > 0) {
    out.push({
      id: "search",
      kind: "search",
      title: "Search strategy",
      subtitle: `${review.search_queries.length} approved ${review.search_queries.length === 1 ? "query" : "queries"}`,
      body: (
        <ul className="list-disc pl-5 space-y-1.5">
          {review.search_queries.map((q, i) => (
            <li key={i} className="font-mono text-[11px] text-gray-700 break-words leading-relaxed">
              {q}
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (review.flow) {
    const f = review.flow;
    out.push({
      id: "flow",
      kind: "screen",
      title: "PRISMA identification & screening",
      subtitle: `${f.total_identified} → ${f.included_synthesis} included`,
      body: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ["Identified", f.total_identified],
            ["After dedup", f.after_dedup],
            ["T/A screened", f.screened_title_abstract],
            ["Excluded T/A", f.excluded_title_abstract],
            ["Full-text sought", f.sought_fulltext],
            ["Eligibility assessed", f.assessed_eligibility],
            ["Excluded eligibility", f.excluded_eligibility],
            ["Included", f.included_synthesis],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded border border-gray-200 bg-white p-2">
              <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">{label}</div>
              <div className="text-lg font-light text-gray-900 tabular-nums">{value as number}</div>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (review.included_articles && review.included_articles.length > 0) {
    out.push({
      id: "fulltext",
      kind: "fulltext",
      title: "Full-text retrieval & inclusion",
      subtitle: `${review.included_articles.length} studies included in synthesis`,
      body: (
        <p className="text-sm text-gray-700">
          Full-text was resolved and verified for{" "}
          <strong>{review.included_articles.length}</strong> included studies via the OA chain
          (Europe PMC OA-XML → Unpaywall → OpenAlex → Semantic Scholar → publisher direct).
        </p>
      ),
    });
  }

  const ev = review.evidence_spans?.length ?? 0;
  const ch = review.data_charting_rubrics?.length ?? 0;
  if (ev > 0 || ch > 0) {
    out.push({
      id: "extract",
      kind: "extract",
      title: "Evidence extraction & charting",
      subtitle: `${ev} grounded span${ev === 1 ? "" : "s"} · ${ch} charting record${ch === 1 ? "" : "s"}`,
      body: (
        <p className="text-sm text-gray-700">
          The pipeline extracted evidence spans grounded in the included articles and produced one
          charting record per study. Spans below the relevance threshold are filtered before they
          reach the synthesis.
        </p>
      ),
    });
  }

  const robCounts = robBreakdown(review.included_articles ?? []);
  if (review.bias_assessment || robCounts.total > 0) {
    out.push({
      id: "rob",
      kind: "rob",
      title: "Risk-of-bias assessment",
      subtitle: robCounts.total > 0 ? Object.entries(robCounts.byRating).map(([r, n]) => `${n} ${r}`).join(" · ") : undefined,
      body: robCounts.total > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(robCounts.byRating).map(([r, n]) => (
            <span
              key={r}
              className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded border ${robClass(r)}`}
            >
              {r}: {n}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-700 italic">
          Detailed risk-of-bias narrative on the Review tab.
        </p>
      ),
    });
  }

  if (review.grade_assessments && review.grade_assessments.length > 0) {
    out.push({
      id: "grade",
      kind: "rob",
      title: "GRADE — certainty of evidence",
      subtitle: `${review.grade_assessments.length} outcome${review.grade_assessments.length === 1 ? "" : "s"}`,
      body: (
        <ul className="space-y-1.5">
          {review.grade_assessments.map((g, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-gray-800">{g.outcome}</span>
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${certaintyClass(g.overall_certainty)}`}>
                {g.overall_certainty}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (review.synthesis_text) {
    const wordCount = review.synthesis_text.trim().split(/\s+/).length;
    out.push({
      id: "synthesis",
      kind: "synthesis",
      title: "Narrative synthesis",
      subtitle: `${wordCount.toLocaleString()} words`,
      body: (
        <p className="text-sm text-gray-700">
          The narrative synthesis aggregates evidence across all included studies. The full text
          is on the Review tab.
        </p>
      ),
    });
  }

  if (events.length > 0) {
    out.push({
      id: "log",
      kind: "done",
      title: "Pipeline event trail",
      subtitle: `${events.length} event${events.length === 1 ? "" : "s"} recorded`,
      body: (
        <div className="max-h-64 overflow-y-auto rounded border border-gray-200 bg-gray-50 p-2 font-mono text-[10.5px] leading-relaxed text-gray-700">
          {events.map((e, i) => (
            <div key={i} className="whitespace-pre-wrap break-words py-0.5">
              <span className="text-gray-400 mr-2 tabular-nums">
                {String(e.step ?? i + 1).padStart(3, "0")}
              </span>
              {e.message}
            </div>
          ))}
        </div>
      ),
    });
  }

  out.push({
    id: "done",
    kind: "done",
    title: "Review completed",
    subtitle: review.completed_at ? new Date(review.completed_at).toLocaleString() : undefined,
    body: (
      <p className="text-sm text-gray-700">
        Output exported as Markdown / BibTeX / JSON / Turtle from the Review tab.
      </p>
    ),
  });

  return out;
}

function Step({ step, index }: { step: ProvStep; index: number }) {
  const Icon = stepIcon(step.kind);
  return (
    <li className="prov-step relative pl-14" style={{ animationDelay: `${index * 90}ms` }}>
      <div className="absolute left-3 top-3 w-7 h-7 flex items-center justify-center">
        <div className={`prov-dot w-3 h-3 rounded-full ${stepDotClass(step.kind)} ring-4 ring-white`} />
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
        <div className="flex items-start gap-3 mb-2">
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${stepIconBg(step.kind)}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">{step.title}</h2>
            {step.subtitle && <p className="text-xs text-gray-500 mt-0.5">{step.subtitle}</p>}
          </div>
        </div>
        <div className="ml-11">{step.body}</div>
      </div>
    </li>
  );
}

function stepIcon(kind: StepKind) {
  switch (kind) {
    case "search":     return Search;
    case "screen":     return Filter;
    case "fulltext":   return FileText;
    case "extract":    return ClipboardCheck;
    case "rob":        return ShieldCheck;
    case "synthesis":  return Sparkles;
    case "done":       return CheckCircle2;
  }
}
function stepIconBg(kind: StepKind) {
  switch (kind) {
    case "search":    return "bg-gradient-to-br from-emerald-400 to-emerald-600";
    case "screen":    return "bg-gradient-to-br from-sky-400 to-sky-600";
    case "fulltext":  return "bg-gradient-to-br from-blue-400 to-blue-600";
    case "extract":   return "bg-gradient-to-br from-indigo-400 to-indigo-600";
    case "rob":       return "bg-gradient-to-br from-violet-400 to-violet-600";
    case "synthesis": return "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600";
    case "done":      return "bg-gradient-to-br from-emerald-500 to-teal-600";
  }
}
function stepDotClass(kind: StepKind) {
  switch (kind) {
    case "search":    return "bg-emerald-500";
    case "screen":    return "bg-sky-500";
    case "fulltext":  return "bg-blue-500";
    case "extract":   return "bg-indigo-500";
    case "rob":       return "bg-violet-500";
    case "synthesis": return "bg-fuchsia-500";
    case "done":      return "bg-teal-500";
  }
}
function robBreakdown(articles: ReadonlyArray<{ rob_overall?: string }>) {
  const byRating: Record<string, number> = {};
  for (const a of articles) {
    const r = (a.rob_overall || "Unclear").trim() || "Unclear";
    byRating[r] = (byRating[r] ?? 0) + 1;
  }
  return { total: articles.length, byRating };
}
function robClass(rating: string) {
  const r = rating.toLowerCase();
  if (r.includes("low"))   return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (r.includes("high"))  return "bg-red-50 text-red-700 border-red-200";
  if (r.includes("some") || r.includes("moderate"))
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}
function certaintyClass(c: string) {
  const v = c.toLowerCase();
  if (v.includes("very low")) return "bg-red-50 text-red-700 border-red-200";
  if (v.includes("low"))      return "bg-amber-50 text-amber-700 border-amber-200";
  if (v.includes("moderate")) return "bg-sky-50 text-sky-700 border-sky-200";
  if (v.includes("high"))     return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}
