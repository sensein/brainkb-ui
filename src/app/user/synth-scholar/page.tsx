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
  useSetReviewVisibility,
  useSetCacheSharing,
} from "@/src/hooks/useSynthScholar";
import { resolveOpenRouterKey } from "@/src/app/components/user/useApiKeyValidator";
import type {
  ReviewPlan,
  ReviewStatus,
  ReviewSummary,
  RunReviewRequest,
} from "@/src/types/synthScholar";
import { PlanConfirmDialog } from "@/src/app/components/synth-scholar/PlanConfirmDialog";

// OpenRouter model catalogue. Slugs use Anthropic's API-ID format (hyphens, not
// dots) — `anthropic/claude-opus-4.7` is NOT a valid OpenRouter slug; OpenRouter
// returns 401 / "User not found" instead of 404 for unknown models, so dotted
// slugs masquerade as auth failures. Keep this list trimmed to slugs we've
// confirmed OpenRouter routes; add new models only after verifying they
// appear on https://openrouter.ai/models.

interface ModelOption {
  id: string; // OpenRouter slug
  label: string; // human-readable, used in dropdown + chips
  provider: "Anthropic" | "Google" | "OpenAI" | "xAI" | "DeepSeek" | "Meta" | "Mistral";
  tag?: "Best" | "Fast" | "New";
}

const MODEL_OPTIONS: ModelOption[] = [
  // Anthropic — Claude 4.x family.
  { id: "anthropic/claude-opus-4-7",    label: "Claude Opus 4.7",   provider: "Anthropic", tag: "Best" },
  { id: "anthropic/claude-opus-4-6",    label: "Claude Opus 4.6",   provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4-6",  label: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "anthropic/claude-opus-4",      label: "Claude Opus 4",     provider: "Anthropic" },
  { id: "anthropic/claude-sonnet-4",    label: "Claude Sonnet 4",   provider: "Anthropic" },
  { id: "anthropic/claude-haiku-4-5",   label: "Claude Haiku 4.5",  provider: "Anthropic", tag: "Fast" },
  { id: "anthropic/claude-haiku-4",     label: "Claude Haiku 4",    provider: "Anthropic", tag: "Fast" },
  // Google — Gemini 2.5 / 3.1.
  { id: "google/gemini-2.5-pro",        label: "Gemini 2.5 Pro",    provider: "Google" },
  { id: "google/gemini-2.5-flash",      label: "Gemini 2.5 Flash",  provider: "Google", tag: "Fast" },
  // OpenAI — GPT-4.1 / 4o family (the slugs OpenRouter actually exposes).
  { id: "openai/gpt-4.1",               label: "GPT-4.1",           provider: "OpenAI" },
  { id: "openai/gpt-4o",                label: "GPT-4o",            provider: "OpenAI" },
  { id: "openai/gpt-4o-mini",           label: "GPT-4o mini",       provider: "OpenAI", tag: "Fast" },
  // xAI / DeepSeek / Meta / Mistral.
  { id: "x-ai/grok-2-1212",             label: "Grok 2",            provider: "xAI" },
  { id: "deepseek/deepseek-chat",       label: "DeepSeek Chat",     provider: "DeepSeek" },
  { id: "deepseek/deepseek-r1",         label: "DeepSeek R1",       provider: "DeepSeek" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", provider: "Meta" },
  { id: "mistralai/mistral-large-2411", label: "Mistral Large",     provider: "Mistral" },
];

// Convenience for quick lookup (id → option) used by chip renderers.
const MODEL_OPTIONS_BY_ID: Record<string, ModelOption> = Object.fromEntries(
  MODEL_OPTIONS.map((m) => [m.id, m]),
);

// Provider order matches the dropdown order — keeps "Anthropic" up top.
const PROVIDER_ORDER: ModelOption["provider"][] = [
  "Anthropic", "Google", "OpenAI", "xAI", "DeepSeek", "Meta", "Mistral",
];

const MODELS_BY_PROVIDER: Array<{ provider: ModelOption["provider"]; models: ModelOption[] }> =
  PROVIDER_ORDER
    .map((provider) => ({
      provider,
      models: MODEL_OPTIONS.filter((m) => m.provider === provider),
    }))
    .filter((g) => g.models.length > 0);

// Default single-model selection — Sonnet 4.6 is a sensible balance of
// quality vs. cost vs. latency. Picking the same default in INITIAL_FORM.
const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4-6";

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

// ── Pre-baked example protocols ────────────────────────────────────────
//
// Two seeded examples, both fully wired (PICO + criteria + RoB tool +
// charting + appraisal + run config). Loading an example overlays the
// form's *current* state with the example's fields, so the user can
// tweak one row before starting without losing the rest of the seed.
//
// 1. CRISPR / monogenic disorders — straightforward single-cohort review
//    that exercises the standard charting + appraisal defaults.
// 2. ADHD ML biomarkers — exercises per-group analysis: groups studies
//    by age cohort and asks tailored questions per cohort. Picks
//    QUADAS-2 (diagnostic accuracy tool) and pauses for plan review.

interface ExampleProtocol {
  id: string;
  label: string;
  description: string;
  apply: (base: StartFormState) => StartFormState;
}

const EXAMPLES: ExampleProtocol[] = [
  {
    id: "crispr",
    label: "CRISPR therapies (basic review)",
    description:
      "Single-cohort efficacy + safety review of CRISPR gene therapies. Uses the default charting questions and appraisal domains, RoB 2, no per-group analysis.",
    apply: (base) => ({
      ...base,
      title: "Efficacy and safety of CRISPR-based gene therapies in monogenic disorders",
      objective: "Evaluate clinical outcomes of CRISPR gene editing therapies in patients with monogenic disorders",
      pico_population: "Patients with monogenic disorders (sickle cell disease, β-thalassaemia, transthyretin amyloidosis, Leber congenital amaurosis, etc.)",
      pico_intervention: "CRISPR-Cas9 / Cas12 gene-editing therapy (in vivo or ex vivo)",
      pico_comparison: "Standard of care, placebo, or pre-treatment baseline",
      pico_outcome: "Clinical efficacy, safety, adverse events, durability of response",
      inclusion_criteria:
        "Clinical trials in human subjects (Phase I–III); English-language; published 2019 onwards; reports primary or secondary clinical outcomes.",
      exclusion_criteria:
        "Animal-only studies; in-vitro / cell-line studies; narrative reviews and editorials; conference abstracts without full text.",
      date_range_start: "2019-01-01",
      date_range_end: "",
      rob_tool: "RoB 2",
      auto_confirm: false, // surface the plan-confirmation UX so the user sees how it works
    }),
  },
  {
    id: "adhd-cohort",
    label: "ADHD ML biomarkers (per-cohort grouping)",
    description:
      "Diagnostic review with disorder-cohort grouping: children vs adolescents vs adults, each with tailored questions. Uses QUADAS-2 (diagnostic-accuracy tool).",
    apply: (base) => ({
      ...base,
      title: "Machine learning biomarkers for ADHD diagnosis",
      objective: "Evaluate ML-based biomarkers (EEG, fMRI, behavioural) for ADHD diagnosis across age cohorts",
      pico_population: "Individuals with a clinical diagnosis of Attention-Deficit / Hyperactivity Disorder",
      pico_intervention: "Machine-learning classifiers trained on neuroimaging, EEG, eye-tracking, or behavioural data",
      pico_comparison: "Healthy controls or DSM-based clinician diagnosis",
      pico_outcome: "Diagnostic accuracy, sensitivity, specificity, AUC; subgroup performance by age",
      inclusion_criteria:
        "Studies with DSM-5 / ICD-11 confirmed ADHD diagnosis; reports a quantitative ML classification result; English language; peer-reviewed.",
      exclusion_criteria:
        "Reviews, case reports, animal studies, theses, editorials; studies that conflate ADHD with other neurodevelopmental conditions without separating results.",
      date_range_start: "2015-01-01",
      date_range_end: "",
      rob_tool: "QUADAS-2",
      // Group studies by the chartingrubric's `disorder_cohort` attribute, then
      // ask each group both the default cross-cohort questions and the
      // per-cohort overrides below.
      grouping_dimension: "disorder_cohort",
      default_group_questions_text: [
        "What was the sample size for this cohort?",
        "Which ML algorithm performed best, and what was its AUC / accuracy?",
        "Which features were most predictive of ADHD diagnosis?",
      ].join("\n"),
      per_group_questions: [
        {
          label: "Children (under 12)",
          questions: [
            "Were developmental and age-appropriate task designs used?",
            "How was comorbidity (autism, learning disorders) handled in the sample?",
          ],
        },
        {
          label: "Adolescents (12-17)",
          questions: [
            "Was puberty / hormonal stage controlled for or reported?",
            "What proportion of the sample was on stimulant medication during data collection?",
          ],
        },
        {
          label: "Adults (18+)",
          questions: [
            "How was first-time-in-adulthood diagnosis differentiated from childhood-onset persistence?",
            "Were comorbid mood / anxiety disorders documented?",
          ],
        },
      ],
      auto_confirm: false,
    }),
  },
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
  /** Questions the data-charting agent answers per included study. Seeded
   *  with five sensible defaults matching the AEP UI; users add/remove rows
   *  via the inline editor. */
  charting_questions: string[];
  /** Critical-appraisal domains, capped at 4 per the agent's prompt budget.
   *  Seeded with the four-domain rubric used by the AEP knowledge-synthesis
   *  workflow. */
  appraisal_domains: string[];
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
  charting_questions: [
    "What is the primary disorder or clinical population studied?",
    "What features or biomarkers were extracted and analysed?",
    "What machine learning models or algorithms were applied?",
    "What were the key performance metrics and results?",
    "What datasets or data collection methods were used?",
  ],
  appraisal_domains: [
    "Participant and Sample Quality",
    "Data Collection Quality",
    "Feature and Model Quality",
    "Bias and Transparency",
  ],
  grouping_dimension: "disorder_cohort",
  default_group_questions_text: "",
  per_group_questions: [],
  model: DEFAULT_MODEL_ID,
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
      // Drop blank rows; trim whitespace.
      charting_questions: form.charting_questions.map((q) => q.trim()).filter(Boolean),
      appraisal_domains: form.appraisal_domains.map((d) => d.trim()).filter(Boolean),
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

      {/* Load-example shortcut. Pre-fills the form with one of the seeded
          protocols so the user can hit Start right away or tweak one field
          without rebuilding the whole config. */}
      <div
        style={{
          padding: 10,
          border: "1px dashed var(--bkb-border)",
          borderRadius: 6,
          background: "var(--bkb-surfaceAlt)",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", marginBottom: 6 }}>
          Load an example
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => {
                setForm((s) => ex.apply(s));
                // Open the sections that the example actually populates so the
                // user can see what was filled in without hunting.
                setOpenSections({
                  protocol: true,
                  search: true,
                  metadata: false,
                  rob: true,
                  group: ex.id === "adhd-cohort",
                  run: true,
                });
                setSubmitError(null);
              }}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                background: "var(--bkb-surface)",
                border: "1px solid var(--bkb-border)",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: FONTS.body,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--bkb-text)" }}>{ex.label}</div>
              <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginTop: 2, lineHeight: 1.4 }}>
                {ex.description}
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setForm(INITIAL_FORM);
              setOpenSections({ protocol: true, search: false, metadata: false, rob: false, group: false, run: false });
              setSubmitError(null);
            }}
            style={{
              alignSelf: "flex-start",
              fontSize: 11,
              color: "var(--bkb-textMuted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginTop: 2,
            }}
          >
            Reset to blank form
          </button>
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
        <StringListEditor
          label="Charting Questions"
          description="Questions the agent will answer for each included study during data extraction."
          items={form.charting_questions}
          onChange={(items) => update("charting_questions", items)}
          placeholder="e.g. What outcomes were measured?"
          addLabel="Add question"
        />
        <StringListEditor
          label="Appraisal Domains"
          description="Critical appraisal domains used to assess study quality (max 4)."
          items={form.appraisal_domains}
          onChange={(items) => update("appraisal_domains", items)}
          placeholder="e.g. Sample size justification"
          addLabel="Add domain"
          max={4}
        />
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
              {MODELS_BY_PROVIDER.map(({ provider, models }) => (
                <optgroup key={provider} label={provider}>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                      {m.tag ? ` — ${m.tag}` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label={`Compare models (pick 2 to 5 — ${form.compare_models.length} selected)`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {MODELS_BY_PROVIDER.map(({ provider, models }) => (
                  <div key={provider}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--bkb-textSubtle)",
                        marginBottom: 4,
                      }}
                    >
                      {provider}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {models.map((m) => {
                        const on = form.compare_models.includes(m.id);
                        return (
                          <button
                            type="button"
                            key={m.id}
                            className="bkb-chip"
                            onClick={() => toggleCompareModel(m.id)}
                            title={m.id}
                            style={{
                              cursor: "pointer",
                              fontSize: 10,
                              borderColor: on ? "var(--bkb-primary)" : "var(--bkb-border)",
                              color: on ? "var(--bkb-primary)" : "var(--bkb-textMuted)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {on && <Icon name="check" size={9} />}
                            {m.label}
                            {m.tag && (
                              <span
                                style={{
                                  fontSize: 8,
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                  background:
                                    m.tag === "Best"
                                      ? "color-mix(in oklch, var(--bkb-accent), transparent 80%)"
                                      : m.tag === "Fast"
                                        ? "color-mix(in oklch, var(--bkb-publication), transparent 80%)"
                                        : "color-mix(in oklch, var(--bkb-agent), transparent 80%)",
                                  color:
                                    m.tag === "Best"
                                      ? "var(--bkb-accent)"
                                      : m.tag === "Fast"
                                        ? "var(--bkb-publication)"
                                        : "var(--bkb-agent)",
                                }}
                              >
                                {m.tag}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Consensus model (defaults to first compare model)">
              <select
                className="bkb-input"
                value={form.consensus_model}
                onChange={(e) => update("consensus_model", e.target.value)}
              >
                <option value="">— first compare model —</option>
                {form.compare_models.map((id) => {
                  const opt = MODEL_OPTIONS_BY_ID[id];
                  return (
                    <option key={id} value={id}>
                      {opt ? `${opt.provider} · ${opt.label}` : id}
                    </option>
                  );
                })}
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

function StringListEditor({
  label,
  description,
  items,
  onChange,
  placeholder,
  addLabel,
  max,
}: {
  label: string;
  description?: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel: string;
  max?: number;
}) {
  const add = () => onChange([...items, ""]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, value: string) =>
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  const atCap = max != null && items.length >= max;

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{label}</div>
      {description && (
        <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", marginBottom: 8 }}>
          {description}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.length === 0 && (
          <div
            style={{
              fontSize: 11,
              color: "var(--bkb-textSubtle)",
              padding: 10,
              border: "1px dashed var(--bkb-border)",
              borderRadius: 6,
            }}
          >
            No entries yet — click {addLabel.toLowerCase()} below to add one.
          </div>
        )}
        {items.map((value, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--bkb-surfaceAlt)",
              border: "1px solid var(--bkb-border)",
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            <input
              className="bkb-input"
              placeholder={placeholder}
              value={value}
              onChange={(e) => updateItem(i, e.target.value)}
              style={{ flex: 1, border: "none", background: "transparent", padding: "4px 0" }}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              title="Remove"
              style={{
                border: "none",
                background: "transparent",
                color: "var(--bkb-textMuted)",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="bkb-btn bkb-btn-ghost"
        onClick={add}
        disabled={atCap}
        title={atCap ? `Limit of ${max} reached` : addLabel}
        style={{ padding: "4px 10px", marginTop: 8, fontSize: 12 }}
      >
        <Icon name="plus" size={11} /> {addLabel}
      </button>
    </div>
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

function SharingToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
  hint,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "start", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.7 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2 }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
          {label}
          {checked && (
            <span className="bkb-chip" style={{ fontSize: 9, borderColor: "var(--bkb-accent)", color: "var(--bkb-accent)" }}>
              on
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--bkb-textMuted)", lineHeight: 1.45, marginTop: 2 }}>
          {description}
        </div>
        {hint && (
          <div style={{ fontSize: 11, color: "var(--bkb-textSubtle)", marginTop: 4, fontStyle: "italic" }}>
            {hint}
          </div>
        )}
      </div>
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
          <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
            {review.is_public && (
              <span
                className="bkb-chip"
                style={{ fontSize: 9, borderColor: "var(--bkb-accent)", color: "var(--bkb-accent)" }}
                title="Anyone with the review ID can fetch this review."
              >
                public
              </span>
            )}
            {!review.is_public && review.share_to_cache && (
              <span
                className="bkb-chip"
                style={{ fontSize: 9, borderColor: "var(--bkb-textMuted)", color: "var(--bkb-textMuted)" }}
                title="Article cache shared, but the review itself remains private."
              >
                cache shared
              </span>
            )}
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
  const setVisibility = useSetReviewVisibility();
  const setCacheSharing = useSetCacheSharing();

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
                <Icon name="evidence" size={11} /> Markdown
              </button>
              <button
                className="bkb-btn bkb-btn-ghost"
                onClick={() => exportMut.mutate({ reviewId, format: "json" })}
                disabled={exportMut.isPending}
              >
                <Icon name="evidence" size={11} /> JSON
              </button>
              <button
                className="bkb-btn bkb-btn-ghost"
                onClick={() => exportMut.mutate({ reviewId, format: "bibtex" })}
                disabled={exportMut.isPending}
              >
                <Icon name="evidence" size={11} /> BibTeX
              </button>
              <button
                className="bkb-btn bkb-btn-ghost"
                onClick={() => exportMut.mutate({ reviewId, format: "ttl" })}
                disabled={exportMut.isPending}
              >
                <Icon name="evidence" size={11} /> Turtle
              </button>
              <button
                className="bkb-btn bkb-btn-ghost"
                onClick={() => exportMut.mutate({ reviewId, format: "jsonld" })}
                disabled={exportMut.isPending}
              >
                <Icon name="evidence" size={11} /> JSON-LD
              </button>
              {(r.data_charting_rubrics?.length ?? 0) > 0 && (
                <>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    onClick={() => exportMut.mutate({ reviewId, format: "rubric_markdown" })}
                    disabled={exportMut.isPending}
                  >
                    <Icon name="evidence" size={11} /> Rubric (md)
                  </button>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    onClick={() => exportMut.mutate({ reviewId, format: "rubric_json" })}
                    disabled={exportMut.isPending}
                  >
                    <Icon name="evidence" size={11} /> Rubric (json)
                  </button>
                  <button
                    className="bkb-btn bkb-btn-ghost"
                    onClick={() => exportMut.mutate({ reviewId, format: "charting_json" })}
                    disabled={exportMut.isPending}
                  >
                    <Icon name="evidence" size={11} /> Charting (json)
                  </button>
                </>
              )}
              {(r.critical_appraisals?.length ?? 0) > 0 && (
                <button
                  className="bkb-btn bkb-btn-ghost"
                  onClick={() => exportMut.mutate({ reviewId, format: "appraisal_json" })}
                  disabled={exportMut.isPending}
                >
                  <Icon name="evidence" size={11} /> Appraisal (json)
                </button>
              )}
              {(r.narrative_rows?.length ?? 0) > 0 && (
                <button
                  className="bkb-btn bkb-btn-ghost"
                  onClick={() => exportMut.mutate({ reviewId, format: "narrative_summary_json" })}
                  disabled={exportMut.isPending}
                >
                  <Icon name="evidence" size={11} /> Narrative (json)
                </button>
              )}
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

        {/* Visibility & cache sharing — only meaningful once a review has run.
            Public mirrors share_to_cache (making a review public auto-enables
            cache sharing); cache sharing is independent so a private review
            can still contribute its article cache to other users. */}
        {r.status !== "running" && r.status !== "pending" && (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              border: "1px solid var(--bkb-border)",
              borderRadius: 6,
              background: "var(--bkb-surfaceAlt)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--bkb-textSubtle)", marginBottom: 8 }}>
              Sharing
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <SharingToggle
                label="Public"
                description="Anyone with the review ID can fetch the full review (synthesis, included articles, exports). Auto-enables cache sharing."
                checked={r.is_public}
                disabled={setVisibility.isPending}
                onChange={(v) => setVisibility.mutate({ reviewId, is_public: v })}
              />
              <SharingToggle
                label="Share article cache"
                description="Other users searching the same articles can re-use the cached fetches and LLM responses from this review. The review itself stays private unless you also flip Public."
                checked={r.share_to_cache}
                disabled={setCacheSharing.isPending || r.is_public}
                onChange={(v) => setCacheSharing.mutate({ reviewId, share_to_cache: v })}
                hint={r.is_public ? "Enabled automatically because the review is public." : undefined}
              />
            </div>
            {(setVisibility.error || setCacheSharing.error) && (
              <div style={{ fontSize: 11, color: "var(--bkb-danger)", marginTop: 6 }}>
                {((setVisibility.error || setCacheSharing.error) as Error).message}
              </div>
            )}
          </div>
        )}

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

  // Auto-select a review when arriving via ?review=… (e.g. from
  // /knowledge-base/synth-scholar). Falls back to no selection if absent.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const id = new URLSearchParams(window.location.search).get("review");
    if (id) setSelectedId(id);
  }, []);

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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(260px, 320px) minmax(420px, 2fr)", gap: 16, alignItems: "start" }}>
        <StartReviewForm onCreated={setSelectedId} />
        <ReviewsList selectedId={selectedId} onSelect={setSelectedId} />
        <div
          className="bkb-scroll"
          style={{
            position: "sticky",
            top: 16,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
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
