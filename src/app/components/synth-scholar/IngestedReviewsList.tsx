"use client";

/**
 * Reviews ingested from SynthScholar runs' output directories (query_service).
 * Lists those the caller can read: public spaces for anyone, private spaces for
 * their members. Shown under the reviews run on BrainKB.
 */

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { listIngestedReviews, type IngestedSummary } from "@/src/services/api/synthScholarIngest";

export function IngestedReviewsList({ searchQuery = "" }: { searchQuery?: string }) {
  const [reviews, setReviews] = React.useState<IngestedSummary[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    listIngestedReviews().then(setReviews).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);
  const q = searchQuery.trim().toLowerCase();
  const shown = (reviews ?? []).filter((r) => !q || r.title?.toLowerCase().includes(q) || r.review_id.toLowerCase().includes(q));

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Ingested from SynthScholar runs</h2>
      <p className="text-sm text-gray-600 mb-4">
        Reviews run with the synthscholar skill and ingested into a space, with their manuscript, files and provenance.{" "}
        <Link href="/user/ingest-kg?kind=synthscholar" className="text-sky-600 hover:underline">Ingest one</Link>.
      </p>
      {reviews === null && !error && (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
      )}
      {error && <p className="text-sm text-red-600">Could not load ingested reviews: {error}</p>}
      {reviews !== null && reviews.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-600 shadow-sm">No ingested reviews you can see yet.</div>
      )}
      {shown.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="bg-gradient-to-r from-sky-50 to-blue-50 border-b border-gray-200">
                <tr>
                  {["Title", "Review ID", "Articles", "Space", "Ingested"].map((h) => (
                    <th key={h} className="px-6 py-4 font-semibold text-gray-900 uppercase tracking-wider text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shown.map((r) => (
                  <tr key={r.review_id} className="hover:bg-sky-50/50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <Link href={`/knowledge-base/synth-scholar/ingested/${encodeURIComponent(r.review_id)}`}
                        className="font-medium text-sky-600 hover:text-sky-700 hover:underline">
                        {r.title || "(untitled)"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">{r.review_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{r.included_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {r.space_slug}{r.space_visibility === "private" ? " · private" : ""}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {r.imported_at ? new Date(r.imported_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
