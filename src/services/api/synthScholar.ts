/**
 * SynthScholar API client.
 *
 * Talks to ml_service's `/api/synth-scholar/*` surface. Every call carries a
 * Bearer token obtained from ml_service's `/api/token` endpoint (using the
 * JWT_USER/JWT_PASSWORD service-account credentials configured in env). The
 * caller's identity is stamped onto each review by the backend via the
 * NextAuth session — see ml_service/core/synth_scholar/routes.py.
 *
 * Ported from aep-knowledge-synthesis/ui/src/lib/api.ts with two changes:
 * (1) base URL pulled from NEXT_PUBLIC_ML_SERVICE_API_BASE, (2) auth header
 * injected on every fetch via getMlServiceToken().
 */

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

// ── Auth token cache ──────────────────────────────────────────────────
// Token comes from ml_service's /api/token. We cache it in-memory until it
// expires (or a 401 forces a refresh).

let _cachedToken: string | null = null;
let _tokenExpiresAt = 0;

async function getMlServiceToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && _cachedToken && now < _tokenExpiresAt) {
    return _cachedToken;
  }
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE;
  const email = process.env.NEXT_PUBLIC_JWT_USER;
  const password = process.env.NEXT_PUBLIC_JWT_PASSWORD;
  if (!tokenEndpoint || !email || !password) {
    throw new Error(
      "ml_service token credentials missing — set NEXT_PUBLIC_TOKEN_ENDPOINT_ML_SERVICE, NEXT_PUBLIC_JWT_USER, NEXT_PUBLIC_JWT_PASSWORD in .env.local",
    );
  }
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`ml_service token fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  const token: string = data.access_token || data.token;
  if (!token) throw new Error("ml_service /api/token returned no access_token");
  _cachedToken = token;
  // ml_service tokens default to 30-min expiry; cache for 25 to be safe.
  _tokenExpiresAt = now + 25 * 60 * 1000;
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
