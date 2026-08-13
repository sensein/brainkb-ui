/**
 * Test / development feature flags.
 *
 * Toggled at build time via NEXT_PUBLIC_* env vars; the constants below
 * provide secure-by-default values so a missing .env entry doesn't open
 * up the app.
 */

/**
 * Controls the per-page RBAC gate that runs against the user-management
 * backend's `/api/access/page/<page_key>` endpoint.
 *
 * - `true` (default, secure): every tool is gated by the backend. New tools
 *   are off until an admin grants access through /admin/page-access.
 * - `false`: every tool listed in TOOL_REGISTRY is treated as accessible
 *   for *authenticated* users regardless of what the backend says. Use
 *   only for local dev when you don't want to seed page-access rows.
 *
 * Set via `NEXT_PUBLIC_ENABLE_PAGE_ACCESS_GATE` (e.g. `=false` to turn off).
 * Authentication is *always* required regardless of this flag — bypassing
 * RBAC never bypasses sign-in.
 */
export const ENABLE_PAGE_ACCESS_GATE: boolean =
  process.env.NEXT_PUBLIC_ENABLE_PAGE_ACCESS_GATE === "false" ? false : true;

/**
 * Controls the multi-agent EXTRACTION tools in the signed-in user section:
 * NER extraction (/user/sie), Resource extraction (/user/extract-resource) and
 * PDF -> ReproSchema (/user/pdf2reproschema).
 *
 * OFF by default, because the backend cannot currently serve them. ml_service no
 * longer installs the `structsense` package — it pins aiohttp below 3.10 through an
 * old crewai/litellm, which breaks openai's import and took `synthscholar` (every
 * /api/synth-scholar route) down with it. With it gone, ml_service does not register
 * /ws/ner, /ws/extract-resources or /ws/pdf2reproschema at all, so these pages would
 * fail on connect.
 *
 * This hides the tools rather than deleting them: the pages, the WebSocket client and
 * the API routes are all intact, and flipping this to "true" brings them straight
 * back once structsense is reinstalled.
 *
 * READ-ONLY views are NOT affected and must keep working — /knowledge-base/ner and
 * /knowledge-base/[slug] read already-extracted annotations through GET /api/ner,
 * which does not need structsense.
 *
 * Set `NEXT_PUBLIC_ENABLE_EXTRACTION_TOOLS=true` to re-enable.
 */
export const ENABLE_EXTRACTION_TOOLS: boolean =
  process.env.NEXT_PUBLIC_ENABLE_EXTRACTION_TOOLS === "true";

/** pageKeys in TOOL_REGISTRY that ENABLE_EXTRACTION_TOOLS governs. */
export const EXTRACTION_TOOL_PAGE_KEYS = [
  "tools.ner-extraction",
  "tools.extract-resource",
  "tools.pdf2reproschema",
] as const;

/** Routes ENABLE_EXTRACTION_TOOLS governs, for nav filtering and page gating. */
export const EXTRACTION_TOOL_HREFS = [
  "/user/sie",
  "/user/extract-resource",
  "/user/pdf2reproschema",
] as const;
