/**
 * TypeScript types for SynthScholar (PRISMA-guided literature review).
 *
 * Mirror of ml_service's `core.synth_scholar.schemas` Pydantic models. Ported
 * from aep-knowledge-synthesis/ui/src/lib/prisma-types.ts.
 */

// ── Enums ────────────────────────────────────────────────────────────

export type ReviewStatus =
  | "pending"
  | "plan_pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type RoBTool =
  | "RoB 2"
  | "Jadad Scale"
  | "ROBINS-I"
  | "ROBINS-E"
  | "Newcastle-Ottawa Scale"
  | "QUADAS-2"
  | "CASP Qualitative Checklist"
  | "JBI Critical Appraisal"
  | "Murad Tool"
  | "SYRCLE"
  | "MINORS"
  | "ROBIS";

export type ExportFormat =
  | "markdown"
  | "json"
  | "bibtex"
  | "ttl"
  | "jsonld"
  | "rubric_markdown"
  | "rubric_json"
  | "charting_markdown"
  | "charting_json"
  | "appraisal_markdown"
  | "appraisal_json"
  | "narrative_summary_markdown"
  | "narrative_summary_json";

export type SynthesisStyle = "paragraph" | "question_answer" | "bullet_list" | "table";

// ── Search ────────────────────────────────────────────────────────────

export type LiteratureSearchMode = "keyword" | "by_title" | "semantic";
export type ReviewSearchMode = "keyword" | "semantic";

export interface ReviewPlan {
  research_question: string;
  pubmed_queries: string[];
  biorxiv_queries: string[];
  mesh_terms: string[];
  key_concepts: string[];
  rationale: string;
  iteration: number;
}

// ── Request Types ────────────────────────────────────────────────────

export interface ProtocolRequest {
  title: string;
  objective?: string;
  pico_population?: string;
  pico_intervention?: string;
  pico_comparison?: string;
  pico_outcome?: string;
  inclusion_criteria?: string;
  exclusion_criteria?: string;
  databases?: string[];
  date_range_start?: string;
  date_range_end?: string;
  max_hops?: number;
  registration_number?: string;
  protocol_url?: string;
  funding_sources?: string;
  competing_interests?: string;
  rob_tool?: RoBTool;
  charting_questions?: string[];
  appraisal_domains?: string[];
  grouping_dimension?: string;
  default_group_questions?: string[];
  per_group_questions?: Record<string, string[]>;
}

export interface RunReviewRequest {
  protocol: ProtocolRequest;
  model?: string;
  max_results_per_query?: number;
  related_depth?: number;
  biorxiv_days?: number;
  enable_cache?: boolean;
  extract_data?: boolean;
  data_items?: string[];
  auto_confirm?: boolean;
  max_plan_iterations?: number;
  output_synthesis_style?: SynthesisStyle;
  max_articles?: number | null;
  concurrency?: number;
  /** Resolved on the client (personal sessionStorage key, or admin shared key)
   *  and forwarded to ml_service so the pipeline doesn't depend on a server
   *  env var. Never persisted in the run_request_json on the DB. */
  openrouter_api_key?: string;
}

export interface CompareRunRequest {
  protocol: ProtocolRequest;
  compare_models: string[];
  consensus_model?: string;
  max_results_per_query?: number;
  related_depth?: number;
  biorxiv_days?: number;
  enable_cache?: boolean;
  extract_data?: boolean;
  data_items?: string[];
  auto_confirm?: boolean;
  max_plan_iterations?: number;
  output_synthesis_style?: SynthesisStyle;
  max_articles?: number | null;
  concurrency?: number;
  openrouter_api_key?: string;
}

export interface PlanResponseRequest {
  approved: boolean;
  feedback?: string;
}

// ── Response Types ───────────────────────────────────────────────────

export interface FlowCounts {
  db_pubmed: number;
  db_biorxiv: number;
  db_medrxiv: number;
  db_related: number;
  db_hops: number;
  db_other_sources: Record<string, number>;
  total_identified: number;
  duplicates_removed: number;
  after_dedup: number;
  screened_title_abstract: number;
  excluded_title_abstract: number;
  sought_fulltext: number;
  not_retrieved: number;
  assessed_eligibility: number;
  excluded_eligibility: number;
  excluded_reasons: Record<string, number>;
  included_synthesis: number;
}

export interface ArticleSummary {
  pmid: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  doi: string;
  source: string;
  inclusion_status: string;
  rob_overall: string;
  study_design: string;
  quality_score: number;
}

export interface ScreeningLogEntry {
  pmid: string;
  title: string;
  decision: string;
  reason: string;
  stage: string;
}

export interface EvidenceSpan {
  text: string;
  paper_pmid: string;
  paper_title: string;
  section: string;
  relevance_score: number;
  claim: string;
  doi: string;
}

export interface GRADEAssessment {
  outcome: string;
  overall_certainty: string;
  summary: string;
  domains: Record<string, { rating: string; explanation: string }>;
}

export interface LogEvent {
  step: number;
  message: string;
  timestamp: string;
}

export interface ReviewSummary {
  review_id: string;
  status: ReviewStatus;
  title: string;
  created_at: string;
  completed_at?: string | null;
  flow?: FlowCounts | null;
  included_count: number;
  is_public: boolean;
  share_to_cache: boolean;
  error?: string | null;
  stage?: string | null;
  stage_index?: number | null;
  stage_total?: number | null;
  stage_done?: number | null;
  stage_remaining?: number | null;
  articles_included?: number | null;
}

export interface ReviewDetail {
  review_id: string;
  status: ReviewStatus;
  title: string;
  created_at: string;
  completed_at?: string | null;
  is_public: boolean;
  share_to_cache: boolean;
  enable_cache?: boolean | null;
  last_completed_step?: number;
  run_request?: (RunReviewRequest & { compare_mode?: boolean; compare_models?: string[] }) | null;
  research_question: string;
  flow?: FlowCounts | null;
  included_articles: ArticleSummary[];
  screening_log: ScreeningLogEntry[];
  evidence_spans: EvidenceSpan[];
  synthesis_text: string;
  bias_assessment: string;
  limitations: string;
  grade_assessments: GRADEAssessment[];
  search_queries: string[];
  data_charting_rubrics: unknown[];
  narrative_rows: unknown[];
  critical_appraisals: unknown[];
  grounding_validation?: unknown | null;
  structured_abstract: string;
  introduction_text: string;
  conclusions_text: string;
  quality_checklist: Record<string, boolean>;
  per_group_analysis?: unknown | null;
  error?: string | null;
  compare_result?: unknown | null;
}

export type ProgressEventKind =
  | "log"
  | "stage_start"
  | "stage_done"
  | "article_start"
  | "article_done"
  | "plan_ready"
  | "done";

export interface ProgressEvent {
  review_id: string;
  step: number;
  message: string;
  timestamp: string;
  event_type?: string;
  source?: string | null;
  plan?: ReviewPlan | null;
  kind?: ProgressEventKind;
  stage?: string | null;
  stage_index?: number | null;
  stage_total?: number | null;
  stage_done?: number | null;
  stage_remaining?: number | null;
  articles_included?: number | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  models: string[];
  rob_tools: string[];
}

export interface RoBToolInfo {
  id: string;
  name: string;
  domains: string[];
  domain_count: number;
}
