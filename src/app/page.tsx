/**
 * Home — public marketing entry page.
 *
 * Redesigned per design_handoff_brainkb_site/ (see README.md there for the
 * full spec). Two sections: Intro (what you can do) → Interact (how: MCP
 * install + graph explore). Renders standalone, outside the app's
 * Navbar/Footer/Theme chrome — see SiteChrome.
 */

import Link from "next/link";
import { ScanText, Network, Lightbulb, Bot, Compass, Puzzle } from "lucide-react";
import MarketingHeader from "./components/marketing/MarketingHeader";
import MarketingFooter from "./components/marketing/MarketingFooter";
import { FloatingGraph } from "./components/design-system/BkbHero";
import { instrumentSerif, plexSans, plexMono } from "./components/marketing/fonts";
import { COLORS, CARD_SURFACE, CARD_TITLE_FONT } from "./components/marketing/tokens";

const WHAT_YOU_CAN_DO = [
  {
    name: "Extract",
    color: COLORS.accentPurple,
    Icon: ScanText,
    tagline: "Structured information from unstructured sources.",
    desc: "Automated pipelines read neuroscience publications and turn the entities, claims, and evidence they contain into machine-readable records.",
  },
  {
    name: "Connect",
    color: COLORS.accentPurple,
    Icon: Network,
    tagline: "One graph across the silos.",
    desc: "Extracted knowledge is aligned to shared ontologies and linked across datasets, labs, and modalities.",
  },
  {
    name: "Discover",
    color: COLORS.accentPurple,
    Icon: Lightbulb,
    tagline: "New hypotheses from connected evidence.",
    desc: "Query and traverse the graph to surface connections that span many studies.",
  },
] as const;

const WAYS_TO_INTERACT = [
  {
    title: "Use your AI assistant with BrainKB data.",
    Icon: Bot,
    desc: "Add the BrainKB MCP server to Claude, Cursor, or any MCP client with one command, then work in natural language under your own account and permissions.",
    href: "/mcp",
  },
  {
    title: "Explore the data and the connections.",
    Icon: Compass,
    desc: "Browse cell types, brain regions, datasets, and papers as one connected graph — start anywhere and follow the links to the related evidence.",
    href: "/explore",
  },
  {
    title: "Extract structured knowledge from your own papers.",
    Icon: Puzzle,
    desc: "Skills like StructSense and SynthScholar turn publications into structured, ontology-grounded records your assistant can ingest straight into the graph.",
    href: "/skills",
  },
] as const;

export default function HomePage() {
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

      {/* Intro — high level: what BrainKB is, what you can do */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "96px 28px 88px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 48, alignItems: "center" }}>
          <div style={{ flex: "1 1 440px", display: "flex", flexDirection: "column", gap: 28 }}>
            <h1
              style={{
                margin: 0,
                font: "400 clamp(44px,5.4vw,72px)/1 var(--font-instrument-serif), serif",
                letterSpacing: "-.02em",
              }}
            >
              The open
              <br />
              <em style={{ color: COLORS.accent, fontStyle: "italic" }}>neuroscience</em>
              <br />
              knowledge graph.
            </h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: COLORS.body, maxWidth: 560 }}>
              Neuroscience evidence is scattered across thousands of papers, datasets, and archives. BrainKB
              connects it into one machine-readable resource, with every claim traceable to its source — so
              researchers can make reproducible discoveries and funders can invest in high-impact science.
            </p>
          </div>
          <div style={{ flex: "1 1 460px", maxWidth: 680 }}>
            <FloatingGraph />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
            gap: 32,
            marginTop: 36,
            paddingTop: 36,
            borderTop: `1px solid ${COLORS.border}`,
          }}
        >
          {WHAT_YOU_CAN_DO.map((item) => (
            <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ font: "400 26px/1.05 var(--font-instrument-serif), serif", color: item.color }}>
                  {item.name}
                </span>
                <item.Icon size={20} strokeWidth={1.5} color={item.color} aria-hidden />
              </div>
              <span style={{ fontWeight: 600, fontSize: 15.5, color: COLORS.ink }}>{item.tagline}</span>
              <p style={{ margin: 0, color: COLORS.body, fontSize: 14.5, lineHeight: 1.55 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interact — how: AI assistant (MCP), Explore, extraction skills */}
      <section
        id="interact"
        style={{ background: COLORS.bandBg, borderTop: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 28px", width: "100%" }}>
          <h2
            style={{
              margin: "0 0 36px",
              font: "400 clamp(34px,3.8vw,48px)/1.05 var(--font-instrument-serif), serif",
              letterSpacing: "-.02em",
              color: COLORS.accent,
            }}
          >
            How to use BrainKB.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))",
              gap: 20,
            }}
          >
            {WAYS_TO_INTERACT.map((item) => (
              <div
                key={item.href}
                style={{ ...CARD_SURFACE, display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
                  <h3
                    style={{
                      margin: 0,
                      font: CARD_TITLE_FONT,
                      letterSpacing: "-.01em",
                    }}
                  >
                    <Link href={item.href} style={{ color: COLORS.accentPurple }}>
                      {item.title}
                    </Link>
                  </h3>
                  <item.Icon size={20} strokeWidth={1.5} color={COLORS.accentPurple} aria-hidden style={{ flex: "none", marginTop: 4 }} />
                </div>
                <p style={{ margin: 0, color: COLORS.body, fontSize: 15, lineHeight: 1.55 }}>{item.desc}</p>
                <Link href={item.href} style={{ marginTop: "auto", color: COLORS.accentPurple, fontWeight: 600, fontSize: 15 }}>
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
