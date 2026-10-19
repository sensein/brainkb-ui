"use client";

/**
 * Explore — data-type cards. Content is placeholder — real data to fetch in
 * production: data types with counts. Uses the Home page's design (the `.lp`
 * classes in components/marketing/landing/landing.css).
 */

import { useState } from "react";
import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import "../components/marketing/landing/landing.css";

// `href: null` means that data type has no browse page yet — the card renders
// as plain text until one exists. `note`, when set, shows as a muted line on the card.
const TYPES: { name: string; icon: string; desc: string; sources: string; programs: readonly string[]; href: string | null; note?: string }[] = [
  { name: "Cell types", icon: "◉", desc: "Taxonomies and cell-type definitions with markers and regions.", sources: "BICAN", programs: ["BICAN"], href: null },
  { name: "Library generation", icon: "▦", desc: "The path from donor to sequencing library — brain slabs, tissue samples, the cell samples derived from them, and the cDNA, libraries, and aliquots they produce.", sources: "BICAN", programs: ["BICAN"], href: "/browse/library-generation", note: "Temporary — this card will be removed." },
  { name: "BICAN Resources", icon: "▣", desc: "All resources published by the BICAN consortium.", sources: "BICAN", programs: ["BICAN"], href: "/browse/bican-resources" },
  // Not tied to one program: shown under "All".
  { name: "Literature reviews", icon: "▤", desc: "PRISMA-guided SynthScholar reviews — published reviews run on BrainKB, and reviews ingested from SynthScholar runs with their manuscript, files and provenance.", sources: "SynthScholar", programs: [], href: "/knowledge-base/synth-scholar" },
];

const PROGRAMS = ["All", "BICAN", "BBQS"] as const;

export default function ExplorePage() {
  const [activeProgram, setActiveProgram] = useState<(typeof PROGRAMS)[number]>("All");
  const visibleTypes = TYPES.filter((t) => activeProgram === "All" || t.programs.includes(activeProgram));

  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="page-head">
          <span className="eyebrow">Explore</span>
          <h1>Explore the graph.</h1>
          <p className="lead">BrainKB points to data from programs like BICAN and BBQS.</p>
          <p className="note">TODO: each card will lead to a separate website</p>
        </section>

        <section className="page-body">
          <div className="scopes" role="group" aria-label="Filter by program" style={{ margin: "0 0 22px" }}>
            {PROGRAMS.map((p) => (
              <button key={p} type="button" aria-pressed={p === activeProgram} onClick={() => setActiveProgram(p)}>
                {p}
              </button>
            ))}
          </div>

          {visibleTypes.length === 0 ? (
            <div className="empty-card">No data types for {activeProgram} yet.</div>
          ) : (
            <div className="grid3">
              {visibleTypes.map((t) => {
                const body = (
                  <>
                    <div className="ico" aria-hidden="true">{t.icon}</div>
                    <h3>{t.name}</h3>
                    <p>{t.desc}</p>
                    {t.note && <p className="note">{t.note}</p>}
                    <span className="src-line">{t.sources}</span>
                    {t.href && <span className="go">Browse →</span>}
                  </>
                );
                return t.href ? (
                  <Link key={t.name} href={t.href} className="card">
                    {body}
                  </Link>
                ) : (
                  <div key={t.name} className="card">
                    {body}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
