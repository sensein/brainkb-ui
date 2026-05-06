"use client";

/**
 * /knowledge-base/synth-scholar/[id] — public detail page for a completed
 * PRISMA review that the author has marked Public from /user/synth-scholar.
 *
 * Intentionally minimal: only the synthesis text + a small set of downloads
 * (full report as Markdown, bibliography as BibTeX). No editing, no protocol
 * controls, no progress / sharing widgets — those live behind the authoring
 * UI at /user/synth-scholar.
 */

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { useReview, useExportReview } from "@/src/hooks/useSynthScholar";
import { MarkdownContent } from "@/src/app/components/synth-scholar/MarkdownContent";

export default function PublicReviewDetailPage() {
  const params = useParams();
  const reviewId = decodeURIComponent((params?.id as string) || "");
  const { data, isLoading, error } = useReview(reviewId || undefined);
  const exportMut = useExportReview();

  const isPublicCompleted =
    data?.is_public === true && data?.status === "completed";

  return (
    <div className="kb-page-margin">
      {/* Hero header */}
      <div className="grid fix-left-margin grid-cols-1 mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-500 to-emerald-500 rounded-2xl shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-transparent"></div>
          <div className="relative px-8 py-10">
            <Link
              href="/knowledge-base/synth-scholar"
              className="inline-flex items-center gap-1 text-sky-100 hover:text-white text-sm mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to public reviews
            </Link>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100 mb-2">
              SynthScholar · PRISMA-guided literature review
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              {data?.title || (isLoading ? "Loading…" : "Review")}
            </h1>
            <p className="font-mono text-xs text-sky-100/90">{reviewId}</p>
          </div>
        </div>
      </div>

      <div className="grid fix-left-margin grid-cols-1 gap-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <p className="text-gray-600">Loading review…</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">
                  Could not load review
                </h3>
                <p className="text-red-700">{(error as Error).message}</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && data && !isPublicCompleted && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800">
                  Review not publicly available
                </h3>
                <p className="text-amber-700">
                  This review is either still running or has not been shared
                  publicly by its author.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && data && isPublicCompleted && (
          <>
            {/* Downloads */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-sky-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Downloads
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    exportMut.mutate({ reviewId, format: "markdown" })
                  }
                  disabled={exportMut.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BookOpen className="w-4 h-4" /> Full report (Markdown)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportMut.mutate({ reviewId, format: "bibtex" })
                  }
                  disabled={exportMut.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-sky-600 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" /> BibTeX (.bib)
                </button>
              </div>
              {exportMut.error && (
                <p className="text-sm text-red-600 mt-3">
                  {(exportMut.error as Error).message}
                </p>
              )}
            </div>

            {/* Synthesis */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Synthesis
              </h2>
              {data.synthesis_text ? (
                <MarkdownContent
                  className="text-gray-800"
                  style={{ fontSize: 15, lineHeight: 1.7 }}
                >
                  {data.synthesis_text}
                </MarkdownContent>
              ) : (
                <p className="text-gray-500 italic">
                  No synthesis text available for this review.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
