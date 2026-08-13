/**
 * React Query hooks for the SynthScholar API.
 *
 * Ported from aep-knowledge-synthesis with import-path adjustments only —
 * the underlying contract (review keys, refetch cadence, SSE handler) is
 * unchanged because the API surface matches.
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  getHealth,
  getRoBTools,
  listReviews,
  getReview,
  getReviewStatus,
  createReview,
  createCompareReview,
  deleteReview,
  exportReview,
  streamProgress,
  setReviewVisibility,
  setCacheSharingReview,
  submitPlanResponse,
  getReviewLog,
  cancelReview,
  retryReview,
  listPublicReviews,
  getPublicReview,
  getPublicReviewLog,
  exportPublicReview,
} from "@/src/services/api/synthScholar";
import type {
  RunReviewRequest,
  CompareRunRequest,
  ProgressEvent,
  ReviewPlan,
  ExportFormat,
  PlanResponseRequest,
} from "@/src/types/synthScholar";

const _LOG_TS_RE = /^\[([^\]]+)\] /;

function _parseLogTimestamp(logEntry: string): string {
  const m = logEntry.match(_LOG_TS_RE);
  if (!m) return new Date().toISOString();
  const ts = m[1];
  if (ts.length > 8 && (ts.includes("T") || ts.includes("-"))) {
    return new Date(ts).toISOString();
  }
  return new Date(`${new Date().toISOString().slice(0, 10)}T${ts}Z`).toISOString();
}

// ── System ───────────────────────────────────────────────────────────

export function useSynthScholarHealth() {
  return useQuery({
    queryKey: ["synth-scholar", "health"],
    queryFn: getHealth,
    staleTime: 60_000,
  });
}

export function useRoBTools() {
  return useQuery({
    queryKey: ["synth-scholar", "rob-tools"],
    queryFn: getRoBTools,
    staleTime: 300_000,
  });
}

// ── Reviews ──────────────────────────────────────────────────────────

export function useReviews() {
  return useQuery({
    queryKey: ["synth-scholar", "reviews"],
    queryFn: listReviews,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.some((r) => r.status === "running" || r.status === "pending" || r.status === "plan_pending")) {
        return 5_000;
      }
      return false;
    },
  });
}

export function useReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["synth-scholar", "review", reviewId],
    queryFn: () => getReview(reviewId!),
    enabled: !!reviewId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running" || status === "pending" || status === "plan_pending") return 5_000;
      return false;
    },
  });
}

/** One-shot fetch of the persisted log/event trail for a completed review.
    Used by the public provenance page to render the at-rest pipeline timeline
    (no SSE — the review is already done by the time provenance is viewed). */
export function useReviewLog(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["synth-scholar", "review-log", reviewId],
    queryFn: () => getReviewLog(reviewId!),
    enabled: !!reviewId,
    staleTime: 60_000, // log of a completed review doesn't change
  });
}

export function useReviewStatus(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["synth-scholar", "review-status", reviewId],
    queryFn: () => getReviewStatus(reviewId!),
    enabled: !!reviewId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "running" || status === "pending" || status === "plan_pending") return 3_000;
      return false;
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: RunReviewRequest) => createReview(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
    },
  });
}

export function useCreateCompareReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: CompareRunRequest) => createCompareReview(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
    },
  });
}

export function useSetReviewVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, is_public }: { reviewId: string; is_public: boolean }) =>
      setReviewVisibility(reviewId, is_public),
    onSuccess: (_data, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review", reviewId] });
    },
  });
}

export function useSetCacheSharing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, share_to_cache }: { reviewId: string; share_to_cache: boolean }) =>
      setCacheSharingReview(reviewId, share_to_cache),
    onSuccess: (_data, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review", reviewId] });
    },
  });
}

// Shared by the authenticated and public export hooks so the downloaded filename
// is identical either way.
function _downloadExport(blob: Blob, format: ExportFormat, model?: string) {
  const EXT: Record<string, string> = {
    markdown: "md", bibtex: "bib", ttl: "ttl", jsonld: "jsonld", json: "json",
    rubric_markdown: "md", rubric_json: "json",
    charting_markdown: "md", charting_json: "json",
    appraisal_markdown: "md", appraisal_json: "json",
    narrative_summary_markdown: "md", narrative_summary_json: "json",
  };
  const STEM: Record<string, string> = {
    rubric_markdown: "prisma_rubrics", rubric_json: "prisma_rubrics",
    charting_markdown: "prisma_charting", charting_json: "prisma_charting",
    appraisal_markdown: "prisma_appraisal", appraisal_json: "prisma_appraisal",
    narrative_summary_markdown: "prisma_narrative_summary",
    narrative_summary_json: "prisma_narrative_summary",
  };
  const ext = EXT[format] ?? "json";
  const stem = STEM[format] ?? "prisma_review";
  const modelSlug = model ? "_" + model.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") : "";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${stem}${modelSlug}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExportReview() {
  return useMutation({
    mutationFn: ({ reviewId, format, model }: { reviewId: string; format: ExportFormat; model?: string }) =>
      exportReview(reviewId, format, model),
    onSuccess: (blob, { format, model }) => _downloadExport(blob, format, model),
  });
}

// ── Public reads (no sign-in) ────────────────────────────────────────
// Used by /knowledge-base/synth-scholar. Kept separate from the hooks above
// rather than made conditional: the authenticated ones require a session to
// exchange for an ml_service token, so calling them from a public page fails
// before any request goes out. Separate query keys too — a signed-in author
// browsing the public listing must not see their own owner-scoped listing
// served from cache in its place.

export function usePublicReviews() {
  return useQuery({
    queryKey: ["synth-scholar", "public", "reviews"],
    queryFn: listPublicReviews,
    staleTime: 60_000, // published reviews are complete; they do not move
  });
}

export function usePublicReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["synth-scholar", "public", "review", reviewId],
    queryFn: () => getPublicReview(reviewId!),
    enabled: !!reviewId,
    staleTime: 60_000,
  });
}

export function usePublicReviewLog(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["synth-scholar", "public", "review-log", reviewId],
    queryFn: () => getPublicReviewLog(reviewId!),
    enabled: !!reviewId,
    staleTime: 60_000,
  });
}

export function useExportPublicReview() {
  return useMutation({
    mutationFn: ({ reviewId, format, model }: { reviewId: string; format: ExportFormat; model?: string }) =>
      exportPublicReview(reviewId, format, model),
    onSuccess: (blob, { format, model }) => _downloadExport(blob, format, model),
  });
}

// ── SSE Progress ────────────────────────────────────────────────────

// Build a stable signature for dedup. Step + message + timestamp identifies
// an event uniquely across the seed-from-DB path and the live SSE path.
function _eventSignature(e: ProgressEvent): string {
  return `${e.step}|${e.message}|${e.timestamp ?? ""}`;
}

export function useProgressStream(
  reviewId: string | undefined,
  shouldStream: boolean,
  onPlanReview?: (plan: ReviewPlan, event: ProgressEvent) => void,
) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestMessage, setLatestMessage] = useState("");
  const [step, setStep] = useState(0);
  const [isDone, setIsDone] = useState(false);
  // Wall-clock timestamp of the most recent non-keepalive event. Used by the
  // UI to show "last update Ns ago" so a long-running stage with no
  // intermediate events is distinguishable from a stuck/disconnected stream.
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const shouldReconnectRef = useRef(false);
  const isDoneRef = useRef(false);
  const onPlanReviewRef = useRef(onPlanReview);
  onPlanReviewRef.current = onPlanReview;
  // Signatures of every event we've ever appended for this review_id. Lets
  // us skip duplicates when the SSE reconnects (which the backend treats by
  // re-sending the full history, causing the user to see the same
  // "Generating search strategy" / "Plan ready for review" lines repeatedly
  // after a tab visibility change or transient network blip).
  const seenSigsRef = useRef<Set<string>>(new Set());

  const start = useCallback(() => {
    if (!reviewId) return;
    setIsStreaming(true);
    setIsDone(false);
    isDoneRef.current = false;
    shouldReconnectRef.current = false;

    let cleanup: (() => void) | undefined;
    streamProgress(
      reviewId,
      (event) => {
        if (event.event_type === "keepalive") return;
        const sig = _eventSignature(event);
        if (seenSigsRef.current.has(sig)) {
          // Reconnect-replay or duplicate from the backend — drop silently.
          return;
        }
        seenSigsRef.current.add(sig);
        setEvents((prev) => [...prev, event]);
        setLatestMessage(event.message);
        setStep((prev) => Math.max(prev, event.step));
        setLastEventAt(Date.now());
        if (event.event_type === "plan_review" && event.plan && onPlanReviewRef.current) {
          onPlanReviewRef.current(event.plan as ReviewPlan, event);
        }
      },
      () => {
        setIsStreaming(false);
        setIsDone(true);
        isDoneRef.current = true;
        queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
        queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review", reviewId] });
      },
      () => {
        setIsStreaming(false);
        if (!isDoneRef.current) shouldReconnectRef.current = true;
      },
    ).then((c) => { cleanup = c; });

    return () => { cleanup?.(); };
  }, [reviewId, queryClient]);

  useEffect(() => {
    if (!reviewId) return;
    setEvents([]);
    seenSigsRef.current = new Set();  // fresh review → fresh dedup window
    getReviewLog(reviewId).then((data) => {
      setStep((prev) => Math.max(prev, data.step_count));
      const source = data.log_events?.length
        ? data.log_events
        : data.log.length
          ? data.log.map((msg, i) => ({
              step: i + 1,
              message: msg,
              timestamp: _parseLogTimestamp(msg),
            }))
          : null;
      if (source) {
        const seedEvents: ProgressEvent[] = source.map((e) => ({
          review_id: reviewId,
          step: e.step,
          message: e.message,
          timestamp: e.timestamp,
          event_type: "progress" as const,
          source: null,
        }));
        // Seed both the rendered list and the dedup window so the live SSE
        // doesn't re-add events we already loaded from /reviews/{id}/log.
        setEvents((prev) => {
          if (prev.length > 0) return prev;
          for (const e of seedEvents) seenSigsRef.current.add(_eventSignature(e));
          return seedEvents;
        });
      }
    }).catch(() => {});
  }, [reviewId]);

  useEffect(() => {
    if (reviewId && shouldStream) {
      const cleanup = start();
      return cleanup;
    }
  }, [reviewId, shouldStream, start]);

  useEffect(() => {
    if (!isStreaming && !isDone && shouldReconnectRef.current && reviewId) {
      const timeout = setTimeout(() => {
        shouldReconnectRef.current = false;
        start();
      }, 3_000);
      return () => clearTimeout(timeout);
    }
  }, [isStreaming, isDone, reviewId, start]);

  // Reset the "last update Ns ago" clock when the user comes back to the
  // tab. While the tab was hidden, browsers throttle timers / pause some
  // network activity, so the freshness clock would show a misleading large
  // gap (the "⚠ last update 70s ago" the user reported on tab return). Just
  // bumping lastEventAt to "now" on visibility change keeps the warning
  // honest — it'll only re-trigger if events genuinely stop arriving AFTER
  // the user is back on this tab.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "visible" && isStreaming) {
        setLastEventAt(Date.now());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isStreaming]);

  return { events, isStreaming, latestMessage, step, isDone, lastEventAt };
}

export function usePlanResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, body }: { reviewId: string; body: PlanResponseRequest }) =>
      submitPlanResponse(reviewId, body),
    onSuccess: (_data, { reviewId }) => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review-status", reviewId] });
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review", reviewId] });
    },
  });
}

export function useCancelReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => cancelReview(reviewId),
    onSuccess: (_data, reviewId) => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review", reviewId] });
    },
  });
}

export function useRetryReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, body }: {
      reviewId: string;
      body?: {
        enable_cache?: boolean;
        resume?: boolean;
        openrouter_api_key?: string;
      };
    }) => retryReview(reviewId, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "review", data.review_id] });
    },
  });
}
