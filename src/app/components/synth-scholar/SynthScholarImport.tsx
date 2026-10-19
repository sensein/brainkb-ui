"use client";

/**
 * Ingest a SynthScholar review: the user picks a run's output directory (the
 * folder holding review.json and review.ttl) and a space. Everything except
 * intermediate work (work/, caches) is uploaded to the query service, which puts
 * the review's RDF and an import record into the review's own graph in that space
 * (as a normal ingest job, as the user, under the space's write rules) and keeps
 * the files — manuscript, PDF, figures, tables, verification reports — so the
 * review can be read on its page by whoever can read the space.
 */

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  selectReviewFiles,
  ingestReview,
  INGEST_MAX_FILES,
  type ImportSelection,
} from "@/src/services/api/synthScholarIngest";

export interface SpaceOption {
  slug: string;
  label: string;
}

const MB = 1024 * 1024;
const size = (n: number) => (n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** What the kept files are, for the summary — the same labels the server records. */
function describe(sel: ImportSelection) {
  const has = (p: string) => sel.keep.some((k) => k.path === p);
  const count = (fn: (p: string) => boolean) => sel.keep.filter((k) => fn(k.path)).length;
  return [
    { label: "Review result (review.json)", ok: has("review.json") },
    { label: "Manuscript PDF", ok: has("review.pdf") },
    { label: "Manuscript (Markdown)", ok: has("review.manuscript.md") || has("review.md") },
    { label: "RDF (Turtle)", ok: has("review.ttl") },
    { label: `Figures (${count((p) => p.startsWith("figures/") && !p.endsWith(".json"))})`, ok: count((p) => p.startsWith("figures/")) > 0 },
    { label: `Tables (${count((p) => /\.(csv|tsv)$/i.test(p))})`, ok: count((p) => /\.(csv|tsv)$/i.test(p)) > 0 },
    { label: "Search log", ok: has("search_log.json") },
    { label: "Citation & URL verification", ok: has("review.citations.json") || has("url_verification.json") },
  ];
}

export default function SynthScholarImport({
  spaces,
  cannotIngest,
  userId,
}: {
  spaces: SpaceOption[] | null;
  cannotIngest: string | null;
  /** Owner of the ingest job, as for RDF uploads (so it shows on Job Status). */
  userId: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<ImportSelection | null>(null);
  const [folderName, setFolderName] = useState("");
  const [spaceSlug, setSpaceSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reviewId: string; title: string; space: string; iri: string; job: string } | null>(null);
  const [showFiles, setShowFiles] = useState(false);

  // webkitdirectory is not in React's input typings; set it on the element.
  useEffect(() => {
    inputRef.current?.setAttribute("webkitdirectory", "");
    inputRef.current?.setAttribute("directory", "");
  }, []);

  // Leaving mid-upload loses it (the files are on this computer): ask first.
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setError(null);
    setDone(null);
    if (!files.length) return;
    const first = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    setFolderName(first.split("/")[0] || "");
    const sel = selectReviewFiles(files);
    if (!sel.keep.some((k) => k.path === "review.json")) {
      setSelection(null);
      setError("This folder has no review.json — choose the output directory of a SynthScholar run (the folder that holds review.json).");
      return;
    }
    if (!sel.keep.some((k) => k.path === "review.ttl")) {
      setSelection(null);
      setError("This folder has no review.ttl — export the review with --formats ttl (the synthscholar skill's export_review.py), then choose the folder again.");
      return;
    }
    if (sel.keep.length > INGEST_MAX_FILES) {
      setSelection(null);
      setError(`The review has ${sel.keep.length} files; at most ${INGEST_MAX_FILES} can be ingested at once.`);
      return;
    }
    setSelection(sel);
  };

  const submit = async () => {
    if (!selection || !spaceSlug) return;
    setError(null);
    setBusy(true);
    try {
      const r = await ingestReview(selection, spaceSlug, userId);
      setDone({ reviewId: r.review_id, title: r.title || r.review_id, space: r.space_slug, iri: r.graph_iri, job: r.job_id });
      setSelection(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(`Ingest failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const skippedByDir = selection
    ? Object.entries(selection.skipped.reduce<Record<string, number>>((acc, s) => {
        acc[s.reason] = (acc[s.reason] ?? 0) + 1;
        return acc;
      }, {}))
    : [];

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-8 shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Review output folder</label>
        <div className="border-2 border-dashed rounded-lg p-6 text-center border-gray-300 dark:border-gray-700">
          <input ref={inputRef} type="file" id="synthscholar-folder" className="hidden" multiple onChange={onPick} disabled={busy} />
          <label htmlFor="synthscholar-folder" className="cursor-pointer flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selection ? `${folderName}${selection.root ? `/${selection.root}` : ""}` : "Choose the folder a SynthScholar run wrote (it holds review.json)"}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              The whole folder is read; intermediate work (work/) is left out and never uploaded.
            </span>
          </label>
        </div>
      </div>

      {selection && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3 text-sm">
          <div className="font-medium text-gray-800 dark:text-gray-100">
            {selection.keep.length} files to keep · {size(selection.bytes)}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {describe(selection).map((d) => (
              <li key={d.label} className={d.ok ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"}>
                {d.ok ? "✓" : "–"} {d.label}
              </li>
            ))}
          </ul>
          {skippedByDir.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Left out: {skippedByDir.map(([reason, n]) => `${n} file${n === 1 ? "" : "s"} (${reason})`).join(", ")}
              {selection.skippedBytes ? ` · ${size(selection.skippedBytes)} not uploaded` : ""}
            </div>
          )}
          <button type="button" onClick={() => setShowFiles((v) => !v)} className="text-xs text-blue-700 dark:text-blue-400 underline">
            {showFiles ? "Hide files" : "Show every file"}
          </button>
          {showFiles && (
            <ul className="max-h-60 overflow-auto font-mono text-xs text-gray-600 dark:text-gray-300 space-y-0.5">
              {selection.keep.map((k) => (
                <li key={k.path} className="flex justify-between gap-4">
                  <span className="truncate">{k.path}</span>
                  <span className="shrink-0 text-gray-400">{size(k.file.size)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="synthscholar-space" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Space</label>
        {cannotIngest ? (
          <div className="text-sm p-3 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">{cannotIngest}</div>
        ) : (
          <select
            id="synthscholar-space"
            value={spaceSlug}
            onChange={(e) => setSpaceSlug(e.target.value)}
            disabled={busy}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">{spaces === null ? "Loading your spaces…" : spaces.length ? "Select a space" : "No space you can add data to"}</option>
            {(spaces ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>{s.label}</option>
            ))}
          </select>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The review goes into its own graph, <code className="font-mono">https://brainkb.org/synthscholar/reviews/&lt;review id&gt;/</code> (the
          id the run gave it), registered in this space — you need to be its owner or an editor. Who can read the review and its files
          is set by the space. Each review can be ingested once.
        </p>
      </div>

      {error && <div className="text-red-600 dark:text-red-300 text-sm p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">{error}</div>}
      {done && (
        <div className="text-sm p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 space-y-1">
          <p>
            Ingesting <strong>{done.title}</strong> into <code className="font-mono">{done.iri}</code> in{" "}
            <strong>{done.space}</strong> (job <Link href="/user/job-status" className="underline font-mono">{done.job.slice(0, 8)}</Link>).
            The upload is done; you can close this page.
          </p>
          <p>
            <Link href={`/knowledge-base/synth-scholar/ingested/${encodeURIComponent(done.reviewId)}`} className="underline font-medium">
              Open the review →
            </Link>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!selection || busy || !spaceSlug}
        className={`w-full px-4 py-3 text-white rounded-lg font-semibold transition-colors duration-200 ${
          !selection || busy || !spaceSlug ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {busy ? `Uploading ${selection ? size(selection.bytes) : ""}… keep this page open` : "Ingest review"}
      </button>
    </div>
  );
}
