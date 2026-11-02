"use client";

import { useMemo } from "react";
import { COLORS } from "./tokens";

const HUBS = [
  { name: "Cell types", x: 28, y: 22, c: COLORS.cellTypes },
  { name: "Brain regions", x: 72, y: 20, c: COLORS.regions },
  { name: "Datasets", x: 70, y: 50, c: COLORS.datasets },
  { name: "Literature", x: 30, y: 50, c: COLORS.literature },
] as const;

const HUB_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [2, 3],
  [1, 3],
];

/**
 * Deterministic placeholder graph — a linear-congruential PRNG (seed fixed at
 * 11), same generator as the design handoff's mockup, so the layout is stable
 * across renders/reloads rather than jittering. Replace with the real graph
 * visualization once available (see design_handoff_brainkb_site/README.md).
 */
function buildGraph() {
  let s = 11;
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;

  const nodes: { x: number; y: number; r: number; c: string }[] = [];
  const edges: { x1: number; y1: number; x2: number; y2: number; c: string; w: number; o: number }[] = [];

  HUB_EDGES.forEach(([a, b]) => {
    edges.push({ x1: HUBS[a].x, y1: HUBS[a].y, x2: HUBS[b].x, y2: HUBS[b].y, c: COLORS.ink, w: 0.25, o: 0.35 });
  });

  HUBS.forEach((hub) => {
    for (let k = 0; k < 9; k++) {
      const angle = rand() * 6.283;
      const dist = 6 + rand() * 7;
      const x = +(hub.x + Math.cos(angle) * dist * 1.2).toFixed(2);
      const y = +(hub.y + Math.sin(angle) * dist).toFixed(2);
      edges.push({ x1: hub.x, y1: hub.y, x2: x, y2: y, c: hub.c, w: 0.2, o: 0.5 });
      nodes.push({ x, y, r: +(0.6 + rand() * 0.6).toFixed(2), c: hub.c });
    }
  });

  HUBS.forEach((hub) => nodes.push({ x: hub.x, y: hub.y, r: 2.4, c: hub.c }));

  return { nodes, edges, hubs: HUBS.map((h) => ({ ...h, ly: h.y + 5.6 })) };
}

export default function PlaceholderGraph() {
  const graph = useMemo(buildGraph, []);

  return (
    <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 14, overflow: "hidden" }}>
      <svg viewBox="0 0 100 70" style={{ width: "100%", display: "block" }}>
        {graph.edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.c} strokeWidth={e.w} opacity={e.o} />
        ))}
        {graph.nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.c} />
        ))}
        {graph.hubs.map((h) => (
          <text key={h.name} x={h.x} y={h.ly} fontSize={2.6} fontFamily="var(--font-plex-mono, monospace)" fill={COLORS.ink} textAnchor="middle">
            {h.name}
          </text>
        ))}
      </svg>
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.border}`, font: "500 11.5px var(--font-plex-mono, monospace)", color: COLORS.muted }}>
        Placeholder · to be replaced by the real graph
      </div>
    </div>
  );
}
