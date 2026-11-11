/**
 * Legal — a numbered row per policy and a search box over all of them. The policies are
 * YAML files in ./content (see content/README.md).
 */

import type { Metadata } from "next";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import LegalIndex from "./LegalIndex";
import { formatDate, loadPageText, loadPolicies, searchDocs } from "./content";
import { sectionId } from "./search";
import "../components/marketing/landing/landing.css";
import "./legal.css";

export const metadata: Metadata = {
  title: "Legal",
  description: "BrainKB's privacy, fair use, data sharing, data processing and other policies.",
};

export default function LegalPage() {
  const policies = loadPolicies();
  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />
      <main className="wrap">
        <LegalIndex
          text={loadPageText()}
          rows={policies.map((p) => ({
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            last_updated: p.last_updated,
            updated: formatDate(p.last_updated, "short"),
            sections: p.sections.map((s) => ({ id: sectionId(s.title), title: s.title })),
          }))}
          docs={searchDocs(policies)}
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
