"use client";

/**
 * /user/synth-scholar — SynthScholar (PRISMA-guided literature review).
 *
 * Three panes: a "Start review" form on the left, a list of the user's
 * reviews in the middle, and a detail / live-progress pane on the right.
 * Live progress streams via SSE; the plan-confirmation gate (when the
 * pipeline pauses for the AI's search strategy to be approved) raises a
 * Radix dialog styled with brainkb-ui's bkb-* design tokens.
 *
 * What's intentionally out of scope vs. the source app
 * (aep-knowledge-synthesis/ui/src/pages/PRISMAReview.tsx, ~3.2K LOC):
 *   • Compare-mode reviews (multi-model side-by-side)
 *   • Search literature / search reviews tabs
 *   • Detailed visualisations of charting rubrics, narrative tables,
 *     critical-appraisal domains, GRADE assessments
 *   • Most export formats beyond markdown / json
 *   • Per-group analysis browser
 * The backend supports all of these (see core/synth_scholar/routes.py); the
 * UI is a focused subset that covers the protocol → pipeline → results
 * happy path. Extend by adding panels here that read from `useReview()`.
 */

import React from "react";
import { FONTS, Icon } from "@/src/app/components/design-system";
import {
  useReviews,
  useReview,
  useCreateReview,
  useCreateCompareReview,
  useDeleteReview,
  useCancelReview,
  useRetryReview,
  usePlanResponse,
  useProgressStream,
  useExportReview,
} from "@/src/hooks/useSynthScholar";
import { resolveOpenRouterKey } from "@/src/app/components/user/useApiKeyValidator";
import type {
  ReviewPlan,
  ReviewStatus,
  ReviewSummary,
  RunReviewRequest,
} from "@/src/types/synthScholar";
import { PlanConfirmDialog } from "@/src/app/components/synth-scholar/PlanConfirmDialog";

const DEFAULT_MODELS = [
  "anthropic/claude-opus-4.7",
  "anthropic/claude-opus-4.6",
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-opus-4",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-haiku-4-5",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-4.1",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "x-ai/grok-4.20",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-r1",
  "qwen/qwen3-max-thinking",
  "meta-llama/llama-4-maverick",
];

const ROB_TOOLS = [
  "RoB 2", "Jadad Scale", "ROBINS-I", "ROBINS-E", "Newcastle-Ottawa Scale",
  "QUADAS-2", "CASP Qualitative Checklist", "JBI Critical Appraisal",
  "Murad Tool", "SYRCLE", "MINORS", "ROBIS",
];

const ALL_DATABASES: Array<{ id: string; label: string }> = [
  { id: "pubmed", label: "PubMed" },
  { id: "biorxiv", label: "bioRxiv" },
  { id: "medrxiv", label: "medRxiv" },
  { id: "europe_pmc", label: "Europe PMC" },
  { id: "openalex", label: "OpenAlex" },
  { id: "crossref", label: "CrossRef" },
  { id: "doaj", label: "DOAJ" },
  { id: "semantic_scholar", label: "Semantic Scholar" },
  { id: "arxiv", label: "arXiv" },
  { id: "core", label: "CORE" },
];

const SYNTHESIS_STYLES: Array<{ id: "paragraph" | "question_answer" | "bullet_list" | "table"; label: string }> = [
  { id: "paragraph", label: "Paragraph" },
  { id: "question_answer", label: "Q & A" },
  { id: "bullet_list", label: "Bullet list" },
  { id: "table", label: "Table" },
];

// ── Status chip ─────────────────────────────────────────────────────

function StatusChip({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { label: string; color: string }> = {
    pending:      { label: "pending",      color: "var(--bkb-textMuted)" },
    plan_pending: { label: "plan review",  color: "var(--bkb-publication)" },
    running:      { label: "running",      color: "var(--bkb-accent)" },
    completed:    { label: "completed",    color: "var(--bkb-agent)" },
    failed:       { label: "failed",       color: "var(--bkb-danger)" },
    cancelled:    { label: "cancelled",    color: "var(--bkb-textSubtle)" },
  };
  const { label, color } = map[status];
  return (
    <span className="bkb-chip" style={{ fontSize: 10, borderColor: color, color }}>
      {label}
    </span>
  );
}

// ── Start review form ──────────────────────────────────────────────

interface StartFormState {
  // Protocol — basics
  title: string;
  objective: string;
  pico_population: string;
  pico_intervention: string;
  pico_comparison: string;
  pico_outcome: string;
  inclusion_criteria: string;
  exclusion_criteria: string;
  // Protocol — search strategy
  databases: string[];
  date_range_start: string;
  date_range_end: string;
  max_hops: number;
  // Protocol — registration / disclosures
  registration_number: string;
  protocol_url: string;
  funding_sources: string;
  competing_interests: string;
  // Protocol — RoB & charting
  rob_tool: string;
  charting_questions_text: string; // newline-separated → string[]
  appraisal_domains_text: string;  // newline-separated → string[]
  // Protocol — per-group analysis
  grouping_dimension: string;
  default_group_questions_text: string; // newline-separated → string[]
  /** Structured per-group overrides — built up via "+ Add group" / "+ Add
   *  question" UI. Empty rows (blank label or all questions blank) are
   *  dropped on submit. Converted to `Record<string, string[]>` for the API. */
  per_group_questions: Array<{ label: string; questions: string[] }>;
  // Run config
  model: string;
  compare_mode: boolean;
  compare_models: string[]; // multi-select for compare-mode
  consensus_model: string;
  max_results_per_query: number;
  related_depth: number;
  biorxiv_days: number;
  max_articles: number | null;
  concurrency: number;
  max_plan_iterations: number;
  output_synthesis_style: "paragraph" | "question_answer" | "bullet_list" | "table";
  enable_cache: boolean;
  extract_data: boolean;
  data_items_text: string; // newline-separated → string[]
  auto_confirm: boolean;
}

const INITIAL_FORM: StartFormState = {
  title: "",
  objective: "",
  pico_population: "",
  pico_intervention: "",
  pico_comparison: "",
  pico_outcome: "",
  inclusion_criteria: "",
  exclusion_criteria: "",
  databases: ["pubmed", "biorxiv", "medrxiv", "europe_pmc", "openalex", "crossref", "doaj", "semantic_scholar", "arxiv", "core"],
  date_range_start: "",
  date_range_end: "",
  max_hops: 1,
  registration_number: "",
  protocol_url: "",
  funding_sources: "",
  competing_interests: "",
  rob_tool: "RoB 2",
  charting_questions_text: "",
  appraisal_domains_text: "",
  grouping_dimension: "disorder_cohort",
  default_group_questions_text: "",
  per_group_questions: [],
  model: DEFAULT_MODELS[0],
  compare_mode: false,
  compare_models: [],
  consensus_model: "",
  max_results_per_query: 20,
  related_depth: 1,
  biorxiv_days: 180,
  max_articles: null,
  concurrency: 5,
  max_plan_iterations: 3,
  output_synthesis_style: "paragraph",
  enable_cache: true,
  extract_data: true,
  data_items_text: "",
  auto_confirm: true,
};

function _splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function StartReviewForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [form, setForm] = React.useState<StartFormState>(INITIAL_FORM);
  const [keyStatus, setKeyStatus] = React.useState<{ source: "personal" | "shared" | "none"; checked: boolean }>({ source: "none", checked: false });
  const [openSections, setOpenSections] = React.useState({ protocol: true, search: false, metadata: false, rob: false, group: false, run: false });
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const create = useCreateReview();
  const createCompare = useCreateCompareReview();

  // Probe the resolved OpenRouter key on mount + whenever the form opens —
  // surfaces "no key configured" before the user fills in 25 fields and hits
  // Submit.
  React.useEffect(() => {
    let cancelled = false;
    resolveOpenRouterKey().then((r) => {
      if (cancelled) return;
      setKeyStatus({ source: r.source, checked: true });
    });
    return () => { cancelled = true; };
  }, []);

  const update = <K extends keyof StartFormState>(k: K, v: StartFormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));
  const toggleSection = (k: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));
  const toggleDb = (id: string) =>
    setForm((s) => ({
      ...s,
      databases: s.databases.includes(id) ? s.databases.filter((d) => d !== id) : [...s.databases, id],
    }));
  const toggleCompareModel = (id: string) =>
    setForm((s) => ({
      ...s,
      compare_models: s.compare_models.includes(id)
        ? s.compare_models.filter((m) => m !== id)
        : [...s.compare_models, id],
    }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!form.title.trim()) return;
    if (form.compare_mode && (form.compare_models.length < 2 || form.compare_models.length > 5)) {
      setSubmitError("Compare mode requires between 2 and 5 models.");
      return;
    }

    // Resolve the OpenRouter key right before submit so a key the user
    // pasted in another tab is picked up without remounting this form.
    const { key } = await resolveOpenRouterKey();
    if (!key) {
      setSubmitError(
        "No OpenRouter API key available. Configure one in the dashboard's API key tab, or ask an admin to set the shared key.",
      );
      return;
    }

    // Build the per-group overrides record from the structured form state.
    // Drop entries with blank labels and trim each question; an entry with no
    // remaining questions after trimming is dropped too.
    const perGroup: Record<string, string[]> = {};
    for (const grp of form.per_group_questions) {
      const label = grp.label.trim();
      if (!label) continue;
      const qs = grp.questions.map((q) => q.trim()).filter(Boolean);
      if (qs.length === 0) continue;
      perGroup[label] = qs;
    }

    const protocol = {
      title: form.title.trim(),
      objective: form.objective.trim() || form.title.trim(),
      pico_population: form.pico_population,
      pico_intervention: form.pico_intervention,
      pico_comparison: form.pico_comparison,
      pico_outcome: form.pico_outcome,
      inclusion_criteria: form.inclusion_criteria,
      exclusion_criteria: form.exclusion_criteria,
      databases: form.databases,
      date_range_start: form.date_range_start,
      date_range_end: form.date_range_end,
      max_hops: form.max_hops,
      registration_number: form.registration_number,
      protocol_url: form.protocol_url,
      funding_sources: form.funding_sources,
      competing_interests: form.competing_interests,
      rob_tool: form.rob_tool as any,
      charting_questions: _splitLines(form.charting_questions_text),
      appraisal_domains: _splitLines(form.appraisal_domains_text),
      grouping_dimension: form.grouping_dimension,
      default_group_questions: _splitLines(form.default_group_questions_text),
      per_group_questions: perGroup,
    };

    const runConfig = {
      max_results_per_query: form.max_results_per_query,
      related_depth: form.related_depth,
      biorxiv_days: form.biorxiv_days,
      enable_cache: form.enable_cache,
      extract_data: form.extract_data,
      data_items: _splitLines(form.data_items_text),
      auto_confirm: form.auto_confirm,
      max_plan_iterations: form.max_plan_iterations,
      output_synthesis_style: form.output_synthesis_style,
      max_articles: form.max_articles,
      concurrency: form.concurrency,
      openrouter_api_key: key,
    };

    try {
      if (form.compare_mode) {
        const created = await createCompare.mutateAsync({
          protocol,
          compare_models: form.compare_models,
          consensus_model: form.consensus_model || undefined,
          ...runConfig,
        });
        onCreated(created.review_id);
      } else {
        const req: RunReviewRequest = { protocol, model: form.model, ...runConfig };
        const created = await create.mutateAsync(req);
        onCreated(created.review_id);
      }
      setForm(INITIAL_FORM);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  const isSubmitting = create.isPending || createCompare.isPending;

  return (
    <form onSubmit={submit} className="bkb-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, margin: 0, letterSpacing: "-0.01em", fontWeight: 400 }}>
          Start a new review
        </h2>
        <div style={{ fontSize: 12, color: "var(--bkb-textMuted)", marginTop: 4 }}>
          Configure protocol, search strategy, and run options. Sections are collapsible.
        </div>
      </div>

      {/* OpenRouter key status banner */}
      <ApiKeyBanner status={keyStatus} />

      {/* ── Protocol — basics ─────────────────────────── */}
      <Section title="Protocol — basics" open={openSections.protocol} onToggle={() => toggleSection("protocol")}>
        <Field label="Title" required>
          <input
            className="bkb-input"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Efficacy of CRISPR therapies in monogenic disorders"
          />
        </Field>
        <Field label="Objective (optional)">
          <input
            className="bkb-input"
            value={form.objective}
            onChange={(e) => update("objective", e.target.value)}
            placeholder="Defaults to title if blank"
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="P – Population">
            <input className="bkb-input" value={form.pico_population} onChange={(e) => update("pico_population", e.target.value)} />
          </Field>
          <Field label="I – Intervention">
            <input className="bkb-input" value={form.pico_intervention} onChange={(e) => update("pico_intervention", e.target.value)} />
          </Field>
          <Field label="C – Comparison">
            <input className="bkb-input" value={form.pico_comparison} onChange={(e) => update("pico_comparison", e.target.value)} />
          </Field>
          <Field label="O – Outcome">
            <input className="bkb-input" value={form.pico_outcome} onChange={(e) => update("pico_outcome", e.target.value)} />
          </Field>
        </div>
        <Field label="Inclusion criteria">
          <textarea className="bkb-input" rows={2} value={form.inclusion_criteria} onChange={(e) => update("inclusion_criteria", e.target.value)} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
        <Field label="Exclusion criteria">
          <textarea className="bkb-input" rows={2} value={form.exclusion_criteria} onChange={(e) => update("exclusion_criteria", e.target.value)} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
      </Section>

      {/* ── Search strategy ─────────────────────────── */}
      <Section title="Search strategy" open={openSections.search} onToggle={() => toggleSection("search")}>
        <Field label="Databases (toggle each one)">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_DATABASES.map((db) => {
              const on = form.databases.includes(db.id);
              return (
                <button
                  type="button"
                  key={db.id}
                  className="bkb-chip"
                  onClick={() => toggleDb(db.id)}
                  style={{
                    cursor: "pointer",
                    borderColor: on ? "var(--bkb-primary)" : "var(--bkb-border)",
                    color: on ? "var(--bkb-primary)" : "var(--bkb-textMuted)",
                    background: on ? "color-mix(in oklch, var(--bkb-primary), transparent 92%)" : "transparent",
                  }}
                >
                  {on && <Icon name="check" size={10} />} {db.label}
                </button>
              );
            })}
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Date range start (YYYY-MM-DD)">
            <input className="bkb-input" value={form.date_range_start} onChange={(e) => update("date_range_start", e.target.value)} placeholder="2019-01-01" />
          </Field>
          <Field label="Date range end (YYYY-MM-DD)">
            <input className="bkb-input" value={form.date_range_end} onChange={(e) => update("date_range_end", e.target.value)} placeholder="2024-12-31" />
          </Field>
          <Field label="Citation hops">
            <input type="number" className="bkb-input" min={0} max={10} value={form.max_hops} onChange={(e) => update("max_hops", Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
          </Field>
        </div>
      </Section>

      {/* ── Registration & disclosures ─────────────── */}
      <Section title="Registration & disclosures" open={openSections.metadata} onToggle={() => toggleSection("metadata")}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Registration number (e.g. PROSPERO)">
            <input className="bkb-input" value={form.registration_number} onChange={(e) => update("registration_number", e.target.value)} />
          </Field>
          <Field label="Protocol URL">
            <input className="bkb-input" value={form.protocol_url} onChange={(e) => update("protocol_url", e.target.value)} />
          </Field>
        </div>
        <Field label="Funding sources">
          <textarea className="bkb-input" rows={2} value={form.funding_sources} onChange={(e) => update("funding_sources", e.target.value)} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
        <Field label="Competing interests">
          <textarea className="bkb-input" rows={2} value={form.competing_interests} onChange={(e) => update("competing_interests", e.target.value)} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
      </Section>

      {/* ── Risk-of-bias & charting ───────────────── */}
      <Section title="Risk-of-bias & charting" open={openSections.rob} onToggle={() => toggleSection("rob")}>
        <Field label="Risk-of-bias tool">
          <select className="bkb-input" value={form.rob_tool} onChange={(e) => update("rob_tool", e.target.value)}>
            {ROB_TOOLS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Charting questions (one per line)">
          <textarea className="bkb-input" rows={3} value={form.charting_questions_text} onChange={(e) => update("charting_questions_text", e.target.value)} placeholder={"What population was studied?\nWhat outcomes were measured?"} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
        <Field label="Critical-appraisal domains (one per line)">
          <textarea className="bkb-input" rows={3} value={form.appraisal_domains_text} onChange={(e) => update("appraisal_domains_text", e.target.value)} placeholder={"Sample size justification\nBlinding\nLoss to follow-up"} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
      </Section>

      {/* ── Per-group analysis ─────────────────────── */}
      <Section title="Per-group analysis" open={openSections.group} onToggle={() => toggleSection("group")}>
        <Field label="Grouping dimension (DataChartingRubric attribute)">
          <input className="bkb-input" value={form.grouping_dimension} onChange={(e) => update("grouping_dimension", e.target.value)} placeholder="disorder_cohort" />
        </Field>
        <Field label="Default per-group questions (one per line, max 10)">
          <textarea className="bkb-input" rows={3} value={form.default_group_questions_text} onChange={(e) => update("default_group_questions_text", e.target.value)} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>
        <PerGroupQuestionsEditor
          groups={form.per_group_questions}
          onChange={(groups) => update("per_group_questions", groups)}
        />
      </Section>

      {/* ── Run configuration ─────────────────────── */}
      <Section title="Run configuration" open={openSections.run} onToggle={() => toggleSection("run")}>
        <Field label="Mode">
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="bkb-chip" onClick={() => update("compare_mode", false)} style={{ cursor: "pointer", borderColor: !form.compare_mode ? "var(--bkb-primary)" : "var(--bkb-border)", color: !form.compare_mode ? "var(--bkb-primary)" : "var(--bkb-textMuted)" }}>
              Single model
            </button>
            <button type="button" className="bkb-chip" onClick={() => update("compare_mode", true)} style={{ cursor: "pointer", borderColor: form.compare_mode ? "var(--bkb-primary)" : "var(--bkb-border)", color: form.compare_mode ? "var(--bkb-primary)" : "var(--bkb-textMuted)" }}>
              Compare 2–5 models
            </button>
          </div>
        </Field>

        {!form.compare_mode ? (
          <Field label="Model">
            <select className="bkb-input" value={form.model} onChange={(e) => update("model", e.target.value)}>
              {DEFAULT_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label={`Compare models (pick 2 to 5 — ${form.compare_models.length} selected)`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {DEFAULT_MODELS.map((m) => {
                  const on = form.compare_models.includes(m);
                  return (
                    <button
                      type="button"
                      key={m}
                      className="bkb-chip"
                      onClick={() => toggleCompareModel(m)}
                      style={{
                        cursor: "pointer",
                        fontSize: 10,
                        borderColor: on ? "var(--bkb-primary)" : "var(--bkb-border)",
                        color: on ? "var(--bkb-primary)" : "var(--bkb-textMuted)",
                      }}
                    >
                      {on && <Icon name="check" size={9} />} {m}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Consensus model (defaults to first compare model)">
              <select className="bkb-input" value={form.consensus_model} onChange={(e) => update("consensus_model", e.target.value)}>
                <option value="">— first compare model —</option>
                {form.compare_models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
          </>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Max results per query">
            <input type="number" className="bkb-input" min={5} max={1000} value={form.max_results_per_query} onChange={(e) => update("max_results_per_query", Math.max(5, Math.min(1000, Number(e.target.value) || 20)))} />
          </Field>
          <Field label="Related-articles depth">
            <input type="number" className="bkb-input" min={0} max={10} value={form.related_depth} onChange={(e) => update("related_depth", Math.max(0, Math.min(10, Number(e.target.value) || 0)))} />
          </Field>
          <Field label="bioRxiv lookback (days)">
            <input type="number" className="bkb-input" min={30} max={730} value={form.biorxiv_days} onChange={(e) => update("biorxiv_days", Math.max(30, Math.min(730, Number(e.target.value) || 180)))} />
          </Field>
          <Field label="Max articles (cap, blank = no cap)">
            <input type="number" className="bkb-input" min={10} max={10000} value={form.max_articles ?? ""} onChange={(e) => update("max_articles", e.target.value ? Math.max(10, Math.min(10000, Number(e.target.value))) : null)} />
          </Field>
          <Field label="Concurrency">
            <input type="number" className="bkb-input" min={1} max={50} value={form.concurrency} onChange={(e) => update("concurrency", Math.max(1, Math.min(50, Number(e.target.value) || 5)))} />
          </Field>
          <Field label="Max plan iterations">
            <input type="number" className="bkb-input" min={1} max={10} value={form.max_plan_iterations} onChange={(e) => update("max_plan_iterations", Math.max(1, Math.min(10, Number(e.target.value) || 3)))} />
          </Field>
        </div>

        <Field label="Synthesis style">
          <select className="bkb-input" value={form.output_synthesis_style} onChange={(e) => update("output_synthesis_style", e.target.value as StartFormState["output_synthesis_style"])}>
            {SYNTHESIS_STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Data-extraction items (one per line; leave empty for default set)">
          <textarea className="bkb-input" rows={3} value={form.data_items_text} onChange={(e) => update("data_items_text", e.target.value)} style={{ fontFamily: FONTS.body, resize: "vertical" }} />
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Toggle label="Enable cache (re-use cached articles + LLM responses)" checked={form.enable_cache} onChange={(v) => update("enable_cache", v)} />
          <Toggle label="Extract data (run data-charting + appraisal phases)" checked={form.extract_data} onChange={(v) => update("extract_data", v)} />
          <Toggle label="Pause for me to review the search strategy before running" checked={!form.auto_confirm} onChange={(v) => update("auto_confirm", !v)} />
        </div>
      </Section>

      {(submitError || create.error || createCompare.error) && (
        <div style={{ fontSize: 12, color: "var(--bkb-danger)" }}>
          {submitError ?? (create.error as Error | null)?.message ?? (createCompare.error as Error | null)?.message}
        </div>
      )}

      <button
        type="submit"
        className="bkb-btn bkb-btn-primary"
        disabled={isSubmitting || !form.title.trim() || (form.compare_mode && form.compare_models.length < 2)}
        style={{ alignSelf: "flex-start" }}
      >
        <Icon name="agent" size={12} /> {isSubmitting ? "Starting…" : "Start review"}
      </button>
    </form>
  );
}

function PerGroupQuestionsEditor({
  groups,
  onChange,
}: {
  groups: Array<{ label: string; questions: string[] }>;
  onChange: (groups: Array<{ label: string; questions: string[] }>) => void;
}) {
  const addGroup = () => onChange([...groups, { label: "", questions: [""] }]);
  const removeGroup = (i: number) => onChange(groups.filter((_, idx) => idx !== i));
  const updateLabel = (i: number, label: string) =>
    onChange(groups.map((g, idx) => (idx === i ? { ...g, label } : g)));
  const addQuestion = (i: number) =>
    onChange(groups.map((g, idx) => (idx === i ? { ...g, questions: [...g.questions, ""] } : g)));
  const updateQuestion = (gi: number, qi: number, value: string) =>
    onChange(
      groups.map((g, idx) =>
        idx === gi ? { ...g, questions: g.questions.map((q, qIdx) => (qIdx === qi ? value : q)) } : g,
      ),
    );
  const removeQuestion = (gi: number, qi: number) =>
    onChange(
      groups.map((g, idx) =>
        idx === gi ? { ...g, questions: g.questions.filter((_, qIdx) => qIdx !== qi) } : g,
      ),
    );

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 6 }}>
        Per-group question overrides (capped at 10 questions per group)
      </div>
      {groups.length === 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--bkb-textSubtle)",
            padding: 10,
            border: "1px dashed var(--bkb-border)",
            borderRadius: 6,
            marginBottom: 6,
          }}
        >
          No overrides — every group will get the default questions above.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map((g, gi) => (
          <div
            key={gi}
            style={{
              padding: 10,
              border: "1px solid var(--bkb-border)",
              borderRadius: 6,
              background: "var(--bkb-surface)",
            }}
          >
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <input
                className="bkb-input"
                placeholder="Group label (e.g. Adolescents)"
                value={g.label}
                onChange={(e) => updateLabel(gi, e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="bkb-btn bkb-btn-ghost"
                onClick={() => removeGroup(gi)}
                style={{ padding: "4px 8px", borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" }}
                title="Remove this group"
              >
                <Icon name="x" size={11} /> Remove group
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {g.questions.map((q, qi) => (
                <div key={qi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    className="bkb-input"
                    placeholder={`Question ${qi + 1} for "${g.label || "this group"}"`}
                    value={q}
                    onChange={(e) => updateQuestion(gi, qi, e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="bkb-btn bkb-btn-ghost"
                    onClick={() => removeQuestion(gi, qi)}
                    disabled={g.questions.length <= 1}
                    style={{ padding: "4px 8px", color: "var(--bkb-textMuted)" }}
                    title={g.questions.length <= 1 ? "At least one question required" : "Remove question"}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="bkb-btn bkb-btn-ghost"
              onClick={() => addQuestion(gi)}
              disabled={g.questions.length >= 10}
              style={{ padding: "4px 8px", marginTop: 8, fontSize: 11 }}
              title={g.questions.length >= 10 ? "Capped at 10 questions per group" : "Add another question"}
            >
              <Icon name="plus" size={10} /> Add question
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="bkb-btn bkb-btn-ghost"
        onClick={addGroup}
        style={{ padding: "4px 10px", marginTop: 8 }}
      >
        <Icon name="plus" size={11} /> Add group
      </button>
    </div>
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--bkb-border)", borderRadius: 6 }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          background: open ? "var(--bkb-surfaceAlt)" : "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 500,
          fontFamily: FONTS.body,
        }}
      >
        <span>{title}</span>
        <Icon name="arrow" size={11} />
      </button>
      {open && (
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--bkb-textMuted)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ApiKeyBanner({ status }: { status: { source: "personal" | "shared" | "none"; checked: boolean } }) {
  if (!status.checked) return null;
  if (status.source === "none") {
    return (
      <div
        style={{
          padding: 10,
          borderRadius: 6,
          background: "color-mix(in oklch, var(--bkb-danger), transparent 92%)",
          border: "1px solid color-mix(in oklch, var(--bkb-danger), transparent 70%)",
          fontSize: 12,
          color: "var(--bkb-danger)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name="lock" size={11} />
        No OpenRouter API key found — set one on the dashboard&apos;s <span className="bkb-mono">API key</span> tab,
        or ask an admin to configure the shared key. The pipeline can&apos;t run without it.
      </div>
    );
  }
  const label = status.source === "personal" ? "personal" : "admin shared";
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 6,
        background: "color-mix(in oklch, var(--bkb-accent), transparent 92%)",
        border: "1px solid color-mix(in oklch, var(--bkb-accent), transparent 70%)",
        fontSize: 12,
        color: "var(--bkb-text)",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Icon name="check" size={11} />
      Using <strong>{label}</strong> OpenRouter key for this run.
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>
        {label} {required && <span style={{ color: "var(--bkb-danger)" }}>*</span>}
      </span>
      {children}
    </label>
  );
}

// ── Reviews list ───────────────────────────────────────────────────

function ReviewsList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const reviews = useReviews();

  return (
    <div className="bkb-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bkb-border)" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>Your reviews</div>
        <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 2 }}>
          {reviews.isLoading ? "Loading…" : `${reviews.data?.length ?? 0} entries`}
        </div>
      </div>
      <div style={{ maxHeight: 540, overflowY: "auto" }} className="bkb-scroll">
        {reviews.error && (
          <div style={{ padding: 14, fontSize: 12, color: "var(--bkb-danger)" }}>
            {(reviews.error as Error).message}
          </div>
        )}
        {reviews.data?.length === 0 && !reviews.isLoading && (
          <div style={{ padding: 14, fontSize: 12, color: "var(--bkb-textMuted)" }}>
            No reviews yet — start one from the form on the left.
          </div>
        )}
        {reviews.data?.map((r) => (
          <ReviewListItem key={r.review_id} review={r} active={r.review_id === selectedId} onClick={() => onSelect(r.review_id)} />
        ))}
      </div>
    </div>
  );
}

function ReviewListItem({
  review,
  active,
  onClick,
}: {
  review: ReviewSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bkb-hover-row"
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--bkb-border)",
        cursor: "pointer",
        background: active ? "var(--bkb-surfaceAlt)" : "transparent",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {review.title || "(untitled)"}
          </div>
          <div className="bkb-mono" style={{ fontSize: 10, color: "var(--bkb-textSubtle)", marginTop: 2 }}>
            {review.review_id}
          </div>
          {review.stage && (
            <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 4 }}>
              {review.stage}
              {review.stage_total != null && (
                <span style={{ marginLeft: 6, color: "var(--bkb-textSubtle)" }}>
                  {review.stage_done ?? 0}/{review.stage_total}
                </span>
              )}
            </div>
          )}
        </div>
        <StatusChip status={review.status} />
      </div>
    </div>
  );
}

// ── Detail / progress pane ────────────────────────────────────────

function ReviewDetail({ reviewId }: { reviewId: string }) {
  const detail = useReview(reviewId);
  const cancel = useCancelReview();
  const retry = useRetryReview();
  const del = useDeleteReview();
  const planResponse = usePlanResponse();
  const exportMut = useExportReview();

  const [pendingPlan, setPendingPlan] = React.useState<ReviewPlan | null>(null);
  const [planIteration, setPlanIteration] = React.useState(0);

  const isLive = detail.data
    ? ["running", "pending", "plan_pending"].includes(detail.data.status)
    : false;

  const progress = useProgressStream(
    reviewId,
    isLive,
    React.useCallback((plan: ReviewPlan) => {
      setPendingPlan(plan);
      setPlanIteration(plan.iteration);
    }, []),
  );

  // Close plan modal once the backend transitions back out of plan_pending.
  React.useEffect(() => {
    if (detail.data?.status && detail.data.status !== "plan_pending" && pendingPlan) {
      setPendingPlan(null);
    }
  }, [detail.data?.status, pendingPlan]);

  if (!detail.data && detail.isLoading) {
    return (
      <div className="bkb-card" style={{ padding: 18, fontSize: 13, color: "var(--bkb-textMuted)" }}>
        Loading review…
      </div>
    );
  }
  if (!detail.data) {
    return (
      <div className="bkb-card" style={{ padding: 18, fontSize: 13, color: "var(--bkb-textMuted)" }}>
        Select a review to see its details.
      </div>
    );
  }

  const r = detail.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div className="bkb-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
              Review
            </div>
            <h2 style={{ fontFamily: FONTS.display, fontSize: 24, margin: 0, letterSpacing: "-0.01em", fontWeight: 400 }}>
              {r.title || "(untitled)"}
            </h2>
            <div className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 6 }}>
              {r.review_id} · created {new Date(r.created_at).toLocaleString()}
            </div>
          </div>
          <StatusChip status={r.status} />
        </div>

        {/* Action row */}
        <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
          {(r.status === "running" || r.status === "pending" || r.status === "plan_pending") && (
            <button
              className="bkb-btn bkb-btn-ghost"
              onClick={() => cancel.mutate(reviewId)}
              disabled={cancel.isPending}
              style={{ borderColor: "var(--bkb-publication)", color: "var(--bkb-publication)" }}
            >
              <Icon name="x" size={11} /> Cancel
            </button>
          )}
          {(r.status === "failed" || r.status === "cancelled") && (
            <button
              className="bkb-btn bkb-btn-ghost"
              onClick={() => retry.mutate({ reviewId })}
              disabled={retry.isPending}
            >
              <Icon name="arrow" size={11} /> Retry
            </button>
          )}
          {r.status === "completed" && (
            <>
              <button
                className="bkb-btn bkb-btn-ghost"
                onClick={() => exportMut.mutate({ reviewId, format: "markdown" })}
                disabled={exportMut.isPending}
              >
                <Icon name="evidence" size={11} /> Export markdown
              </button>
              <button
                className="bkb-btn bkb-btn-ghost"
                onClick={() => exportMut.mutate({ reviewId, format: "json" })}
                disabled={exportMut.isPending}
              >
                <Icon name="evidence" size={11} /> Export JSON
              </button>
            </>
          )}
          <button
            className="bkb-btn bkb-btn-ghost"
            onClick={() => {
              if (confirm(`Delete review ${reviewId}?`)) del.mutate(reviewId);
            }}
            disabled={del.isPending || r.status === "running"}
            style={{ borderColor: "var(--bkb-danger)", color: "var(--bkb-danger)" }}
          >
            <Icon name="x" size={11} /> Delete
          </button>
        </div>

        {r.error && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 6,
              background: "color-mix(in oklch, var(--bkb-danger), transparent 92%)",
              border: "1px solid color-mix(in oklch, var(--bkb-danger), transparent 70%)",
              fontSize: 12,
              color: "var(--bkb-danger)",
            }}
          >
            {r.error}
          </div>
        )}
      </div>

      {/* Live progress — stage/counters come from the latest classified SSE
          event (set by the backend's progress_events.merge_into_state) since
          the detail endpoint doesn't echo them in its response body. */}
      {(isLive || progress.events.length > 0) && (() => {
        const latest = [...progress.events].reverse().find((e) => e.kind && e.kind !== "log") ?? progress.events[progress.events.length - 1];
        return (
        <div className="bkb-card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", marginBottom: 10 }}>
            <div>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 16, margin: 0, fontWeight: 500 }}>Progress</h3>
              <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 2 }}>
                {latest?.stage ? latest.stage : "Awaiting first event"}
                {latest?.stage_total != null && (
                  <span style={{ marginLeft: 6, color: "var(--bkb-textSubtle)" }}>
                    · step {latest.stage_done ?? 0} of {latest.stage_total}
                  </span>
                )}
              </div>
            </div>
            <span className="bkb-mono" style={{ fontSize: 11, color: "var(--bkb-textSubtle)" }}>
              {progress.step} events
            </span>
          </div>
          <div
            className="bkb-scroll"
            style={{
              maxHeight: 260,
              overflowY: "auto",
              background: "var(--bkb-surfaceAlt)",
              border: "1px solid var(--bkb-border)",
              borderRadius: 6,
              padding: 10,
            }}
          >
            {progress.events.length === 0 && (
              <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)" }}>Waiting…</div>
            )}
            {progress.events.slice(-200).map((e, i) => (
              <div
                key={i}
                className="bkb-mono"
                style={{
                  fontSize: 11,
                  color: e.kind === "stage_start" ? "var(--bkb-accent)"
                    : e.kind === "stage_done" ? "var(--bkb-agent)"
                    : "var(--bkb-textMuted)",
                  paddingBottom: 2,
                  whiteSpace: "pre-wrap",
                }}
              >
                {e.message}
              </div>
            ))}
          </div>
        </div>
        );
      })()}

      {/* Synthesis text (when done) */}
      {r.status === "completed" && (
        <>
          {r.flow && <FlowCountsCard flow={r.flow} />}
          {r.synthesis_text && (
            <div className="bkb-card" style={{ padding: 18 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 18, margin: "0 0 8px", fontWeight: 500 }}>Synthesis</h3>
              <div style={{ fontSize: 13, color: "var(--bkb-text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {r.synthesis_text}
              </div>
            </div>
          )}
          {r.included_articles.length > 0 && (
            <div className="bkb-card" style={{ padding: 18 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 18, margin: "0 0 8px", fontWeight: 500 }}>
                Included articles ({r.included_articles.length})
              </h3>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {r.included_articles.slice(0, 50).map((a) => (
                  <li key={a.pmid} style={{ paddingBottom: 8, borderBottom: "1px solid var(--bkb-border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: "var(--bkb-textMuted)" }}>
                      {a.authors} · {a.journal} · {a.year} · <span className="bkb-mono">{a.source || "—"}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {r.included_articles.length > 50 && (
                <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 8 }}>
                  Showing first 50 of {r.included_articles.length}. Use export for full list.
                </div>
              )}
            </div>
          )}
        </>
      )}

      <PlanConfirmDialog
        open={!!pendingPlan && r.status === "plan_pending"}
        plan={pendingPlan}
        iteration={planIteration}
        maxIterations={r.run_request?.max_plan_iterations ?? 3}
        isPending={planResponse.isPending}
        onApprove={() => {
          planResponse.mutate({ reviewId, body: { approved: true } });
          setPendingPlan(null);
        }}
        onRevise={(feedback) => {
          planResponse.mutate({ reviewId, body: { approved: false, feedback } });
          setPendingPlan(null);
        }}
      />
    </div>
  );
}

function FlowCountsCard({ flow }: { flow: NonNullable<ReturnType<typeof useReview>["data"]>["flow"] }) {
  if (!flow) return null;
  const cells: Array<[string, number | string]> = [
    ["Identified", flow.total_identified],
    ["After dedup", flow.after_dedup],
    ["T/A screened", flow.screened_title_abstract],
    ["Full-text sought", flow.sought_fulltext],
    ["Eligibility assessed", flow.assessed_eligibility],
    ["Included in synthesis", flow.included_synthesis],
  ];
  return (
    <div className="bkb-card" style={{ padding: 18 }}>
      <h3 style={{ fontFamily: FONTS.display, fontSize: 18, margin: "0 0 10px", fontWeight: 500 }}>PRISMA flow</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {cells.map(([label, val]) => (
          <div key={label} style={{ padding: 10, background: "var(--bkb-surfaceAlt)", borderRadius: 6 }}>
            <div style={{ fontSize: 10, color: "var(--bkb-textSubtle)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {label}
            </div>
            <div style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 400, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function SynthScholarPage() {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  return (
    <div style={{ maxWidth: 1480, margin: "0 auto", padding: "32px 32px 64px" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
          Tool
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 36, margin: 0, letterSpacing: "-0.02em", fontWeight: 400 }}>
          SynthScholar
        </h1>
        <div style={{ fontSize: 14, color: "var(--bkb-textMuted)", marginTop: 4 }}>
          Literature review (PRISMA-guided).
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(260px, 320px) minmax(420px, 2fr)", gap: 16 }}>
        <StartReviewForm onCreated={setSelectedId} />
        <ReviewsList selectedId={selectedId} onSelect={setSelectedId} />
        <div>
          {selectedId ? (
            <ReviewDetail reviewId={selectedId} />
          ) : (
            <div className="bkb-card" style={{ padding: 18, fontSize: 13, color: "var(--bkb-textMuted)" }}>
              Select a review on the left to see live progress and results.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
