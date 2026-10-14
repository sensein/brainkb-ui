/**
 * Registry of workflow tools surfaced from the user dashboard.
 *
 * Each entry has a stable `pageKey` that the admin uses in /admin/page-access
 * to grant roles or specific users access. By default, with no page-access
 * entry, PageAccessGate denies entry — i.e. all tools start disabled.
 */

export interface ToolEntry {
  pageKey: string;
  href: string;
  title: string;
  description: string;
  icon: string; // bkb design-system icon name
  color: string; // CSS color token
  /**
   * If true, this tool is locked to admins regardless of any page-access
   * entry. Wrap the tool's page in `<PageAccessGate pageKey=... adminOnly>`
   * to enforce on the client. Admin-only tools are skipped from the
   * "unregistered tools" banner in /admin/page-access since registering
   * them in the page-access table is a no-op (the gate ignores roles when
   * adminOnly is set).
   */
  adminOnly?: boolean;
  /**
   * If true, every signed-in user gets this tool without a page-access entry,
   * because the backend already scopes what each person can do there (e.g.
   * Spaces: you only manage spaces you own). Skipped by /admin/page-access.
   */
  openToAll?: boolean;
}

/**
 * Every tool, including any currently disabled by a feature flag. Exported for
 * places that need the complete set (e.g. resolving a page title for a route that
 * is temporarily hidden). Use TOOL_REGISTRY for anything user-facing.
 */
export const ALL_TOOLS: ToolEntry[] = [
  {
    pageKey: "tools.ingest-kg",
    href: "/user/ingest-kg",
    title: "Ingest KGs",
    description: "Upload Knowledge Graph files in JSON-LD or Turtle to a named graph.",
    icon: "database",
    color: "var(--bkb-primary)",
  },
  {
    pageKey: "tools.spaces",
    href: "/user/spaces",
    title: "Spaces",
    description: "See your spaces, make them public or private, and share them with your team.",
    icon: "graph",
    color: "var(--bkb-evidence)",
    openToAll: true,
  },
  {
    pageKey: "tools.job-status",
    href: "/user/job-status",
    title: "Job status",
    description: "Track in-flight ingestion jobs.",
    icon: "history",
    color: "var(--bkb-publication)",
  },
  {
    pageKey: "tools.synth-scholar",
    href: "/user/synth-scholar",
    title: "SynthScholar",
    description: "Literature review (PRISMA-guided).",
    icon: "agent",
    color: "var(--bkb-accent)",
  },
  {
    pageKey: "tools.profile",
    href: "/user/profile",
    title: "Profile",
    description: "Update your profile details, organisations, and expertise.",
    icon: "person",
    color: "var(--bkb-textMuted)",
  },
];

/**
 * The tools actually surfaced to users. A separate export from ALL_TOOLS in case a
 * future flag needs to filter it again, but currently just the full list — the old
 * NER/resource-extraction tools (structsense + Mongo backed) were removed entirely
 * rather than feature-flagged; the graph-native replacement (agent skills) doesn't
 * need a dashboard tool entry the same way.
 */
export const TOOL_REGISTRY: ToolEntry[] = ALL_TOOLS;
