/**
 * SynthScholar review ingestion — query_service's /api/synthscholar/reviews.
 *
 * A SynthScholar run (the synthscholar skill) leaves an output directory:
 * review.json, review.ttl, the manuscript, PDF, figures, tables and verification
 * reports. Ingesting it puts the review's RDF and an import record into its own
 * graph in a space, and keeps the files (all but work/) so the review can be shown.
 * Everything runs as the signed-in user against the query service, so the space's
 * write and read rules apply; this client grants nothing.
 *
 * Separate from ./synthScholar.ts, which talks to ml_service about reviews run on
 * BrainKB.
 */

import { getSession } from "next-auth/react";
import { env } from "@/src/config/env";
import { getAuthTokenForService } from "@/src/utils/api/auth";

const base = () => `${env.queryServiceBase}/api/synthscholar/reviews`;

// ── Types ────────────────────────────────────────────────────────────

export interface IngestedFile {
  path: string;
  /** review_result, manuscript_pdf, manuscript_markdown, figure, table, rdf, … */
  kind: string;
  media_type: string;
  size_bytes: number;
  sha256: string;
}

export interface IngestedSummary {
  review_id: string;
  graph_iri: string;
  space_slug: string;
  space_visibility?: string;
  title: string;
  owner_email?: string;
  imported_at: string | null;
  job_id: string | null;
  research_question: string;
  run_completed_at: string | null;
  included_count: number;
  flow: Record<string, unknown> | null;
}

export interface IngestedArticle {
  pmid: string; title: string; authors: string; year: string; journal: string; doi: string;
  source: string; inclusion_status: string; rob_overall: string; full_text: boolean; full_text_source: string;
}

export interface IngestedReview extends IngestedSummary {
  files: IngestedFile[];
  detail: {
    research_question: string;
    structured_abstract: string;
    introduction_text: string;
    synthesis_text: string;
    bias_assessment: string;
    limitations: string;
    conclusions_text: string;
    search_queries: string[];
    flow: Record<string, number | Record<string, number>> | null;
    included_articles: IngestedArticle[];
    grade_assessments: { outcome: string; overall_certainty: string; summary: string }[];
    screening: { decisions: number; basis_by_stage: Record<string, Record<string, number>>; full_text_sources: Record<string, number> };
    retrieval: { included: number; with_full_text: number; abstract_only: number; routes: Record<string, number> };
  };
  manifest: {
    root?: string;
    file_count?: number;
    total_bytes?: number;
    imported_by?: string;
    imported_at?: string;
    skipped_count?: number;
    skipped_reasons?: string[];
    local_run?: {
      search_log?: { database: string; query: string; count?: number | null; date?: string | null }[];
      citation_verification?: Record<string, unknown>;
      url_verification?: { checked: number; reachable: number; statuses: Record<string, number>; checked_at?: string | null };
      manuscript_check?: Record<string, number | string | null>;
    };
  };
}

export interface IngestResult {
  review_id: string;
  graph_iri: string;
  space_slug: string;
  job_id: string;
  title?: string;
  files_kept: number;
  left_out: number;
}

// ── Auth ─────────────────────────────────────────────────────────────

/** The caller's query-service token, or null when not signed in (public reads). */
async function token(required: boolean): Promise<string | null> {
  const session = await getSession();
  if (!(session as any)?.backendToken) {
    if (required) throw new Error("Sign in to ingest a review.");
    return null;
  }
  const t = await getAuthTokenForService("query");
  if (!t && required) throw new Error("Could not authenticate with the query service — sign in again.");
  return t;
}

async function errorOf(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const d = (body as any)?.detail ?? (body as any)?.error;
  if (res.status === 404 && !d) return "Not found — the query service may not have SynthScholar ingest yet.";
  return typeof d === "string" ? d : d ? JSON.stringify(d) : `HTTP ${res.status}`;
}

async function get(path: string, init: RequestInit = {}): Promise<Response> {
  const t = await token(false);
  const res = await fetch(`${base()}${path}`, {
    ...init, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(await errorOf(res));
  return res;
}

// ── Choosing what to upload ──────────────────────────────────────────
// The server makes the same choice again and is the authority; filtering here
// only avoids uploading work/, which can run to hundreds of MB.

const SKIPPED_DIRS = new Set(["work", ".git", "__pycache__", "node_modules", ".ipynb_checkpoints", ".venv"]);
const SKIPPED_NAMES = new Set([".DS_Store", "Thumbs.db"]);
export const INGEST_MAX_FILES = 1000;

export const relativePathOf = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;

export interface ImportSelection {
  /** The folder holding review.json, as the browser names it ("" when none). */
  root: string;
  keep: { file: File; path: string }[];
  skipped: { path: string; reason: string }[];
  bytes: number;
  skippedBytes: number;
}

export function selectReviewFiles(files: File[]): ImportSelection {
  const withPath = files.map((file) => ({ file, full: relativePathOf(file) }));
  const roots = withPath
    .filter(({ full }) => full.split("/").pop() === "review.json")
    .map(({ full }) => full.split("/").slice(0, -1).join("/"))
    .sort((a, b) => a.length - b.length);
  const root = roots[0] ?? "";
  const out: ImportSelection = { root, keep: [], skipped: [], bytes: 0, skippedBytes: 0 };
  if (!roots.length) return out;
  const prefix = root ? `${root}/` : "";
  for (const { file, full } of withPath) {
    if (prefix && !full.startsWith(prefix)) {
      out.skipped.push({ path: full, reason: "outside the review's folder" });
      out.skippedBytes += file.size;
      continue;
    }
    const rel = full.slice(prefix.length);
    const parts = rel.split("/");
    if (SKIPPED_NAMES.has(parts[parts.length - 1])) continue;
    if (parts.slice(0, -1).some((p) => SKIPPED_DIRS.has(p))) {
      out.skipped.push({ path: rel, reason: `intermediate files (${parts[0]}/)` });
      out.skippedBytes += file.size;
      continue;
    }
    out.keep.push({ file, path: rel });
    out.bytes += file.size;
  }
  out.keep.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

// ── Calls ────────────────────────────────────────────────────────────

/** Ingest the kept files into a space. `userId` owns the ingest job, as for RDF uploads. */
export async function ingestReview(selection: ImportSelection, spaceSlug: string, userId?: string | null): Promise<IngestResult> {
  const t = await token(true);
  const form = new FormData();
  form.append("space_slug", spaceSlug);
  if (userId) form.append("user_id", userId);
  // The filename carries the path inside the review's folder (figures/…, tables).
  for (const { file, path } of selection.keep) form.append("files", file, path);
  if (selection.skipped.length) form.append("left_out", JSON.stringify(selection.skipped.slice(0, 5000)));
  const res = await fetch(base(), { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: form });
  if (res.status === 405) throw new Error("The query service does not support SynthScholar ingest yet — it needs updating.");
  if (!res.ok) throw new Error(await errorOf(res));
  return res.json();
}

export async function listIngestedReviews(space?: string): Promise<IngestedSummary[]> {
  const res = await get(space ? `?space=${encodeURIComponent(space)}` : "");
  return (await res.json()).reviews ?? [];
}

export async function getIngestedReview(reviewId: string): Promise<IngestedReview> {
  return (await get(`/${encodeURIComponent(reviewId)}`)).json();
}

const filePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** A file's bytes. Fetched with the caller's token (private spaces), so images are
 *  shown from object URLs rather than linked. */
export async function fetchIngestedFile(reviewId: string, path: string): Promise<Blob> {
  return (await get(`/${encodeURIComponent(reviewId)}/files/${filePath(path)}`)).blob();
}
