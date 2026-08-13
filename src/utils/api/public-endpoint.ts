/**
 * Maps an ml_service read endpoint to its unauthenticated `/public/` sibling.
 *
 *   https://mlservice.brainkb.org/api/ner
 *     -> https://mlservice.brainkb.org/api/public/ner
 *   https://mlservice.brainkb.org/api/structured-resource
 *     -> https://mlservice.brainkb.org/api/public/structured-resource
 *
 * Why derive instead of adding env vars: the endpoint reaches these routes from the
 * YAML page config, and the resources pages read
 * NEXT_PUBLIC_API_ADMIN_GET_STRUCTURED_RESOURCE_ENDPOINT — the same variable the
 * authenticated admin views use, despite serving the public page. Repointing it would
 * move both. Rewriting here touches only the withouttoken routes, which are by
 * definition the anonymous path.
 *
 * The authenticated routes require a credential (get_current_user rejects with 403
 * "Not authenticated" before scopes are even checked), which is why the public
 * knowledge-base pages could not read their own data.
 */

/** Already-public paths pass through unchanged, so this is safe to apply twice. */
export function toPublicEndpoint(endpoint: string): string {
  if (!endpoint) return endpoint;
  try {
    const url = new URL(endpoint);
    if (url.pathname.includes("/api/public/")) return endpoint;
    url.pathname = url.pathname.replace(/\/api\/(?!public\/)/, "/api/public/");
    return url.toString();
  } catch {
    // Relative or malformed value — the caller's own validation will surface it.
    return endpoint.includes("/api/public/")
      ? endpoint
      : endpoint.replace(/\/api\/(?!public\/)/, "/api/public/");
  }
}
