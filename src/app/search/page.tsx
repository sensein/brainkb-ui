/**
 * Search — results page for the Home hero search, ported from the landing
 * redesign handoff (search.html). Results are sample data for now; see
 * SearchView. Renders standalone, outside the app chrome — see SiteChrome.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import SearchView from "./SearchView";
import "./search.css";

export const metadata: Metadata = {
  title: "Search",
  description: "Search BrainKB: cell types, brain regions, genes, papers, reviews and spaces, with provenance on every fact.",
};

export default function SearchPage() {
  return (
    <div className={`sp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense>
        <SearchView />
      </Suspense>
      <MarketingFooter />
    </div>
  );
}
