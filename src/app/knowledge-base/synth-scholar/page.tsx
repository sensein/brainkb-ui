"use client";

/**
 * /knowledge-base/synth-scholar — public listing of completed PRISMA reviews
 * that authors marked Public from the Sharing toggle on /user/synth-scholar.
 *
 * Visual layout (hero header + search bar + table) intentionally mirrors the
 * other knowledge-base list pages (e.g. /knowledge-base/ner) so the surface
 * stays consistent. Each row links to a public detail view that exposes the
 * synthesis text plus a small set of downloads — no editing UI.
 */

import React from "react";
import Link from "next/link";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { useReviews } from "@/src/hooks/useSynthScholar";
import type { ReviewSummary } from "@/src/types/synthScholar";

export default function PublicReviewsListPage() {
  const { data, isLoading, error } = useReviews();
  const [searchQuery, setSearchQuery] = React.useState("");

  const publicReviews = React.useMemo(
    () =>
      (data ?? []).filter(
        (r: ReviewSummary) => r.is_public && r.status === "completed",
      ),
    [data],
  );

  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return publicReviews;
    return publicReviews.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.review_id?.toLowerCase().includes(q),
    );
  }, [publicReviews, searchQuery]);

  return (
    <div className="kb-page-margin">
      {/* Hero — matches /knowledge-base/ner */}
      <div className="grid fix-left-margin grid-cols-1 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
          <div className="relative px-8 py-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              SynthScholar — Public Reviews
            </h1>
            <p className="text-sky-100 text-base leading-relaxed">
              PRISMA-guided literature reviews shared with the community. Browse
              completed reviews, read their synthesis, and download the full
              report or BibTeX bibliography.
            </p>
          </div>
        </div>
      </div>

      <div className="grid fix-left-margin grid-cols-1">
        {/* Search */}
        {!isLoading && !error && publicReviews.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search reviews by title or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading public reviews…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  Error Loading Data
                </h3>
                <p className="text-red-700">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && publicReviews.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600 shadow-sm">
            No public reviews yet. To publish a review, run one in{" "}
            <Link href="/user/synth-scholar" className="text-sky-600 hover:underline">
              SynthScholar
            </Link>{" "}
            and toggle <strong>Public</strong> from the Sharing panel after it
            completes.
          </div>
        )}

        {!isLoading && !error && publicReviews.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                      Title
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                      Review ID
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                      Articles
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((r) => (
                    <tr
                      key={r.review_id}
                      className="hover:bg-sky-50/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/knowledge-base/synth-scholar/${encodeURIComponent(r.review_id)}`}
                          className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
                        >
                          {r.title || "(untitled)"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">
                        {r.review_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {r.included_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        No reviews match &ldquo;{searchQuery}&rdquo;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
