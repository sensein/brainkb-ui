"use client";

/**
 * ProvenanceTimelineOwner — bkb-* token-styled animated provenance timeline
 * for the owner view (matches the user-side SynthScholar UI).
 *
 * Same step model as ProvenanceTimelinePublic but rendered in BrainKB's
 * design language (bkb-card, bkb-mono, bkb-chip, var(--bkb-*) tokens, FONTS,
 * Icon component) so it sits naturally inside the user app shell.
 *
 * Optionally renders an owner-only Run Configuration card up top — toggle
 * with the showRunConfig prop.
 */

import React from "react";
import { FONTS, Icon } from "@/src/app/components/design-system";
import type { LogEvent } from "@/src/types/synthScholar";

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
  run_request?: {
    model?: string;
    compare_mode?: boolean;
    compare_models?: string[];
    max_results_per_query?: number;
    related_depth?: number;
    biorxiv_days?: number;
    enable_cache?: boolean;
    extract_data?: boolean;
    max_plan_iterations?: number;
    output_synthesis_style?: string;
    concurrency?: number;
    protocol?: { max_hops?: number; rob_tool?: string };
  } | null;
};

export function ProvenanceTimelineOwner({
  review,
  logEvents,
  log,
  showRunConfig = true,
}: {
  review: ReviewLike;
  logEvents: LogEvent[];
  log: string[];
  showRunConfig?: boolean;
}) {
  const events: LogEvent[] =
    logEvents.length > 0
      ? logEvents
      : log.map((msg, i) => ({ step: i + 1, message: msg, timestamp: "" }));
  const steps = buildSteps(review, events);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showRunConfig && <RunConfigCard review={review} />}

      <div className="bkb-card" style={{ padding: 18 }}>
        <h2
          style={{
            fontFamily: FONTS.display,
            fontSize: 18,
            margin: "0 0 16px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Icon name="agent" size={14} /> Pipeline timeline
        </h2>
        <div style={{ position: "relative" }}>
          <div
            className="prov-line"
            style={{
              position: "absolute",
              left: 13,
              top: 6,
              bottom: 6,
              width: 1,
              background:
                "linear-gradient(to bottom, var(--bkb-accent), color-mix(in oklch, var(--bkb-accent), transparent 70%))",
            }}
          />
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((step, idx) => (
              <Step key={step.id} step={step} index={idx} />
            ))}
          </ol>
        </div>
      </div>

      <style jsx>{`
        @keyframes prov-step-in {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        :global(.prov-step) {
          animation: prov-step-in 480ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        @keyframes prov-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.06); }
        }
        :global(.prov-dot) {
          animation: prov-pulse 2.4s ease-in-out infinite;
        }
        @keyframes prov-line-grow {
          0% { transform: scaleY(0); transform-origin: top; }
          100% { transform: scaleY(1); transform-origin: top; }
        }
        :global(.prov-line) {
          animation: prov-line-grow 700ms ease-out 150ms both;
        }
      `}</style>
    </div>
  );
}

// ── Run config (owner-only) ──────────────────────────────────────────

function RunConfigCard({ review }: { review: ReviewLike }) {
  const rr = review.run_request;
  if (!rr) return null;
  const rows: Array<[string, React.ReactNode]> = [
    ["Model", rr.model || "—"],
    rr.compare_mode && rr.compare_models?.length
      ? ["Compare models", rr.compare_models.join(", ")]
      : ["Mode", "Single model"],
    ["Max results / query", rr.max_results_per_query ?? "—"],
    ["Related-articles depth", rr.related_depth ?? "—"],
    ["Citation hops", rr.protocol?.max_hops ?? "—"],
    ["Concurrency", rr.concurrency ?? "—"],
    ["bioRxiv lookback (days)", rr.biorxiv_days ?? "—"],
    ["Max plan iterations", rr.max_plan_iterations ?? "—"],
    ["RoB tool", rr.protocol?.rob_tool ?? "—"],
    ["Synthesis style", rr.output_synthesis_style ?? "—"],
    ["Cache enabled", String(rr.enable_cache ?? false)],
    ["Extract data", String(rr.extract_data ?? false)],
  ];
  return (
    <div className="bkb-card" style={{ padding: 18 }}>
      <h2
        style={{
          fontFamily: FONTS.display,
          fontSize: 18,
          margin: "0 0 12px",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name="settings" size={14} /> Run configuration
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--bkb-textSubtle)",
            marginLeft: 6,
            border: "1px solid var(--bkb-border)",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          owner-only
        </span>
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {rows.map(([label, value]) => (
          <div
            key={label as string}
            style={{
              padding: 10,
              background: "var(--bkb-surfaceAlt)",
              borderRadius: 6,
              border: "1px solid var(--bkb-border)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--bkb-textSubtle)",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div className="bkb-mono" style={{ fontSize: 12, color: "var(--bkb-text)", wordBreak: "break-word" }}>
              {value}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--bkb-textSubtle)", fontStyle: "italic" }}>
        Full LLM-call telemetry (per-invocation tokens, prompts, retries) is in the JSON / Markdown
        export. The OpenRouter API key is intentionally not persisted with this review.
      </div>
    </div>
  );
}

// ── Step types + builder ───────────────────────────────────────────────

type StepKind = "search" | "screen" | "fulltext" | "extract" | "rob" | "synthesis" | "done";
type ProvStep = { id: string; kind: StepKind; title: string; subtitle?: string; body: React.ReactNode };

function buildSteps(review: ReviewLike, events: LogEvent[]): ProvStep[] {
  const out: ProvStep[] = [];

  if (review.search_queries?.length) {
    out.push({
      id: "search",
      kind: "search",
      title: "Search strategy",
      subtitle: `${review.search_queries.length} approved ${review.search_queries.length === 1 ? "query" : "queries"}`,
      body: (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {review.search_queries.map((q, i) => (
            <li
              key={i}
              className="bkb-mono"
              style={{ fontSize: 11, color: "var(--bkb-textMuted)", lineHeight: 1.55, wordBreak: "break-word", padding: "2px 0" }}
            >
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 6 }}>
          {[
            ["Identified", f.total_identified],
            ["After dedup", f.after_dedup],
            ["T/A screened", f.screened_title_abstract],
            ["Excluded T/A", f.excluded_title_abstract],
            ["Full-text", f.sought_fulltext],
            ["Eligibility", f.assessed_eligibility],
            ["Excluded elig.", f.excluded_eligibility],
            ["Included", f.included_synthesis],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              style={{
                padding: 6,
                background: "var(--bkb-surfaceAlt)",
                border: "1px solid var(--bkb-border)",
                borderRadius: 4,
              }}
            >
              <div style={{ fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", fontWeight: 600 }}>
                {label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 300, color: "var(--bkb-text)", fontVariantNumeric: "tabular-nums" }}>
                {value as number}
              </div>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (review.included_articles?.length) {
    out.push({
      id: "fulltext",
      kind: "fulltext",
      title: "Full-text retrieval & inclusion",
      subtitle: `${review.included_articles.length} studies included`,
      body: (
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
          Full text was resolved for <strong>{review.included_articles.length}</strong> included
          studies via the OA chain (Europe PMC OA-XML → Unpaywall → OpenAlex → Semantic Scholar →
          publisher direct).
        </div>
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
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
          Per-article spans below the relevance threshold are filtered before reaching the synthesis.
        </div>
      ),
    });
  }

  const robCounts = robBreakdown(review.included_articles ?? []);
  if (review.bias_assessment || robCounts.total > 0) {
    out.push({
      id: "rob",
      kind: "rob",
      title: "Risk-of-bias assessment",
      subtitle: robCounts.total > 0
        ? Object.entries(robCounts.byRating).map(([r, n]) => `${n} ${r}`).join(" · ")
        : undefined,
      body: robCounts.total > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {Object.entries(robCounts.byRating).map(([r, n]) => (
            <span key={r} className="bkb-chip" style={{ fontSize: 10, ...robChipStyle(r) }}>
              {r}: {n}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", fontStyle: "italic" }}>
          See main review tab for the narrative RoB assessment.
        </div>
      ),
    });
  }

  if (review.grade_assessments?.length) {
    out.push({
      id: "grade",
      kind: "rob",
      title: "GRADE — certainty of evidence",
      subtitle: `${review.grade_assessments.length} outcome${review.grade_assessments.length === 1 ? "" : "s"}`,
      body: (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {review.grade_assessments.map((g, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                fontSize: 12,
                padding: "4px 0",
              }}
            >
              <span style={{ color: "var(--bkb-text)" }}>{g.outcome}</span>
              <span className="bkb-chip" style={{ fontSize: 10, ...certaintyStyle(g.overall_certainty) }}>
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
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
          The full synthesis text is on the Review tab.
        </div>
      ),
    });
  }

  if (events.length > 0) {
    out.push({
      id: "log",
      kind: "done",
      title: "Pipeline event trail",
      subtitle: `${events.length} event${events.length === 1 ? "" : "s"}`,
      body: (
        <div
          className="bkb-scroll bkb-mono"
          style={{
            maxHeight: 220,
            overflowY: "auto",
            padding: 8,
            background: "var(--bkb-surfaceAlt)",
            border: "1px solid var(--bkb-border)",
            borderRadius: 4,
            fontSize: 10.5,
            color: "var(--bkb-textMuted)",
            lineHeight: 1.55,
          }}
        >
          {events.map((e, i) => (
            <div key={i} style={{ padding: "1px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              <span style={{ color: "var(--bkb-textSubtle)", marginRight: 8, fontVariantNumeric: "tabular-nums" }}>
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
      <div style={{ fontSize: 12, color: "var(--bkb-textMuted)" }}>
        Output exported as Markdown / BibTeX / JSON / Turtle from the Review tab.
      </div>
    ),
  });

  return out;
}

function Step({ step, index }: { step: ProvStep; index: number }) {
  return (
    <li className="prov-step" style={{ position: "relative", paddingLeft: 36, animationDelay: `${index * 80}ms` }}>
      <div
        className="prov-dot"
        style={{
          position: "absolute",
          left: 9,
          top: 14,
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: kindColor(step.kind),
          boxShadow: "0 0 0 4px var(--bkb-surface)",
        }}
      />
      <div
        className="bkb-card"
        style={{
          padding: 12,
          background: "var(--bkb-surface)",
          border: "1px solid var(--bkb-border)",
          borderRadius: 8,
          transition: "border-color 150ms ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: kindColor(step.kind),
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <Icon name={kindIcon(step.kind)} size={12} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--bkb-text)" }}>{step.title}</div>
            {step.subtitle && (
              <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 1 }}>
                {step.subtitle}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginLeft: 32 }}>{step.body}</div>
      </div>
    </li>
  );
}

function kindColor(kind: StepKind): string {
  switch (kind) {
    case "search":    return "var(--bkb-accent, #2e7d6e)";
    case "screen":    return "var(--bkb-primary, #1f6feb)";
    case "fulltext":  return "var(--bkb-publication, #7e57c2)";
    case "extract":   return "var(--bkb-agent, #2e7d6e)";
    case "rob":       return "var(--bkb-publication, #b66a8d)";
    case "synthesis": return "var(--bkb-accent, #4caf50)";
    case "done":      return "var(--bkb-textMuted, #4a4a4a)";
  }
}
function kindIcon(kind: StepKind): string {
  switch (kind) {
    case "search":    return "search";
    case "screen":    return "evidence";
    case "fulltext":  return "pub";
    case "extract":   return "evidence";
    case "rob":       return "agent";
    case "synthesis": return "graph";
    case "done":      return "check";
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
function robChipStyle(r: string): React.CSSProperties {
  const v = r.toLowerCase();
  if (v.includes("low"))   return { borderColor: "var(--bkb-agent)", color: "var(--bkb-agent)" };
  if (v.includes("high"))  return { borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" };
  if (v.includes("some") || v.includes("moderate"))
    return { borderColor: "var(--bkb-publication)", color: "var(--bkb-publication)" };
  return {};
}
function certaintyStyle(c: string): React.CSSProperties {
  const v = (c || "").toLowerCase();
  if (v.includes("very low")) return { borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" };
  if (v.includes("low"))      return { borderColor: "var(--bkb-publication)", color: "var(--bkb-publication)" };
  if (v.includes("high"))     return { borderColor: "var(--bkb-agent)", color: "var(--bkb-agent)" };
  if (v.includes("moderate")) return { borderColor: "var(--bkb-primary)", color: "var(--bkb-primary)" };
  return {};
}
