/**
 * SynthScholar API client.
 *
 * Talks to ml_service's `/api/synth-scholar/*` surface. Every call carries a
 * Bearer token for ml_service obtained via SSO session-exchange — the logged-in
 * user's session is swapped for a short-lived `aud=ml_service` token
 * (getAuthTokenForService('ml')). No service-account password: the caller's own
 * identity is used, and the review is attributed to them by the backend.
 *
 * Ported from aep-knowledge-synthesis/ui/src/lib/api.ts; auth is injected on
 * every fetch via getMlServiceToken(), which now uses the session, not
 * JWT_USER/JWT_PASSWORD.
 */

import { getAuthTokenForService } from "@/src/utils/api/auth";
import type {
  RunReviewRequest,
  CompareRunRequest,
  ReviewSummary,
  ReviewDetail,
  ProgressEvent,
  HealthResponse,
  RoBToolInfo,
  ExportFormat,
  PlanResponseRequest,
  ReviewPlan,
  ReviewStatus,
  LogEvent,
} from "@/src/types/synthScholar";

const API_BASE = (process.env.NEXT_PUBLIC_ML_SERVICE_API_BASE || "http://localhost:8007").replace(/\/+$/, "") + "/api/synth-scholar";

// ── Auth token ────────────────────────────────────────────────────────
// SSO: exchange the logged-in user's session for a short-lived ml_service token
// (getAuthTokenForService('ml') → /api/auth/session-exchange). No service-account
// password. Cached briefly; a 401 forces a fresh exchange.

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getMlServiceToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && _cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }
  const token = await getAuthTokenForService("ml");
  if (!token) {
    throw new Error(
      "Not authenticated for ml_service — please sign in (SynthScholar uses your session, not a service account).",
    );
  }
  _cachedToken = token;
  // Per-service access tokens are short-lived (~15 min); cache for 10 to be safe.
  _tokenExpiresAt = now + 10 * 60 * 1000;
  return token;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function formatApiDetail(detail: unknown, status: number): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          const obj = d as { loc?: unknown[]; msg?: string };
          const loc = Array.isArray(obj.loc) ? obj.loc.filter((x) => x !== "body").join(".") : "";
          const msg = obj.msg ?? JSON.stringify(d);
          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(d);
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (detail && typeof detail === "object") {
    try { return JSON.stringify(detail); } catch { /* fallthrough */ }
  }
  return `API error: ${status}`;
}

async function fetchJSON<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const token = await getMlServiceToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    ...init,
  });
  if (res.status === 401 && !retried) {
    // Token may have expired between our cache window and the server's; one retry.
    await getMlServiceToken(true);
    return fetchJSON<T>(path, init, true);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(formatApiDetail((body as any)?.detail, res.status));
  }
  return res.json();
}

// ── System ───────────────────────────────────────────────────────────

export async function getHealth(): Promise<HealthResponse> {
  return fetchJSON("/health");
}

export async function getRoBTools(): Promise<RoBToolInfo[]> {
  return fetchJSON("/rob-tools");
}

// ── Reviews ──────────────────────────────────────────────────────────

export async function createReview(req: RunReviewRequest): Promise<ReviewSummary> {
  return fetchJSON("/reviews", { method: "POST", body: JSON.stringify(req) });
}

export async function createCompareReview(
  req: CompareRunRequest,
): Promise<{ review_id: string; status: ReviewStatus; compare_models: string[]; created_at: string }> {
  return fetchJSON("/reviews/compare", { method: "POST", body: JSON.stringify(req) });
}

export async function listReviews(): Promise<ReviewSummary[]> {
  return fetchJSON("/reviews");
}

export async function getReview(reviewId: string): Promise<ReviewDetail> {
  return fetchJSON(`/reviews/${reviewId}`);
}

export async function getReviewStatus(reviewId: string): Promise<ReviewSummary> {
  return fetchJSON(`/reviews/${reviewId}/status`);
}

export async function deleteReview(reviewId: string): Promise<void> {
  await fetchJSON(`/reviews/${reviewId}`, { method: "DELETE" });
}

export async function submitPlanResponse(
  reviewId: string,
  body: PlanResponseRequest,
): Promise<{ review_id: string; status: ReviewStatus; iteration: number; plan?: ReviewPlan }> {
  return fetchJSON(`/reviews/${reviewId}/plan-response`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function setReviewVisibility(reviewId: string, is_public: boolean): Promise<ReviewSummary> {
  return fetchJSON(`/reviews/${reviewId}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ is_public }),
  });
}

export async function setCacheSharingReview(
  reviewId: string,
  share_to_cache: boolean,
): Promise<ReviewSummary> {
  return fetchJSON(`/reviews/${reviewId}/cache-sharing`, {
    method: "PATCH",
    body: JSON.stringify({ share_to_cache }),
  });
}

export async function cancelReview(reviewId: string): Promise<ReviewSummary> {
  return fetchJSON(`/reviews/${reviewId}/cancel`, { method: "POST" });
}

export async function retryReview(
  reviewId: string,
  body?: {
    enable_cache?: boolean;
    resume?: boolean;
    /** Required by the backend — the key is intentionally not persisted with
        the original review (see RetryRequest in schemas.py), so every retry
        must provide it again. Resolve via resolveOpenRouterKey() before call. */
    openrouter_api_key?: string;
  },
): Promise<ReviewSummary> {
  return fetchJSON(`/reviews/${reviewId}/retry`, {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function getReviewLog(reviewId: string): Promise<{
  review_id: string;
  status: string;
  step_count: number;
  log: string[];
  log_events?: LogEvent[];
}> {
  return fetchJSON(`/reviews/${reviewId}/log`);
}

// ── Public (unauthenticated) reads ────────────────────────────────────
// For /knowledge-base/synth-scholar, which anyone can open. These MUST NOT touch
// getMlServiceToken(): an anonymous visitor has no session to exchange, so asking
// for a token throws before the request is made — that is the "ML service requires
// a signed-in session" error the public pages were failing with.
//
// They hit ml_service's /public/* routes, which serve only reviews their author
// marked Public and return 404 for anything else. Server-side filtering matters:
// the authenticated /reviews listing is owner-scoped, so using it here showed a
// visitor their own reviews rather than the published ones.

async function fetchPublicJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/public${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(formatApiDetail((body as any)?.detail, res.status));
  }
  return res.json();
}

export async function listPublicReviews(): Promise<ReviewSummary[]> {
  return fetchPublicJSON("/reviews");
}

export async function getPublicReview(reviewId: string): Promise<ReviewDetail> {
  return fetchPublicJSON(`/reviews/${reviewId}`);
}

export async function getPublicReviewLog(reviewId: string): Promise<{
  review_id: string;
  status: string;
  step_count: number;
  log: string[];
  log_events?: LogEvent[];
}> {
  return fetchPublicJSON(`/reviews/${reviewId}/log`);
}

export async function exportPublicReview(
  reviewId: string,
  format: ExportFormat,
  model?: string,
): Promise<Blob> {
  const params = new URLSearchParams({ format });
  if (model) params.set("model", model);
  const res = await fetch(`${API_BASE}/public/reviews/${reviewId}/export?${params}`);
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = formatApiDetail((body as any)?.detail, res.status);
    } catch {
      try { detail = await res.text(); } catch { /* ignore */ }
    }
    throw new Error(detail || `Export failed (HTTP ${res.status})`);
  }
  return res.blob();
}

// ── Export ────────────────────────────────────────────────────────────

export async function exportReview(
  reviewId: string,
  format: ExportFormat,
  model?: string,
): Promise<Blob> {
  const token = await getMlServiceToken();
  const params = new URLSearchParams({ format });
  if (model) params.set("model", model);
  const res = await fetch(`${API_BASE}/reviews/${reviewId}/export?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = formatApiDetail((body as any)?.detail, res.status);
    } catch {
      try { detail = await res.text(); } catch { /* ignore */ }
    }
    throw new Error(detail || `Export failed (HTTP ${res.status})`);
  }
  return res.blob();
}

// ── SSE Progress Stream ──────────────────────────────────────────────
// EventSource doesn't expose headers, so we pass the auth token as a query
// parameter. The ml_service backend's get_current_user accepts both header
// and query-string variants for SSE compatibility (existing pattern; see
// authenticate_websocket() in core/security.py).

export async function streamProgress(
  reviewId: string,
  onEvent: (event: ProgressEvent) => void,
  onDone?: () => void,
  onError?: (err: Error) => void,
): Promise<() => void> {
  const token = await getMlServiceToken();
  const url = `${API_BASE}/reviews/${reviewId}/stream?token=${encodeURIComponent(token)}`;
  const evtSource = new EventSource(url);

  evtSource.onmessage = (e) => {
    try {
      const data: ProgressEvent = JSON.parse(e.data);
      onEvent(data);
      if (
        data.message?.startsWith("Review completed") ||
        data.message?.startsWith("Review failed")
      ) {
        evtSource.close();
        onDone?.();
      }
    } catch {
      // skip malformed events
    }
  };

  evtSource.onerror = () => {
    evtSource.close();
    onError?.(new Error("SSE connection lost"));
  };

  return () => evtSource.close();
}
