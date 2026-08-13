/**
 * Registry of workflow tools surfaced from the user dashboard.
 *
 * Each entry has a stable `pageKey` that the admin uses in /admin/page-access
 * to grant roles or specific users access. By default, with no page-access
 * entry, PageAccessGate denies entry — i.e. all tools start disabled.
 */

import {
  ENABLE_EXTRACTION_TOOLS,
  EXTRACTION_TOOL_PAGE_KEYS,
} from "@/src/config/featureFlags";

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
    pageKey: "tools.ner-extraction",
    href: "/user/sie",
    title: "NER extraction",
    description: "Extract neuroscience named entities from text via multi-agent systems.",
    icon: "agent",
    color: "var(--bkb-agent)",
  },
  {
    pageKey: "tools.extract-resource",
    href: "/user/extract-resource",
    title: "Resource extraction",
    description: "Extract structured resources from unstructured documents.",
    icon: "evidence",
    color: "var(--bkb-evidence)",
  },
  {
    pageKey: "tools.job-status",
    href: "/user/job-status",
    title: "Job status",
    description: "Track in-flight ingestion and extraction jobs.",
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
 * The tools actually surfaced to users. Filtering here rather than at each call
 * site means the dashboard tiles, the /admin/page-access seed list, and the user
 * breadcrumb all agree without three separate checks.
 *
 * Extraction tools are hidden while ENABLE_EXTRACTION_TOOLS is off — ml_service does
 * not register the /ws/ner, /ws/extract-resources or /ws/pdf2reproschema endpoints
 * they depend on. Nothing is deleted: flip the flag and they return.
 */
export const TOOL_REGISTRY: ToolEntry[] = ALL_TOOLS.filter(
  (t) =>
    ENABLE_EXTRACTION_TOOLS ||
    !(EXTRACTION_TOOL_PAGE_KEYS as readonly string[]).includes(t.pageKey),
);
