// Design tokens for the public marketing pages, from
// design_handoff_brainkb_site/README.md. Kept as plain values (not Tailwind
// theme extensions) since these are deliberately scoped to three pages, not
// the whole site's design system.
export const COLORS = {
  pageBg: "#f4f1ea",
  bandBg: "#ece7dc",
  cardBg: "#fbfaf6",
  ink: "#16181a",
  body: "#4a4d50",
  muted: "#7a7568",
  border: "#dcd6c9",
  borderStrong: "#bdb6a6",
  bandDivider: "#d3ccbd",
  // Trying a two-color split: accent stays green for eyebrows/links/active
  // states, secondaryAction is the trial color for CTA button backgrounds
  // (was solid `ink` black).
  accent: "#1f6f5c",
  // Matches the source-node labels in the hero's FloatingGraph, so the Home
  // cards echo the figure directly above them.
  accentPurple: "#4a3f9e",
  secondaryAction: "#30ab8e",
  chipBg: "#e1ece6",
  cellTypes: "#1f6f5c",
  regions: "#5b6fb3",
  datasets: "#c0643a",
  literature: "#b3923a",
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

export const MCP_ENDPOINT = "https://mcp.brainkb.org/mcp";

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
