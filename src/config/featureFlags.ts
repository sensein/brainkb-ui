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
