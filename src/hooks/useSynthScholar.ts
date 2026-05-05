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

export function useExportReview() {
  return useMutation({
    mutationFn: ({ reviewId, format, model }: { reviewId: string; format: ExportFormat; model?: string }) =>
      exportReview(reviewId, format, model),
    onSuccess: (blob, { format, model }) => {
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
    },
  });
}

// ── SSE Progress ────────────────────────────────────────────────────

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
        setEvents((prev) => (prev.length === 0 ? seedEvents : prev));
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
    mutationFn: ({ reviewId, body }: { reviewId: string; body?: { enable_cache?: boolean; resume?: boolean } }) =>
      retryReview(reviewId, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["synth-scholar", "reviews"] });
      queryClient.setQueryData(["synth-scholar", "review", data.review_id], undefined);
    },
  });
}
