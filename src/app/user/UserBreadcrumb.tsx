"use client";

/**
 * Breadcrumb strip rendered above every /user/* page (except the dashboard
 * itself). Provides:
 *   - Top padding so the tool's H1 doesn't crowd the fixed site navbar.
 *   - A "← Back to dashboard" link so users always have a way out of a
 *     deep tool route.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FONTS, Icon } from "@/src/app/components/design-system";
import { ALL_TOOLS } from "@/src/config/toolRegistry";

export function UserBreadcrumb() {
  const pathname = usePathname() ?? "";

  // Hide on the dashboard itself — we don't want a "Back to dashboard"
  // link when the user is already on it.
  if (pathname === "/user/dashboard" || pathname === "/user") return null;

  // Look up a friendly label from the tool registry; fall back to the last
  // path segment if the route isn't registered (e.g. /user/profile).
  // ALL_TOOLS, not TOOL_REGISTRY: a tool hidden by a feature flag still needs a
  // proper title if someone reaches its URL directly.
  const tool = ALL_TOOLS.find((t) => t.href === pathname);
  const fallbackLabel = pathname.split("/").pop() ?? "Tool";
  const label = tool?.title ?? fallbackLabel.replace(/[-_]/g, " ");

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "20px 32px 0",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: "var(--bkb-textMuted)",
        fontFamily: FONTS.body,
      }}
    >
      <Link
        href="/user/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--bkb-primary)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        <Icon name="arrow" size={12} style={{ transform: "rotate(180deg)" }} /> Back to dashboard
      </Link>
      <span style={{ color: "var(--bkb-textSubtle)" }}>/</span>
      <span style={{ textTransform: "capitalize" }}>{label}</span>
    </div>
  );
}
