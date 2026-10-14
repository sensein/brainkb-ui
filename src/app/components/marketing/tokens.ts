import { env } from "@/src/config/env";

// Design tokens for the public marketing pages (palette from the landing
// redesign). Kept as plain values (not Tailwind
// theme extensions) since these are deliberately scoped to three pages, not
// the whole site's design system.
export const COLORS = {
  // Cool white/blue palette from the landing redesign (index.html handoff):
  // white page, pale blue-gray bands, ink text, one blue accent.
  pageBg: "#ffffff",
  bandBg: "#f5f7fc",
  cardBg: "#ffffff",
  ink: "#0b1628",
  body: "#3d4a5c",
  muted: "#6b7789",
  border: "#e4e8ef",
  borderStrong: "#cdd6e6",
  bandDivider: "#dbe3f0",
  accent: "#1d4ed8",
  // Kept as a separate key so pages can still tell link/title accents from
  // the primary accent; in this palette it is the darker blue.
  accentPurple: "#1e40af",
  secondaryAction: "#1d4ed8",
  chipBg: "#eff6ff",
  cellTypes: "#1d4ed8",
  regions: "#b45309",
  datasets: "#0e7490",
  literature: "#6d28d9",
} as const;

// Shared card look for Home / Explore / Skills, so the three pages stay in
// step. Surface only — each page supplies its own layout and contents.
export const CARD_SURFACE = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 26,
} as const;

export const CARD_TITLE_FONT = "400 25px/1.1 var(--font-instrument-serif), serif";

// Per deployment (sandbox vs prod) — set NEXT_PUBLIC_MCP_BASE_URL; see src/config/env.ts.
export const MCP_ENDPOINT = env.mcpEndpoint;

export const MCP_CLIENTS = [
  {
    name: "Claude Code",
    hint: "# run in your terminal",
    cmd: `claude mcp add --transport http brainkb ${MCP_ENDPOINT}`,
  },
  {
    name: "Claude Desktop",
    hint: "# claude_desktop_config.json",
    cmd: `"brainkb": {\n  "url": "${MCP_ENDPOINT}"\n}`,
  },
  {
    name: "Cursor",
    hint: "# .cursor/mcp.json",
    cmd: `"mcpServers": {\n  "brainkb": { "url": "${MCP_ENDPOINT}" }\n}`,
  },
] as const;
