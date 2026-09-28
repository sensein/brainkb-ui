"use client";

/**
 * Explore — data-type cards. Content is placeholder (see
 * design_handoff_brainkb_site/README.md) — real data to fetch in
 * production: data types with counts.
 */

import { useState } from "react";
import Link from "next/link";
import MarketingHeader from "../components/marketing/MarketingHeader";
import MarketingFooter from "../components/marketing/MarketingFooter";
import { instrumentSerif, plexSans, plexMono } from "../components/marketing/fonts";
import { COLORS, CARD_SURFACE, CARD_TITLE_FONT } from "../components/marketing/tokens";

// `href: null` means that data type has no browse page yet — the card renders
// as plain text until one exists.
const TYPES = [
  { name: "Cell types", desc: "Taxonomies and cell-type definitions with markers and regions.", sources: "BICAN", programs: ["BICAN"], href: null },
  { name: "Brain regions", desc: "Anatomical regions and atlases, linked to cell types and data.", sources: "BICAN", programs: ["BICAN"], href: null },
  { name: "Genes & genomes", desc: "Individual genes with their molecular type — protein-coding or noncoding — linked to the versioned genome annotations from ENSEMBL or NCBI and the reference assemblies they came from.", sources: "BICAN", programs: ["BICAN"], href: "/browse/genes-genomes" },
  { name: "BICAN Resources", desc: "All resources published by the BICAN consortium.", sources: "BICAN", programs: ["BICAN"], href: null },
  { name: "BBQS Resources", desc: "All resources published by the BBQS consortium.", sources: "BBQS", programs: ["BBQS"], href: null },
  { name: "Literature", desc: "Claims extracted from papers, each linked to its source.", sources: "BICAN · BBQS", programs: ["BICAN", "BBQS"], href: null },
] as const;

const PROGRAMS = ["All", "BICAN", "BBQS"] as const;

export default function ExplorePage() {
  const [activeProgram, setActiveProgram] = useState<(typeof PROGRAMS)[number]>("All");
  const visibleTypes = TYPES.filter((t) => activeProgram === "All" || (t.programs as readonly string[]).includes(activeProgram));

  return (
    <div
      className={`${instrumentSerif.variable} ${plexSans.variable} ${plexMono.variable}`}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: COLORS.pageBg,
        color: COLORS.ink,
        fontFamily: "var(--font-plex-sans), system-ui, sans-serif",
      }}
    >
      <MarketingHeader />

      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 28px 104px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 40,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h1 style={{ margin: 0, font: "400 clamp(34px,4.2vw,52px)/1.05 var(--font-instrument-serif), serif", letterSpacing: "-.02em", color: COLORS.accent }}>
            Explore the graph.
          </h1>
          <p style={{ margin: 0, maxWidth: 900, color: COLORS.body, fontSize: 17, lineHeight: 1.55 }}>
            BrainKB points to data from programs like BICAN and BBQS.
          </p>
          <span style={{ fontSize: 13, fontStyle: "italic", color: COLORS.muted }}>
            TODO: each card will lead to a separate website
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PROGRAMS.map((p) => {
            const active = p === activeProgram;
            return (
              <button
                key={p}
                onClick={() => setActiveProgram(p)}
                style={{
                  background: active ? COLORS.ink : COLORS.cardBg,
                  color: active ? COLORS.pageBg : COLORS.body,
                  border: `1px solid ${active ? COLORS.ink : COLORS.border}`,
                  borderRadius: 999,
                  padding: "8px 16px",
                  font: "500 13px var(--font-plex-mono)",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 16 }}>
          {visibleTypes.map((t) => {
            const body = (
              <>
                <span style={{ font: CARD_TITLE_FONT, color: COLORS.accentPurple }}>{t.name}</span>
                <span style={{ color: COLORS.body, fontSize: 15, lineHeight: 1.5 }}>{t.desc}</span>
                <span style={{ marginTop: "auto", paddingTop: 10, font: "500 12px var(--font-plex-mono)", color: COLORS.muted }}>
                  {t.sources}
                </span>
                {t.href && (
                  <span style={{ color: COLORS.accentPurple, fontWeight: 600, fontSize: 15 }}>Browse →</span>
                )}
              </>
            );
            const cardStyle = {
              ...CARD_SURFACE,
              color: COLORS.ink,
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "flex-start",
              gap: 10,
              textAlign: "left" as const,
            };
            return t.href ? (
              <Link key={t.name} href={t.href} style={cardStyle}>
                {body}
              </Link>
            ) : (
              <div key={t.name} style={cardStyle}>
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
