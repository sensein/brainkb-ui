"use client";

/**
 * /knowledge-base/synth-scholar — the SynthScholar reviews anyone can read, from
 * both places they come from, in one list:
 *
 *   * run on BrainKB and published by their author (ml_service's unauthenticated
 *     /public/reviews — already filtered server-side to published, completed ones);
 *   * ingested from a SynthScholar run's output directory into a space
 *     (query_service /synthscholar/reviews, through the UI server — public spaces
 *     for anyone, private ones for their members).
 *
 * Each row links to its own detail page. One source failing (e.g. a service not
 * yet updated) does not hide the other's reviews.
 *
 * Visual layout (hero header + search bar + table) mirrors the other
 * knowledge-base list pages (e.g. /knowledge-base/ner); below md each review is a
 * card. The review id is not listed (it is on the detail page) but is searchable.
 */

import React from "react";
import Link from "next/link";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { usePublicReviews } from "@/src/hooks/useSynthScholar";
import type { ReviewSummary } from "@/src/types/synthScholar";
import { ingestedReviewHref, listIngestedReviews, type IngestedSummary } from "@/src/services/api/synthScholarIngest";
import LiteratureShell from "./LiteratureShell";
import { readableSlug } from "./reviewParts";

type Row = {
  id: string;
  title: string;
  href: string;
  /** Number of included studies (the review's included_articles). */
  included: number;
  date: string | null;
  /** What `date` is: when the run completed, was started, or was imported. */
  dateLabel: "Completed" | "Started" | "Imported";
  source: "BrainKB" | "Ingested";
  /** Where it is listed from: the space's name for an ingested review. */
  collection: string;
  isPrivate?: boolean;
};

export default function PublicReviewsListPage() {
  const run = usePublicReviews();
  const [ingested, setIngested] = React.useState<IngestedSummary[] | null>(null);
  const [ingestError, setIngestError] = React.useState<string | null>(null);
  const [spaceNames, setSpaceNames] = React.useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    listIngestedReviews().then(setIngested).catch((e) => {
      setIngested([]);
      setIngestError(e instanceof Error ? e.message : String(e));
    });
    // Space display names (public spaces, plus the caller's own). Without them the
    // slug is shown in readable form.
    fetch("/api/spaces", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const list = (body?.spaces ?? []) as { slug?: string; name?: string }[];
        setSpaceNames(Object.fromEntries(list.filter((s) => s.slug && s.name).map((s) => [s.slug, s.name])));
      })
      .catch(() => undefined);
  }, []);

  const rows = React.useMemo<Row[]>(() => {
    const fromRuns: Row[] = (run.data ?? [])
      // The endpoint already returns only published, completed reviews; kept as a
      // guard so a backend change can never surface a draft here.
      .filter((r: ReviewSummary) => r.is_public && r.status === "completed")
      .map((r) => ({
        id: r.review_id, title: r.title, included: r.included_count,
        date: r.completed_at || r.created_at, dateLabel: r.completed_at ? "Completed" : "Started",
        href: `/knowledge-base/synth-scholar/${encodeURIComponent(r.review_id)}`, source: "BrainKB",
        collection: "Published reviews",
      }));
    const fromIngest: Row[] = (ingested ?? []).map((r) => ({
      id: r.review_id, title: r.title, included: r.included_count,
      date: r.run_completed_at || r.imported_at, dateLabel: r.run_completed_at ? "Completed" : "Imported",
      href: ingestedReviewHref(r.review_id, r.space_slug), source: "Ingested",
      collection: spaceNames[r.space_slug] || readableSlug(r.space_slug),
      isPrivate: r.space_visibility === "private",
    }));
    return [...fromRuns, ...fromIngest].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [run.data, ingested, spaceNames]);

  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.title?.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.collection.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const loading = run.isLoading || ingested === null;
  const errors = [
    run.error ? `Reviews run on BrainKB: ${(run.error as Error).message}` : null,
    ingestError ? `Imported reviews: ${ingestError}` : null,
  ].filter(Boolean) as string[];

  const sourceLabel = (r: Row) => (r.source === "BrainKB" ? "Run on BrainKB" : "Imported into BrainKB");
  const dateText = (r: Row) => (r.date ? `${r.dateLabel} ${new Date(r.date).toLocaleDateString()}` : "—");
  const privateBadge = (
    <span className="ml-1.5 inline-block text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border border-gray-300 text-gray-600 align-middle">
      Private
    </span>
  );

  return (
    <LiteratureShell
      eyebrow="Literature reviews"
      title="Literature reviews."
      lead="Browse evidence syntheses with their included studies, manuscripts, files, and provenance."
    >
      <div>
        {!loading && rows.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search reviews by title, collection or review ID…"
                aria-label="Search reviews"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              />
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading reviews…</p>
          </div>
        )}

        {!loading && errors.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-900">
              {rows.length ? "Some reviews could not be loaded:" : "Reviews could not be loaded:"}
              <ul className="list-disc pl-5 mt-1">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          </div>
        )}

        {!loading && rows.length === 0 && errors.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600 shadow-sm">
            No reviews yet. Run one in{" "}
            <Link href="/user/synth-scholar" className="text-sky-600 hover:underline">SynthScholar</Link>{" "}
            and make it <strong>Public</strong> when it completes, or{" "}
            <Link href="/user/ingest-kg?kind=synthscholar" className="text-sky-600 hover:underline">ingest a SynthScholar run</Link>{" "}
            into a public space.
          </div>
        )}

        {!loading && rows.length > 0 && filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 shadow-sm">
            No reviews match &ldquo;{searchQuery}&rdquo;.
          </div>
        )}

        {/* Small screens: one card per review. */}
        {!loading && filtered.length > 0 && (
          <ul className="md:hidden space-y-3">
            {filtered.map((r) => (
              <li key={`${r.source}:${r.collection}:${r.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <Link href={r.href} className="font-medium text-sky-600 hover:text-sky-700 hover:underline leading-snug block">
                  {r.title || "(untitled)"}
                </Link>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-gray-500">Included studies</dt>
                    <dd className="text-gray-900 tabular-nums">{r.included}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Date</dt>
                    <dd className="text-gray-900">{dateText(r)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-gray-500">Source</dt>
                    <dd className="text-gray-900">
                      {sourceLabel(r)} · {r.collection}{r.isPrivate && privateBadge}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        {!loading && filtered.length > 0 && (
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <table className="w-full table-fixed text-sm text-left text-gray-700">
              <colgroup>
                <col />
                <col className="w-32" />
                <col className="w-60" />
                <col className="w-40" />
              </colgroup>
              <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                <tr>
                  {["Title", "Included studies", "Source", "Date"].map((h) => (
                    <th key={h} scope="col" className="px-5 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((r) => (
                  <tr key={`${r.source}:${r.collection}:${r.id}`} className="hover:bg-sky-50/50 transition-colors duration-150 align-top">
                    <td className="px-5 py-4">
                      <Link href={r.href} className="font-medium text-sky-600 hover:text-sky-700 hover:underline leading-snug">
                        {r.title || "(untitled)"}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-700 tabular-nums">{r.included}</td>
                    <td className="px-5 py-4 text-gray-600">
                      <span className="block text-gray-800">{sourceLabel(r)}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{r.collection}{r.isPrivate && privateBadge}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {r.date ? (
                        <>
                          <span className="block text-xs text-gray-500">{r.dateLabel}</span>
                          <span className="block">{new Date(r.date).toLocaleDateString()}</span>
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </LiteratureShell>
  );
}
