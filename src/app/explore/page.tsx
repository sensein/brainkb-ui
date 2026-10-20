"use client";

/**
 * Explore — data-type cards, one per browse destination. Uses the Home page's
 * design (the `.lp` classes in components/marketing/landing/landing.css), with
 * page-specific additions in ./explore.css.
 */

import { useState } from "react";
import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { dmSans, plexMono } from "../components/marketing/fonts";
import "../components/marketing/landing/landing.css";
import "./explore.css";

// `href: null` means that data type has no destination yet — the card renders
// as plain text, labelled "Coming soon", until one exists. `external` marks a
// card that leaves BrainKB, so it opens in a new tab and says so.
type DataType = {
  name: string;
  icon: string;
  desc: string;
  sources: string;
  programs: readonly string[];
  href: string | null;
  action?: string;
  external?: boolean;
};

const TYPES: DataType[] = [
  {
    name: "Cell types",
    icon: "◉",
    desc: "Taxonomies and cell-type definitions with markers and regions.",
    sources: "BICAN",
    programs: ["BICAN"],
    href: "/hmba-taxonomy",
    action: "View the HMBA taxonomy",
  },
  {
    name: "BICAN Resources",
    icon: "▣",
    desc: "All resources published by the BICAN consortium.",
    sources: "BICAN",
    programs: ["BICAN"],
    href: "/browse/bican-resources",
    action: "Browse resources",
  },
];

const PROGRAMS = ["All", "BICAN", "BBQS"] as const;
type Program = (typeof PROGRAMS)[number];

const inProgram = (t: DataType, p: Program) => p === "All" || t.programs.includes(p);

export default function ExplorePage() {
  const [activeProgram, setActiveProgram] = useState<Program>("All");
  const visibleTypes = TYPES.filter((t) => inProgram(t, activeProgram));

  return (
    <div className={`lp ${dmSans.variable} ${plexMono.variable}`}>
      <MarketingHeader />

      <main className="wrap">
        <section className="page-head">
          <span className="eyebrow">Explore knowledge</span>
          <h1>Explore neuroscience knowledge.</h1>
          <p className="lead">Browse cell types, research resources, and connections across neuroscience datasets.</p>
        </section>

        <section className="page-body">
          <div className="scopes" role="group" aria-label="Filter by program" style={{ margin: "0 0 22px" }}>
            {PROGRAMS.map((p) => {
              const count = TYPES.filter((t) => inProgram(t, p)).length;
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={p === activeProgram}
                  aria-label={`${p} (${count} ${count === 1 ? "data type" : "data types"})`}
                  onClick={() => setActiveProgram(p)}
                >
                  {p}
                  <span className="count" aria-hidden="true">{count}</span>
                </button>
              );
            })}
          </div>

          {visibleTypes.length === 0 ? (
            <div className="empty-card" role="status">
              <p>
                Nothing from <strong>{activeProgram}</strong> is browsable in BrainKB yet. Its data will appear here
                once it has been added.
              </p>
              <button type="button" onClick={() => setActiveProgram("All")}>
                Show all programs
              </button>
            </div>
          ) : (
            <div className="grid3">
              {visibleTypes.map((t) => {
                const body = (
                  <>
                    <div className="ico" aria-hidden="true">{t.icon}</div>
                    <h3>{t.name}</h3>
                    <p>{t.desc}</p>
                    {t.href ? (
                      <span className="dest">{t.external ? "External site ↗" : "Opens in BrainKB"}</span>
                    ) : (
                      <span className="dest soon">Coming soon</span>
                    )}
                    <span className="src-line">{t.sources}</span>
                    {t.href ? (
                      <span className="go">
                        {t.action ?? "Browse"} {t.external ? "↗" : "→"}
                      </span>
                    ) : (
                      <span className="go soon">Not yet available</span>
                    )}
                  </>
                );
                if (!t.href) {
                  return (
                    <div key={t.name} className="card">
                      {body}
                    </div>
                  );
                }
                return t.external ? (
                  <a key={t.name} href={t.href} className="card" target="_blank" rel="noopener noreferrer">
                    {body}
                  </a>
                ) : (
                  <Link key={t.name} href={t.href} className="card">
                    {body}
                  </Link>
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
