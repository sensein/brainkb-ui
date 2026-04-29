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
  const nodes = [
    { x: 180, y: 60, r: 7, c: "oklch(0.78 0.13 170)", label: "Agent" },
    { x: 80, y: 130, r: 5, c: "oklch(0.80 0.13 285)", label: "Atlases" },
    { x: 280, y: 130, r: 6, c: "oklch(0.82 0.12 75)", label: "Insights" },
    { x: 120, y: 230, r: 5, c: "oklch(0.78 0.13 170)", label: "Datasets" },
    { x: 220, y: 240, r: 7, c: "oklch(0.80 0.13 285)", label: "Evidence" },
    { x: 180, y: 310, r: 5, c: "oklch(0.82 0.12 75)", label: "Databases" },
    { x: 40, y: 260, r: 4, c: "oklch(0.78 0.13 170)", label: "Literature" },
    { x: 320, y: 60, r: 4, c: "oklch(0.82 0.12 75)", label: "Discovery" },
  ];
  const edges: [number, number][] = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [4, 5], [3, 6], [1, 6], [2, 7],
  ];
  return (
    <svg viewBox="0 0 360 360" style={{ width: "100%", height: "100%" }}>
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="oklch(0.78 0.13 170 / 0.4)"
          strokeWidth="1"
        />
      ))}
      {nodes.map((n, i) => {
        // Flip the label to the left of the circle when the node is near the
        // right edge of the 360-wide viewBox — otherwise long labels like
        // "Discovery" get clipped by the SVG bounds (text-anchor=start +
        // x=320 + ~54px of text spills past x=360).
        const flipLeft = n.x > 240;
        return (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r + 3} fill={n.c} opacity="0.2" />
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} />
            {n.label && (
              <text
                x={flipLeft ? n.x - n.r - 6 : n.x + n.r + 6}
                y={n.y + 3}
                fontSize="10"
                fontFamily={FONTS.mono}
                fill="oklch(0.88 0.02 170)"
                textAnchor={flipLeft ? "end" : "start"}
              >
                {n.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function BkbHero() {
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

      {/* Floating graph artwork (top right) */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 64,
          width: 360,
          height: 360,
          opacity: 0.85,
          pointerEvents: "none",
        }}
      >
        <FloatingGraph />
      </div>

      <div style={{ position: "relative", maxWidth: 1200, margin: "0 auto" }}>
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
            fontSize: "clamp(48px, 7vw, 88px)",
            lineHeight: 0.98,
            margin: "28px 0 20px",
            letterSpacing: "-0.02em",
            maxWidth: 820,
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
    </section>
  );
}
