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

// `npx brainkb install` registers production by default; add this on sandbox.
export const MCP_FLAG = /\/\/mcp\.sandbox\./.test(MCP_ENDPOINT) ? " --mcp sandbox" : "";

// The MCP server's own site (full per-client setup, FAQ), e.g. https://mcp.brainkb.org.
export const MCP_SITE = MCP_ENDPOINT.replace(/\/mcp$/, "");

// Setup per client, as on the MCP server's site (MCP_SITE). `tested` marks the
// ✓ shown there; steps use `code` for inline code.
export const MCP_CLIENTS = [
  {
    name: "Claude Code",
    tested: [true],
    title: "Claude Code · terminal",
    cmd: `claude mcp add --scope user --transport http brainkb ${MCP_ENDPOINT}`,
    steps: [
      "Start `claude` and say “log me in to BrainKB”; it hands you a browser link.",
      "Want the optional BrainKB skill too? Its installer also adds this server: see Set up below.",
    ],
  },
  {
    name: "Codex",
    tested: [false],
    title: "Codex · ~/.codex/config.toml",
    cmd: `[mcp_servers.brainkb]\nurl = "${MCP_ENDPOINT}"`,
    steps: [
      "Add it to `~/.codex/config.toml`, start `codex`, and say “log me in to BrainKB”.",
      "The optional BrainKB skill for Codex is under Set up below.",
    ],
  },
  {
    name: "Perplexity · claude.ai · ChatGPT",
    tested: [true, true, false],
    title: "Connector apps · add a custom connector",
    copyLabel: "Copy URL",
    copy: MCP_ENDPOINT,
    cmd: `1. Open the app's connector settings
     Perplexity   Settings → Connectors → + Custom connector
     claude.ai    Settings → Connectors → Add custom connector
     ChatGPT      Settings → Apps & Connectors → Create (developer mode)
2. Server URL      ${MCP_ENDPOINT}
3. Authentication  OAuth (leave client ID and secret empty)
4. Sign in on the BrainKB page that opens, then allow access`,
    steps: ["Only reading open knowledge? No need to log in: public spaces can be listed, searched and read without authentication."],
  },
  {
    name: "Cursor",
    tested: [true],
    title: "Cursor · ~/.cursor/mcp.json",
    cmd: `{\n  "mcpServers": {\n    "brainkb": { "url": "${MCP_ENDPOINT}" }\n  }\n}`,
    steps: [
      "Open Customize → MCPs → New MCP Server (classic editor: Cursor Settings → MCP → Add new MCP server). Either opens `~/.cursor/mcp.json`.",
      "Paste the snippet and save. If `brainkb` shows Needs login, click it and sign in on the BrainKB page.",
      "Start a New Chat and ask; Cursor asks before running each tool.",
    ],
  },
  {
    name: "VS Code",
    tested: [true],
    title: "VS Code · .vscode/mcp.json",
    cmd: `{\n  "servers": {\n    "brainkb": { "type": "http", "url": "${MCP_ENDPOINT}" }\n  }\n}`,
    steps: [
      "Create the file, or run MCP: Add Server → HTTP from the Command Palette and paste the URL. For every workspace, use MCP: Open User Configuration.",
      "Click Start above `brainkb`, accept the sign-in prompt, and sign in on the BrainKB page.",
      "Open Copilot Chat in Agent mode, enable the BrainKB tools, and ask your question.",
    ],
  },
  {
    name: "Copilot in VS Code",
    tested: [true],
    title: "GitHub Copilot · ~/.copilot/mcp-config.json",
    cmd: `{\n  "mcpServers": {\n    "brainkb": {\n      "type": "http",\n      "url": "${MCP_ENDPOINT}",\n      "tools": ["*"]\n    }\n  }\n}`,
    steps: [
      "Create `~/.copilot/mcp-config.json`. It applies to Copilot everywhere, even with no folder open.",
      "Paste the snippet and save. `\"tools\": [\"*\"]` enables every BrainKB tool; list tool names to allow only some.",
      "Open Copilot Chat in Agent mode, sign in when prompted, and ask. Approve each tool call when asked.",
    ],
  },
  {
    name: "Other clients",
    tested: [false],
    title: "Clients that only run local (stdio) servers · via mcp-remote",
    cmd: `{\n  "mcpServers": {\n    "brainkb": {\n      "command": "npx",\n      "args": ["-y", "mcp-remote", "${MCP_ENDPOINT}"]\n    }\n  }\n}`,
    steps: [
      "Paste into the client's MCP config (e.g. Claude Desktop, Windsurf) and restart it. Needs Node.js.",
      "`mcp-remote` opens the BrainKB sign-in page in your browser on first connect.",
    ],
  },
];
