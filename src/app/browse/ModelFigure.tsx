"use client";

/**
 * Small schema diagram for one class: what it points to on the left, what
 * points at it on the right, with the relationship name and cardinality on
 * each edge. Shows the *model*, not the data — so it looks the same whether
 * or not any entities have been ingested.
 *
 * Edges come from `modelEdges` on the page in class-browser.yaml, which are
 * transcribed from the LinkML schema. Renders nothing when a class has no
 * edges, so pages without a model (e.g. diagnostic) simply have no figure.
 */

import { COLORS } from "../components/marketing/tokens";

export type ModelEdge = { from: string; to: string; label: string; cardinality?: string };

const NODE_W = 168;
const NODE_H = 38;
const ROW_H = 62;
const COL_GAP = 96;
const PAD = 12;

export default function ModelFigure({ edges, current }: { edges: ModelEdge[]; current: string }) {
  const outgoing = edges.filter((e) => e.from === current);
  const incoming = edges.filter((e) => e.to === current);
  if (outgoing.length === 0 && incoming.length === 0) return null;

  const rows = Math.max(outgoing.length, incoming.length, 1);
  const width = NODE_W * 3 + COL_GAP * 2 + PAD * 2;
  const height = rows * ROW_H + PAD * 2;
  const midY = height / 2;

  const leftX = PAD;
  const centreX = PAD + NODE_W + COL_GAP;
  const rightX = centreX + NODE_W + COL_GAP;

  // Stack each side's nodes vertically, centred against the middle node.
  const yFor = (index: number, count: number) =>
    midY - ((count - 1) * ROW_H) / 2 + index * ROW_H;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", maxWidth: width, height: "auto", display: "block" }}
        role="img"
        aria-label={`Model relationships for ${current}: ${[
          ...outgoing.map((e) => `${current} ${e.label} ${e.to}`),
          ...incoming.map((e) => `${e.from} ${e.label} ${current}`),
        ].join("; ")}`}
      >
        <defs>
          <marker id="mf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M1 2L9 5L1 8" fill="none" stroke={COLORS.accentPurple} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {outgoing.map((edge, i) => {
          const y = yFor(i, outgoing.length);
          return (
            <g key={`out-${edge.to}-${edge.label}`}>
              <Edge x1={centreX} y1={midY} x2={leftX + NODE_W} y2={y} />
              <EdgeLabel
                x={(leftX + NODE_W + centreX) / 2}
                y={(midY + y) / 2}
                label={edge.label}
                cardinality={edge.cardinality}
              />
              <Node x={leftX} y={y} label={edge.to} />
            </g>
          );
        })}

        {incoming.map((edge, i) => {
          const y = yFor(i, incoming.length);
          return (
            <g key={`in-${edge.from}-${edge.label}`}>
              <Edge x1={rightX} y1={y} x2={centreX + NODE_W} y2={midY} />
              <EdgeLabel
                x={(centreX + NODE_W + rightX) / 2}
                y={(midY + y) / 2}
                label={edge.label}
                cardinality={edge.cardinality}
              />
              <Node x={rightX} y={y} label={edge.from} />
            </g>
          );
        })}

        <Node x={centreX} y={midY} label={current} current />
      </svg>
    </div>
  );
}

function Edge({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={COLORS.accentPurple}
      strokeWidth="1.2"
      opacity="0.55"
      markerEnd="url(#mf-arrow)"
    />
  );
}

function EdgeLabel({
  x,
  y,
  label,
  cardinality,
}: {
  x: number;
  y: number;
  label: string;
  cardinality?: string;
}) {
  return (
    <text
      x={x}
      y={y - 6}
      textAnchor="middle"
      fontSize="10.5"
      fill={COLORS.muted}
      fontFamily="var(--font-plex-mono, monospace)"
    >
      {label}
      {cardinality ? ` (${cardinality})` : ""}
    </text>
  );
}

function Node({ x, y, label, current = false }: { x: number; y: number; label: string; current?: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx="8"
        fill={current ? COLORS.accentPurple : COLORS.cardBg}
        stroke={current ? COLORS.accentPurple : COLORS.borderStrong}
        strokeWidth="1"
      />
      <text
        x={x + NODE_W / 2}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12.5"
        fontWeight={current ? 600 : 500}
        fill={current ? COLORS.cardBg : COLORS.ink}
        fontFamily="var(--font-plex-mono, monospace)"
      >
        {label}
      </text>
    </g>
  );
}
