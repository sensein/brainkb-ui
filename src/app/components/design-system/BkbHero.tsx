"use client";

/**
 * BkbHero — dark teal hero section ported from sensein/brainkb-ui-prototype.
 *
 * Visual: gradient teal/black background, dotted grid overlay, animated graph
 * artwork floating on the right, "v2.0 · NIH Reach Tools" pill, large serif
 * headline with the italic accent on "neuroscience", and a short description.
 *
 * The prototype's search bar and statistics grid are intentionally omitted
 * here per the current design direction.
 */

import React from "react";
import { FONTS } from "./index";

function FloatingGraph() {
  // Three-column flow:
  //   Left column  (purple sources)  → Center (Knowledge Graph hub) → Right column (teal outputs, Discovery accent in coral).
  // Inbound edges (purple, with arrowheads) animate dashes left→right; outbound
  // edges (teal) animate center→right. Each labeled box drifts vertically on
  // a 4s cycle with staggered delays so the diagram feels alive without being
  // distracting. The central hub has an outer pulse ring + dashed orbit ring
  // with a few satellite dots, evoking a knowledge-graph nucleus.
  return (
    <svg
      viewBox="0 0 860 360"
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Knowledge graph diagram: literature, datasets, experiments, and databases flow into the central knowledge graph, which produces evidence, insights, and discovery."
    >
      <defs>
        <marker id="bkb-ah-purple" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 2L8 5L2 8" fill="none" stroke="#7F77DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="bkb-ah-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 2L8 5L2 8" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <style>{`
        @keyframes bkb-dash-flow  { to { stroke-dashoffset: -24; } }
        @keyframes bkb-pulse-ring { 0%, 100% { opacity: 0.2;  } 50% { opacity: 0.06; } }
        @keyframes bkb-float-up   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .bkb-fl-1 { animation: bkb-dash-flow 1.8s linear infinite; }
        .bkb-fl-2 { animation: bkb-dash-flow 2.6s linear infinite -0.4s; }
        .bkb-fl-3 { animation: bkb-dash-flow 2.2s linear infinite -0.8s; }
        .bkb-fl-4 { animation: bkb-dash-flow 3s   linear infinite -1s;   }
        .bkb-ol-1 { animation: bkb-dash-flow 2s   linear infinite; }
        .bkb-ol-2 { animation: bkb-dash-flow 2.8s linear infinite -0.6s; }
        .bkb-ol-3 { animation: bkb-dash-flow 2.4s linear infinite -1.2s; }
        .bkb-pr   { animation: bkb-pulse-ring 3.5s ease-in-out infinite; }
        .bkb-fa   { animation: bkb-float-up 4s ease-in-out infinite; }
        .bkb-fb   { animation: bkb-float-up 4s ease-in-out infinite -0.6s; }
        .bkb-fc   { animation: bkb-float-up 4s ease-in-out infinite -1.2s; }
        .bkb-fd   { animation: bkb-float-up 4s ease-in-out infinite -1.8s; }
        .bkb-fe   { animation: bkb-float-up 4s ease-in-out infinite -2.4s; }
        .bkb-ff   { animation: bkb-float-up 4s ease-in-out infinite -0.3s; }
        .bkb-fg   { animation: bkb-float-up 4s ease-in-out infinite -0.9s; }
        @media (prefers-reduced-motion: reduce) {
          .bkb-fl-1, .bkb-fl-2, .bkb-fl-3, .bkb-fl-4,
          .bkb-ol-1, .bkb-ol-2, .bkb-ol-3,
          .bkb-pr, .bkb-fa, .bkb-fb, .bkb-fc, .bkb-fd,
          .bkb-fe, .bkb-ff, .bkb-fg { animation: none; }
        }
      `}</style>

      {/* Outer pulse ring + dashed orbit ring around the hub */}
      <circle className="bkb-pr" cx="430" cy="180" r="82" fill="none" stroke="#1D9E75" strokeWidth="1.5" opacity="0.18" />
      <circle cx="430" cy="180" r="68" fill="none" stroke="#1D9E75" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.25" />

      {/* Inbound flow lines (sources → hub) */}
      <path className="bkb-fl-1" d="M164 72  C260 72  320 130 362 155" fill="none" stroke="#7F77DD" strokeWidth="1.2" strokeDasharray="7 6" markerEnd="url(#bkb-ah-purple)" opacity="0.65" />
      <path className="bkb-fl-2" d="M164 145 C260 145 320 158 362 168" fill="none" stroke="#7F77DD" strokeWidth="1.2" strokeDasharray="7 6" markerEnd="url(#bkb-ah-purple)" opacity="0.65" />
      <path className="bkb-fl-3" d="M164 215 C260 215 320 200 362 192" fill="none" stroke="#7F77DD" strokeWidth="1.2" strokeDasharray="7 6" markerEnd="url(#bkb-ah-purple)" opacity="0.65" />
      <path className="bkb-fl-4" d="M164 288 C260 288 320 240 362 207" fill="none" stroke="#7F77DD" strokeWidth="1.2" strokeDasharray="7 6" markerEnd="url(#bkb-ah-purple)" opacity="0.65" />

      {/* Outbound flow lines (hub → outputs) */}
      <path className="bkb-ol-1" d="M498 158 C570 130 640 100 696 84"  fill="none" stroke="#1D9E75" strokeWidth="1.4" strokeDasharray="7 6" markerEnd="url(#bkb-ah-teal)" opacity="0.8" />
      <path className="bkb-ol-2" d="M500 180 C580 180 650 180 696 180" fill="none" stroke="#1D9E75" strokeWidth="1.4" strokeDasharray="7 6" markerEnd="url(#bkb-ah-teal)" opacity="0.8" />
      <path className="bkb-ol-3" d="M498 202 C570 235 640 264 696 276" fill="none" stroke="#1D9E75" strokeWidth="1.4" strokeDasharray="7 6" markerEnd="url(#bkb-ah-teal)" opacity="0.8" />

      {/* Source nodes (left column, purple) */}
      <g className="bkb-fa">
        <rect x="60" y="50" width="104" height="44" rx="10" fill="rgba(127,119,221,0.12)" stroke="#534AB7" strokeWidth="0.8" />
        <text x="112" y="72" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="500" fill="#AFA9EC" fontFamily={FONTS.body}>Literature</text>
      </g>
      <g className="bkb-fb">
        <rect x="60" y="123" width="104" height="44" rx="10" fill="rgba(127,119,221,0.12)" stroke="#534AB7" strokeWidth="0.8" />
        <text x="112" y="145" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="500" fill="#AFA9EC" fontFamily={FONTS.body}>Datasets</text>
      </g>
      <g className="bkb-fc">
        <rect x="60" y="193" width="104" height="44" rx="10" fill="rgba(127,119,221,0.12)" stroke="#534AB7" strokeWidth="0.8" />
        <text x="112" y="215" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="500" fill="#AFA9EC" fontFamily={FONTS.body}>Experiments</text>
      </g>
      <g className="bkb-fd">
        <rect x="60" y="266" width="104" height="44" rx="10" fill="rgba(127,119,221,0.12)" stroke="#534AB7" strokeWidth="0.8" />
        <text x="112" y="288" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="500" fill="#AFA9EC" fontFamily={FONTS.body}>Databases</text>
      </g>

      {/* Central hub: Knowledge Graph */}
      <circle cx="430" cy="180" r="62" fill="rgba(15,110,86,0.25)" stroke="#1D9E75" strokeWidth="1" />
      {/* Satellite dots on orbit ring */}
      <circle cx="430" cy="112" r="4" fill="#1D9E75" opacity="0.6" />
      <circle cx="492" cy="148" r="3" fill="#1D9E75" opacity="0.4" />
      <circle cx="368" cy="148" r="3" fill="#1D9E75" opacity="0.4" />
      <circle cx="430" cy="248" r="4" fill="#1D9E75" opacity="0.5" />
      <text x="430" y="171" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="500" fill="#9FE1CB" fontFamily={FONTS.body}>Knowledge</text>
      <text x="430" y="191" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="500" fill="#9FE1CB" fontFamily={FONTS.body}>Graph</text>

      {/* Output nodes (right column) — Discovery in coral accent */}
      <g className="bkb-fe">
        <rect x="696" y="62" width="104" height="44" rx="10" fill="rgba(29,158,117,0.12)" stroke="#0F6E56" strokeWidth="0.8" />
        <text x="748" y="84" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="500" fill="#9FE1CB" fontFamily={FONTS.body}>Evidence</text>
      </g>
      <g className="bkb-ff">
        <rect x="696" y="158" width="104" height="44" rx="10" fill="rgba(29,158,117,0.12)" stroke="#0F6E56" strokeWidth="0.8" />
        <text x="748" y="180" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="500" fill="#9FE1CB" fontFamily={FONTS.body}>Insights</text>
      </g>
      <g className="bkb-fg">
        <rect x="696" y="254" width="104" height="44" rx="10" fill="rgba(153,60,29,0.2)" stroke="#993C1D" strokeWidth="1" />
        <text x="748" y="276" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="600" fill="#F5C4B3" fontFamily={FONTS.body}>Discovery</text>
      </g>

      {/* Subtle vertical connectors between the three output cards */}
      <line x1="748" y1="106" x2="748" y2="158" stroke="#1D9E75" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.4" />
      <line x1="748" y1="202" x2="748" y2="254" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.4" />
    </svg>
  );
}

export type HeroStat = { value: string | number; label: string };

export function BkbHero({ stats }: { stats?: HeroStat[] }) {
  return (
    <section
      className="bkb"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(180deg, oklch(0.22 0.03 200) 0%, oklch(0.18 0.025 200) 100%)",
        color: "oklch(0.96 0.006 85)",
        padding: "80px 64px 96px",
      }}
    >
      {/* Dot grid overlay */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35 }}>
        <defs>
          <pattern id="bkb-hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="oklch(0.74 0.14 170 / 0.25)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bkb-hero-grid)" />
      </svg>

      {/* Two-column layout on wide viewports (text left, graph right);
          stacks vertically below ~960px via flex-wrap. flex-basis values
          give the graph priority for width when both columns can fit, but
          let the text column reflow naturally when wrapped. */}
      <div
        style={{
          position: "relative",
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: 48,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 460px", minWidth: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              padding: "5px 11px",
              borderRadius: 999,
              border: "1px solid oklch(0.74 0.14 170 / 0.3)",
              background: "oklch(0.74 0.14 170 / 0.08)",
              color: "oklch(0.82 0.12 170)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            <span className="bkb-pulse-dot" style={{ background: "oklch(0.74 0.14 170)" }} />
            BrainKB
          </div>

          <h1
            style={{
              fontFamily: FONTS.display,
              fontSize: "clamp(40px, 5.5vw, 76px)",
              lineHeight: 1.02,
              margin: "24px 0 18px",
              letterSpacing: "-0.02em",
              fontWeight: 400,
            }}
          >
            The open
            <br />
            <em style={{ fontStyle: "italic", color: "oklch(0.78 0.13 170)" }}>neuroscience</em>
            <br />
            knowledge graph.
          </h1>

          <p
            style={{
              fontSize: 17,
              maxWidth: 540,
              color: "oklch(0.82 0.012 200)",
              lineHeight: 1.55,
              margin: 0,
              fontWeight: 300,
            }}
          >
            Building open, trustworthy knowledge graph infrastructure to integrate fragmented neuroscience knowledge and data to accelerate reproducible discovery.
          </p>
        </div>

        <div
          style={{
            flex: "1 1 520px",
            minWidth: 0,
            maxWidth: 720,
            opacity: 0.95,
          }}
        >
          <FloatingGraph />
        </div>
      </div>

      {/* Stat strip — auto-counted tools / use cases + orchestration tag */}
      {Array.isArray(stats) && stats.length > 0 && (
        <div
          style={{
            position: "relative",
            maxWidth: 1320,
            margin: "64px auto 0",
            paddingTop: 32,
            borderTop: "1px solid oklch(0.74 0.14 170 / 0.18)",
            display: "flex",
            flexWrap: "wrap",
            gap: 64,
          }}
        >
          {stats.map((s, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontSize: 38,
                  fontWeight: 400,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: "oklch(0.96 0.006 85)",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "oklch(0.72 0.03 195)",
                  marginTop: 10,
                  letterSpacing: "0.01em",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
