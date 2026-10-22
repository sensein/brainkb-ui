"use client";

/**
 * Force-directed paper -> entity network. Papers are the large dark nodes;
 * each entity links to every paper that mentions it, so entities shared by
 * several papers sit between their clusters. Taxonomy nodes (hollow diamonds)
 * link mapped cell types to the cell-type hierarchy and to their parents.
 * Gene records (small hollow squares) sit between an extracted gene and the
 * taxa that list the gene as a curated marker.
 * Clicking any node selects it. Rendering only — filtering and the detail
 * panels live in the page.
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { COLORS } from "../components/marketing/tokens";
import { type Entity, type GeneRecord, type Paper, type Taxon, type TaxonLink, colorOf, typeLabel } from "./model";

type Node = d3.SimulationNodeDatum & {
  id: string;
  kind: "paper" | "entity" | "taxon" | "gene";
  label: string;
  r: number;
  entity?: Entity;
  taxon?: Taxon;
  gene?: GeneRecord;
};
// "mention": entity -> paper; "taxon": entity -> mapped taxon; "parent": taxon -> parent;
// "gene": entity -> gene record. Curated markers are "taxon" links with marker set.
type Link = d3.SimulationLinkDatum<Node> & { kind: "mention" | "taxon" | "parent" | "gene"; exact?: boolean; marker?: boolean };
const GENE_R = 4.5;

const PAPER_R = 16;
const entityRadius = (mentions: number) => Math.min(14, 3 + Math.sqrt(mentions) * 1.6);
const TAXON_R: Record<string, number> = { Neighborhood: 11, Class: 9, Subclass: 7.5, Group: 6 };
// Taxa at the top levels always carry a label; the rest on hover/selection.
const LABELLED_LEVELS = new Set(["Neighborhood", "Class"]);
const diamond = (r: number) => `M0,${-r * 1.3}L${r * 1.3},0L0,${r * 1.3}L${-r * 1.3},0Z`;
const shorten = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// Each paper's most-mentioned entities carry a permanent label; the rest are
// labelled on hover/selection, so labels stay selective.
const LABELLED_PER_PAPER = 3;

export default function EntityNetwork({
  papers,
  entities,
  taxa = [],
  taxonLinks = [],
  genes = [],
  geneLinks = [],
  markerLinks = [],
  selectedId,
  onSelect,
  height = 640,
}: {
  papers: Paper[];
  entities: Entity[];
  taxa?: Taxon[];
  taxonLinks?: TaxonLink[];
  genes?: GeneRecord[];
  geneLinks?: { entity: string; gene: string }[];
  markerLinks?: { gene: string; taxon: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // Positions survive re-filtering, so toggling a group doesn't reshuffle the layout.
  const positions = useRef(new Map<string, { x: number; y: number }>());
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState<{ node: Node; x: number; y: number } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  // Set by the drawing effect; re-run on selection without rebuilding the layout.
  const highlightRef = useRef<(id: string | null) => void>(() => {});

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();
    // A redraw (e.g. the chart narrowing when the detail panel opens) removes
    // the hovered node before its mouseleave can fire.
    setHover(null);

    const labelled = new Set(
      papers.flatMap((p) =>
        entities
          .filter((e) => e.byPaper.has(p.id))
          .sort((a, b) => (b.byPaper.get(p.id) ?? 0) - (a.byPaper.get(p.id) ?? 0))
          .slice(0, LABELLED_PER_PAPER)
          .map((e) => e.id),
      ),
    );
    const nodes: Node[] = [
      ...papers.map((p) => ({ id: p.id, kind: "paper" as const, label: p.title, r: PAPER_R })),
      ...entities.map((e) => ({ id: e.id, kind: "entity" as const, label: e.label, r: entityRadius(e.total), entity: e })),
      ...taxa.map((t) => ({ id: t.id, kind: "taxon" as const, label: t.label, r: TAXON_R[t.level] ?? 6, taxon: t })),
      ...genes.map((g) => ({ id: g.id, kind: "gene" as const, label: g.symbol, r: GENE_R, gene: g })),
    ];
    // Papers start spread on a circle; entities start near their first paper.
    const paperAngle = new Map(papers.map((p, i) => [p.id, (2 * Math.PI * i) / Math.max(1, papers.length)]));
    const spread = Math.min(width, height) * 0.28;
    for (const n of nodes) {
      const saved = positions.current.get(n.id);
      // Taxa start near the centre; the hierarchy pulls them towards their cell types.
      const angle = n.kind === "paper" ? paperAngle.get(n.id)!
        : n.kind === "entity" ? paperAngle.get([...n.entity!.byPaper.keys()][0]) ?? 0 : 0;
      const reach = n.kind === "taxon" || n.kind === "gene" ? 0 : spread;
      const jitter = n.kind === "paper" ? 0 : n.kind === "entity" ? 40 : 120;
      n.x = saved?.x ?? width / 2 + Math.cos(angle) * reach + (Math.random() - 0.5) * jitter;
      n.y = saved?.y ?? height / 2 + Math.sin(angle) * reach + (Math.random() - 0.5) * jitter;
    }
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: Link[] = [
      ...entities.flatMap((e) =>
        [...e.byPaper].filter(([p]) => byId.has(p)).map(([p]) => ({ source: e.id, target: p, kind: "mention" as const })),
      ),
      ...taxonLinks.filter((l) => byId.has(l.entity) && byId.has(l.taxon))
        .map((l) => ({ source: l.entity, target: l.taxon, kind: "taxon" as const, exact: l.exact, marker: l.relation === "marker" })),
      ...taxa.filter((t) => t.parent && byId.has(t.parent))
        .map((t) => ({ source: t.id, target: t.parent!, kind: "parent" as const })),
      ...geneLinks.filter((l) => byId.has(l.entity) && byId.has(l.gene))
        .map((l) => ({ source: l.entity, target: l.gene, kind: "gene" as const })),
      ...markerLinks.filter((l) => byId.has(l.gene) && byId.has(l.taxon))
        .map((l) => ({ source: l.gene, target: l.taxon, kind: "taxon" as const, exact: false, marker: true })),
    ];
    const neighbours = new Map<string, Set<string>>();
    for (const l of links) {
      const s = l.source as string, t = l.target as string;
      if (!neighbours.has(s)) neighbours.set(s, new Set());
      if (!neighbours.has(t)) neighbours.set(t, new Set());
      neighbours.get(s)!.add(t);
      neighbours.get(t)!.add(s);
    }

    const root = svg.append("g");
    svg.call(
      d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 4]).on("zoom", (ev) => root.attr("transform", ev.transform)),
    );
    svg.on("click", () => onSelectRef.current(null));

    const baseOpacity = (l: Link) => (l.kind === "mention" ? 0.55 : 0.7);
    const link = root.append("g")
      .selectAll("line").data(links).join("line")
      .attr("stroke", (l) => (l.kind === "mention" ? COLORS.borderStrong : COLORS.ink))
      .attr("stroke-opacity", baseOpacity)
      .attr("stroke-width", (l) => (l.kind === "parent" ? 1.5 : 1))
      // Looser (narrower/broader/close/related) mappings are dashed; curated-marker links dotted.
      .attr("stroke-dasharray", (l) => (l.kind !== "taxon" || l.exact ? null : l.marker ? "1 3" : "3 3"))
      .attr("stroke-linecap", (l) => (l.marker ? "round" : null));

    const node = root.append("g").selectAll<SVGGElement, Node>("g").data(nodes).join("g")
      .style("cursor", "pointer")
      .on("mouseenter", (ev, d) => {
        const [x, y] = d3.pointer(ev, wrapRef.current);
        setHover({ node: d, x, y });
        highlight(d.id);
      })
      .on("mouseleave", () => {
        setHover(null);
        highlight(selectedRef.current);
      })
      .on("click", (ev, d) => {
        ev.stopPropagation();
        onSelectRef.current(d.id);
      });

    // Invisible hit target, larger than the mark.
    node.append("circle").attr("r", (d) => d.r + 5).attr("fill", "transparent");
    node.filter((d) => d.kind === "taxon").append("path")
      .attr("d", (d) => diamond(d.r))
      .attr("fill", COLORS.cardBg).attr("stroke", COLORS.ink).attr("stroke-width", 1.5);
    node.filter((d) => d.kind === "gene").append("rect")
      .attr("x", -GENE_R).attr("y", -GENE_R).attr("width", 2 * GENE_R).attr("height", 2 * GENE_R).attr("rx", 1)
      .attr("fill", COLORS.cardBg).attr("stroke", COLORS.ink).attr("stroke-width", 1.3);
    node.filter((d) => d.kind !== "taxon" && d.kind !== "gene").append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => (d.kind === "paper" ? COLORS.ink : colorOf(d.entity!.group)))
      // Surface ring keeps overlapping marks apart.
      .attr("stroke", COLORS.cardBg)
      .attr("stroke-width", (d) => (d.kind === "paper" ? 3 : 1.5));

    // Labels get their own layer above every circle, so no mark covers a title.
    // Paper titles are drawn last, so an entity label never covers one.
    const text = root.append("g").selectAll<SVGTextElement, Node>("text")
      .data([...nodes].sort((a, b) => (a.kind === "paper" ? 1 : 0) - (b.kind === "paper" ? 1 : 0))).join("text")
      .text((d) => (d.kind === "paper" ? shorten(d.label, 42) : d.label))
      // Paper titles sit centred under the node; entity labels to the right.
      .attr("text-anchor", (d) => (d.kind === "paper" ? "middle" : "start"))
      .attr("dx", (d) => (d.kind === "paper" ? 0 : d.r + 4))
      .attr("dy", (d) => (d.kind === "paper" ? d.r + 16 : 4))
      .attr("font-size", (d) => (d.kind === "paper" ? 13 : 11))
      .attr("font-weight", (d) => (d.kind === "paper" ? 600 : d.kind === "taxon" ? 500 : 400))
      .attr("font-style", (d) => (d.kind === "taxon" ? "italic" : null))
      .attr("fill", (d) => (d.kind === "entity" ? COLORS.body : COLORS.ink))
      .attr("stroke", COLORS.cardBg).attr("stroke-width", 3).attr("paint-order", "stroke")
      .style("pointer-events", "none")
      .style("display", (d) => (alwaysLabelled(d) ? null : "none"));

    function alwaysLabelled(d: Node) {
      return d.kind === "paper" || labelled.has(d.id) || (d.kind === "taxon" && LABELLED_LEVELS.has(d.taxon!.level));
    }

    function highlight(id: string | null) {
      const near = id ? new Set([id, ...(neighbours.get(id) ?? [])]) : null;
      node.attr("opacity", (d) => (!near || near.has(d.id) ? 1 : 0.18));
      link.attr("stroke-opacity", (l) =>
        !id ? baseOpacity(l) : (l.source as Node).id === id || (l.target as Node).id === id ? 0.9 : 0.08,
      );
      text.style("display", (d) => (alwaysLabelled(d) || d.id === id ? null : "none"));
    }
    highlightRef.current = highlight;
    highlight(selectedRef.current);

    const sim = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id((d) => d.id)
        .distance((l) => (l.kind === "mention" ? 30 + (l.source as Node).r * 3 : l.kind === "parent" ? 34 : l.kind === "gene" ? 18 : 50))
        // Taxonomy links pull gently, so they don't drag paper clusters together.
        .strength((l) => (l.kind === "mention" ? 0.6 : l.kind === "parent" ? 0.5 : l.kind === "gene" ? 0.8 : 0.15)))
      .force("charge", d3.forceManyBody<Node>().strength((d) => (d.kind === "paper" ? -900 : d.kind === "taxon" ? -60 : -18)))
      .force("collide", d3.forceCollide<Node>().radius((d) => d.r + 1.5))
      .force("x", d3.forceX(width / 2).strength(0.04))
      .force("y", d3.forceY(height / 2).strength(0.06))
      .alpha(positions.current.size ? 0.3 : 1)
      .on("tick", () => {
        // Keep every node inside the chart, so nothing drifts off the edge.
        for (const n of nodes) {
          n.x = Math.max(n.r + 8, Math.min(width - n.r - 8, n.x!));
          n.y = Math.max(n.r + 8, Math.min(height - n.r - 24, n.y!));
        }
        link.attr("x1", (l) => (l.source as Node).x!).attr("y1", (l) => (l.source as Node).y!)
          .attr("x2", (l) => (l.target as Node).x!).attr("y2", (l) => (l.target as Node).y!);
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
        text.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
      })
      .on("end", () => nodes.forEach((n) => positions.current.set(n.id, { x: n.x!, y: n.y! })));

    node.call(
      d3.drag<SVGGElement, Node>()
        .on("start", (ev, d) => { if (!ev.active) sim.alphaTarget(0.2).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
        .on("end", (ev, d) => { if (!ev.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }),
    );

    return () => {
      sim.stop();
      nodes.forEach((n) => positions.current.set(n.id, { x: n.x!, y: n.y! }));
    };
  }, [papers, entities, taxa, taxonLinks, genes, geneLinks, markerLinks, width, height]);

  useEffect(() => highlightRef.current(selectedId), [selectedId]);

  const h = hover?.node;
  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height }}>
      <svg ref={svgRef} width={width} height={height} role="img"
        aria-label="Network of papers and the named entities extracted from them" />
      {h && (
        <div
          style={{
            position: "absolute",
            left: Math.min(hover!.x + 14, width - 260),
            top: hover!.y + 14,
            width: 240,
            background: COLORS.cardBg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: 1.45,
            color: COLORS.ink,
            pointerEvents: "none",
            boxShadow: "0 4px 14px rgba(22,24,26,.08)",
          }}
        >
          <div style={{ fontWeight: 600 }}>{h.label}</div>
          {h.gene ? (
            <div style={{ color: COLORS.body }}>
              Gene record · {h.gene.species ?? "?"}{h.gene.identifier && <> · {h.gene.identifier}</>}
              {h.gene.markerOf.size > 0 && <div>Curated marker of {h.gene.markerOf.size} taxon{h.gene.markerOf.size === 1 ? "" : "s"}</div>}
            </div>
          ) : h.taxon ? (
            <div style={{ color: COLORS.body }}>
              Taxon · {h.taxon.level} · {h.taxon.accession}
              {h.taxon.cl && <div>{h.taxon.cl}</div>}
            </div>
          ) : h.entity ? (
            <div style={{ color: COLORS.body }}>
              {typeLabel(h.entity.type)} · {h.entity.total} mention{h.entity.total === 1 ? "" : "s"}
              {h.entity.byPaper.size > 1 && <> · in {h.entity.byPaper.size} papers</>}
            </div>
          ) : (
            <div style={{ color: COLORS.body }}>Paper</div>
          )}
        </div>
      )}
    </div>
  );
}
