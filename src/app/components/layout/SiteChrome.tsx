"use client";

/**
 * Site-wide chrome: the new MarketingHeader/MarketingFooter (see
 * design_handoff_brainkb_site/README.md) wrap every route, including the
 * logged-in app area (dashboard, admin, tools). The public marketing pages
 * (Home, MCP & Skills, Explore) are fully standalone — they render their own
 * copies of the header/footer directly and skip this wrapper's <Theme>/<main>
 * entirely. Every other route keeps <Theme> (its --bkb-* CSS tokens are still
 * load-bearing for existing page content/styling) with the new header/footer
 * in place of the old Navbar/Footer.
 */

import { usePathname } from "next/navigation";
import MarketingHeader from "../marketing/MarketingHeader";
import MarketingFooter from "../marketing/MarketingFooter";
import { Theme } from "@/src/app/components/design-system";

const MARKETING_ROUTES = new Set(["/", "/mcp", "/skills", "/explore"]);

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname !== null && MARKETING_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <MarketingHeader />
      {/* No pt-16 spacer here: MarketingHeader is `position: sticky` (in
          document flow), unlike the old Navbar's `position: fixed`, which
          needed that padding to keep from covering page content. */}
      <Theme theme="light" style={{ background: "#f0eee9" }}>
        <main className="flex min-h-screen flex-col">{children}</main>
      </Theme>
      <MarketingFooter />
    </>
  );
}
