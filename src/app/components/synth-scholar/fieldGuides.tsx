"use client";

/**
 * fieldGuides — descriptions + reference links for SynthScholar form fields.
 *
 * Each entry is rendered inside an InfoPopover on the create-review form.
 * Centralizing them here keeps the JSX of the form readable and lets us
 * iterate on copy / links without hunting through hundreds of lines of UI.
 */

import React from "react";
import type { InfoLink } from "./InfoPopover";

export type FieldGuide = {
  title: string;
  description: React.ReactNode;
  link?: InfoLink;
};

const PICO_LINK: InfoLink = {
  href: "https://www.cochranelibrary.com/about-pico",
  label: "PICO at Cochrane Library",
};

const PRISMA_LINK: InfoLink = {
  href: "https://www.prisma-statement.org/prisma-2020",
  label: "PRISMA 2020 statement",
};

export const FIELD_GUIDES: Record<string, FieldGuide> = {
  // ── Protocol — basics ─────────────────────────────────────────────────
  title: {
    title: "Title",
    description: (
      <>
        A concise, descriptive name for your review. Aim for the population +
        intervention + outcome in one phrase, e.g. <em>"GLP-1 agonists for
        type-2 diabetes: efficacy and safety"</em>.
      </>
    ),
  },
  objective: {
    title: "Objective / research question",
    description: (
      <>
        The single research question your review answers. Often phrased as
        "What is the effect of <em>I</em> compared to <em>C</em> on <em>O</em>
        in <em>P</em>?". Defaults to the title if blank.
      </>
    ),
  },

  // ── PICO ───────────────────────────────────────────────────────────────
  population: {
    title: "P — Population",
    description: (
      <>
        Who is being studied: condition, demographic, sample group. Be
        specific about disease severity, age range, setting (hospital,
        community), and any inclusion-defining traits.
      </>
    ),
    link: PICO_LINK,
  },
  intervention: {
    title: "I — Intervention",
    description: (
      <>
        The treatment, exposure, diagnostic test, or risk factor under study.
        Specify dose / frequency / duration if relevant.
      </>
    ),
    link: PICO_LINK,
  },
  comparison: {
    title: "C — Comparison",
    description: (
      <>
        The control group or alternative the intervention is measured against —
        placebo, standard of care, no treatment, or a different active
        intervention.
      </>
    ),
    link: PICO_LINK,
  },
  outcome: {
    title: "O — Outcome",
    description: (
      <>
        The clinical endpoints you'll measure: mortality, symptom score,
        quality of life, biomarker change, adverse events, etc. Distinguish
        primary vs. secondary outcomes.
      </>
    ),
    link: PICO_LINK,
  },

  inclusion: {
    title: "Inclusion criteria",
    description: (
      <>
        Eligibility rules a study must meet to be included. Common axes: study
        design (RCT, cohort, case-control), language, publication date range,
        peer-review status. One rule per line is best.
      </>
    ),
    link: {
      href: "https://training.cochrane.org/handbook/current/chapter-03",
      label: "Cochrane Handbook ch. 3 — Defining the criteria",
    },
  },
  exclusion: {
    title: "Exclusion criteria",
    description: (
      <>
        Reasons to drop a study: editorials, conference abstracts, animal-only
        studies, retracted papers, n &lt; some threshold, etc. Should be
        non-overlapping with inclusion criteria.
      </>
    ),
  },

  // ── Search strategy ───────────────────────────────────────────────────
  databases: {
    title: "Databases",
    description: (
      <>
        Which bibliographic sources the search agent will query. PubMed and
        bioRxiv/medRxiv cover most biomedical literature; OpenAlex and CORE
        broaden coverage to grey literature and OA preprints.
      </>
    ),
  },
  date_range: {
    title: "Publication date range",
    description: (
      <>
        Optional YYYY-MM-DD bounds restricting which articles are searched.
        Leave blank for no date filter. Useful when the field's terminology
        or guidelines have shifted recently.
      </>
    ),
  },
  hops: {
    title: "Citation hops",
    description: (
      <>
        How many citation-chain traversals to perform after the initial
        search. <strong>0</strong> = no traversal, search-results only.
        Higher values surface seminal works cited by your seed set but
        increase runtime and cost.
      </>
    ),
  },

  // ── Registration & disclosures ────────────────────────────────────────
  registration: {
    title: "Registration number",
    description: (
      <>
        PROSPERO, OSF, or other registry ID for this protocol. Required by
        many journals for systematic reviews.
      </>
    ),
    link: {
      href: "https://www.crd.york.ac.uk/PROSPERO/",
      label: "PROSPERO registry",
    },
  },
  protocol_url: {
    title: "Protocol URL",
    description: (
      <>
        Public link to your pre-registered protocol document. Helps reviewers
        check that what you ran matches what you planned.
      </>
    ),
  },
  funding: {
    title: "Funding sources",
    description: (
      <>
        Grants and institutional support that paid for this review. Required
        for transparent reporting per PRISMA 2020 item 26.
      </>
    ),
    link: PRISMA_LINK,
  },
  competing_interests: {
    title: "Competing interests",
    description: (
      <>
        Financial / non-financial conflicts of interest of the review team.
        PRISMA 2020 item 26 — required for publication in most journals.
      </>
    ),
    link: PRISMA_LINK,
  },

  // ── Risk-of-bias & charting ───────────────────────────────────────────
  rob_tool: {
    title: "Risk-of-bias tool",
    description: (
      <>
        The framework the agent will use to score bias for each included
        study. Pick the one that matches your study designs:
        <ul style={{ margin: "6px 0 0 16px", padding: 0 }}>
          <li><strong>RoB 2</strong> — randomised trials</li>
          <li><strong>ROBINS-I</strong> — non-randomised intervention studies</li>
          <li><strong>QUADAS-2</strong> — diagnostic accuracy</li>
          <li><strong>Newcastle-Ottawa</strong> — observational</li>
          <li><strong>SYRCLE</strong> — animal studies</li>
        </ul>
      </>
    ),
    link: {
      href: "https://methods.cochrane.org/risk-bias-tools",
      label: "Cochrane RoB tools overview",
    },
  },
  charting_questions: {
    title: "Charting questions",
    description: (
      <>
        Custom data-extraction prompts the LLM will answer for every included
        article. Use the question text verbatim as the field key in the
        output. Leave empty to use built-in PRISMA-style charting fields.
      </>
    ),
  },
  appraisal_domains: {
    title: "Appraisal domains",
    description: (
      <>
        Quality / methodological domains the LLM scores per study (max 4).
        Examples: <em>study design</em>, <em>sample size adequacy</em>,
        <em> outcome measurement</em>, <em>statistical analysis</em>.
      </>
    ),
  },

  // ── Per-group analysis ────────────────────────────────────────────────
  grouping_dimension: {
    title: "Grouping dimension",
    description: (
      <>
        Optional attribute the synthesis will stratify by — e.g.{" "}
        <code>disorder_cohort</code>, <code>age_group</code>,{" "}
        <code>severity</code>. The LLM partitions studies on this attribute
        and produces a per-group narrative + Q&A.
      </>
    ),
  },
  default_group_questions: {
    title: "Default per-group questions",
    description: (
      <>
        Questions answered separately within each group (max 10, one per
        line). Use these for cross-cutting questions you want answered for
        every cohort: prevalence, response rate, comparative effects, etc.
      </>
    ),
  },

  // ── Run configuration ─────────────────────────────────────────────────
  mode: {
    title: "Single vs. compare mode",
    description: (
      <>
        <strong>Single</strong> — one model produces the review.{" "}
        <strong>Compare</strong> — 2–5 models run in parallel and a consensus
        model merges them. Compare mode costs more but surfaces disagreements
        between models that the consensus call resolves.
      </>
    ),
  },
  model: {
    title: "Model",
    description: (
      <>
        The LLM that drives every agent in the pipeline (planner, screener,
        extractor, appraiser, synthesizer). OpenRouter slug format —
        <code>provider/model-name</code>. Larger models reason better but
        cost more per article processed.
      </>
    ),
    link: {
      href: "https://openrouter.ai/models",
      label: "OpenRouter model catalogue",
    },
  },
  consensus_model: {
    title: "Consensus model",
    description: (
      <>
        In compare mode, the model that synthesizes the per-model outputs into
        a single review. Pick a strong reasoning model — it sees N reviews
        and must reconcile contradictions.
      </>
    ),
  },
  max_results: {
    title: "Max results per query",
    description: (
      <>
        How many search hits to retain per database query. Higher values
        improve recall but slow down screening and cost more LLM tokens.
        Typical range: 50–300.
      </>
    ),
  },
  related_depth: {
    title: "Related-articles depth",
    description: (
      <>
        How many "related work" expansion rounds. <strong>0</strong> =
        search-only. <strong>1</strong> = pull related articles for each seed.
        <strong> 2+</strong> = recursive related-of-related. Increases recall
        of seminal and adjacent papers.
      </>
    ),
  },
  biorxiv_days: {
    title: "bioRxiv lookback days",
    description: (
      <>
        How far back to scan bioRxiv / medRxiv preprints. The bioRxiv API is
        time-sliced rather than keyword-indexed, so this is a coverage
        window, not a publication-date filter. Typical: 365–730 days.
      </>
    ),
  },
  max_articles: {
    title: "Max articles",
    description: (
      <>
        Hard cap on total articles processed after deduplication. The
        re-ranker keeps the top N by relevance. Useful for quick test runs
        or budget control. Leave blank for no cap.
      </>
    ),
  },
  concurrency: {
    title: "Concurrency",
    description: (
      <>
        How many articles the per-article agent stages process in parallel.
        Higher values finish faster but bump up against provider rate limits.
        <strong> 5–10</strong> is a good default; <strong>20+</strong> only
        with a paid OpenRouter tier.
      </>
    ),
  },
  max_plan_iterations: {
    title: "Max plan iterations",
    description: (
      <>
        How many times the search-strategy agent will regenerate the search
        plan if you reject it. Only meaningful with{" "}
        <em>"Pause for me to review"</em> enabled.
      </>
    ),
  },
  synthesis_style: {
    title: "Synthesis style",
    description: (
      <>
        Output format for the narrative synthesis section.{" "}
        <strong>Paragraph</strong> = traditional prose,{" "}
        <strong>Q&A</strong> = research-question-driven,{" "}
        <strong>Bullet list</strong> = scannable findings,{" "}
        <strong>Table</strong> = structured comparison rows.
      </>
    ),
    link: PRISMA_LINK,
  },
  data_items: {
    title: "Data-extraction items",
    description: (
      <>
        Custom data fields to extract from every included article (one per
        line). Examples: <em>sample size</em>, <em>follow-up duration</em>,
        <em> primary outcome value</em>. Leave blank for the built-in
        PRISMA-style item set.
      </>
    ),
  },
  enable_cache: {
    title: "Enable cache",
    description: (
      <>
        Reuse cached articles + LLM responses from prior runs of similar
        protocols (when Postgres caching is configured). Faster + cheaper
        re-runs; turn off for fresh, audit-grade runs.
      </>
    ),
  },
  extract_data: {
    title: "Extract data",
    description: (
      <>
        Run the per-article data-charting and critical-appraisal stages.
        Required for tables, narrative rows, and per-group Q&A. Disable for
        protocol-only runs or quick screening triage.
      </>
    ),
  },
  pause_for_review: {
    title: "Pause for me to review the search strategy",
    description: (
      <>
        When enabled, the pipeline pauses after the planner produces the
        search query so you can approve, revise, or reject it. Recommended
        for high-stakes reviews. Maps to <code>auto_confirm = false</code>.
      </>
    ),
  },
};
