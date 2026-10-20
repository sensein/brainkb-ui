"use client";

/**
 * From your narrow domain to the whole field: one finding (disease-associated
 * microglia at amyloid plaques, Keren-Shaul et al., Cell 2017) and the wider knowledge
 * it connects to. The rings show reach, not a hierarchy. The figure is inline SVG
 * (reachRingsSvg.ts, generated from docs/figures/reach-rings.html) so its text stays
 * sharp; hovering, focusing or tapping a concept highlights its links and shows the
 * relationship and published source behind each one.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import REACH_RINGS_SVG from "./reachRingsSvg";

type Info = { title: string; kind: string; example?: string; note?: string };

const NODES: Record<string, Info> = {
  core: { title: "Your finding", kind: "Cell state", example: "disease-associated microglia (DAM) cluster at amyloid plaques in a mouse model of Alzheimer’s disease" },
  act: { title: "Microglial activation", kind: "Process", example: "activation states" },
  infl: { title: "Neuroinflammation", kind: "Process", example: "cytokine release" },
  phago: { title: "Phagocytosis", kind: "Process", example: "amyloid uptake" },
  prune: { title: "Synaptic pruning", kind: "Process", example: "C1q tagging" },
  degen: { title: "Neurodegeneration", kind: "Pathology", example: "neuron loss" },
  plaque: { title: "Amyloid pathology", kind: "Pathology", example: "Aβ plaques" },
  synloss: { title: "Synapse loss", kind: "Pathology", example: "synaptic degeneration" },
  gen: { title: "Genetics", kind: "Adjacent field", example: "TREM2 and APOE genes; AD-associated variants", note: "APOE ε4 is the strongest common genetic risk factor for late-onset Alzheimer’s disease (Corder et al., Science 1993)." },
  imm: { title: "Immunology", kind: "Adjacent field", example: "innate immunity" },
  drug: { title: "Therapeutic approaches", kind: "Adjacent field", example: "TREM2-targeting antibodies" },
  clin: { title: "Clinical neurology", kind: "Adjacent field", example: "Alzheimer’s dementia" },
};

// "from>to": the relationship and where it is reported
const LINKS: Record<string, { says: string; source: string }> = {
  "core>act": { says: "DAM are a distinct activation state of microglia.", source: "Keren-Shaul et al., Cell 2017" },
  "core>phago": { says: "DAM switch on phagocytic and lipid-metabolism genes.", source: "Keren-Shaul et al., Cell 2017" },
  "core>infl": { says: "Activated microglia are a main source of neuroinflammation in Alzheimer’s disease.", source: "Heneka et al., Lancet Neurology 2015" },
  "core>prune": { says: "Microglia remove synapses tagged by complement (C1q, C3).", source: "Hong et al., Science 2016" },
  "act>gen": { says: "The full DAM response depends on TREM2, and rare TREM2 variants are associated with higher Alzheimer’s risk.", source: "Keren-Shaul et al., Cell 2017; Guerreiro et al. and Jonsson et al., NEJM 2013" },
  "gen>drug": { says: "TREM2-targeting antibodies are being developed to modulate microglia.", source: "Wang et al., J Exp Med 2020" },
  "infl>degen": { says: "Sustained neuroinflammation contributes to neurodegenerative processes.", source: "Heneka et al., Lancet Neurology 2015" },
  "infl>imm": { says: "Neuroinflammation is innate immune signalling in the brain.", source: "Heneka et al., Lancet Neurology 2015" },
  "phago>plaque": { says: "DAM sit next to amyloid plaques and take up Aβ.", source: "Keren-Shaul et al., Cell 2017" },
  "plaque>clin": { says: "Amyloid plaques are a defining neuropathological feature of Alzheimer’s disease.", source: "Hyman et al., Alzheimer’s & Dementia 2012" },
  "prune>synloss": { says: "Complement-dependent pruning drives early synapse loss in Alzheimer’s mouse models.", source: "Hong et al., Science 2016" },
};

export default function ReachRings() {
  const fig = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const shown = pinned ?? active;

  // highlight the shown concept, its links and the concepts at their other ends
  useEffect(() => {
    const root = fig.current;
    if (!root) return;
    const svg = root.querySelector("svg");
    if (!svg) return;
    svg.classList.toggle("rr-active", !!shown);
    const near = new Set<string>(shown ? [shown] : []);
    svg.querySelectorAll<SVGElement>("[data-a]").forEach((e) => {
      const on = !!shown && (e.dataset.a === shown || e.dataset.b === shown);
      e.classList.toggle("rr-on", on);
      if (on) { near.add(e.dataset.a!); near.add(e.dataset.b!); }
    });
    svg.querySelectorAll<SVGElement>("[data-node]").forEach((e) => e.classList.toggle("rr-on", near.has(e.dataset.node!)));
  }, [shown]);

  // make each concept reachable by keyboard and screen reader
  useEffect(() => {
    fig.current?.querySelectorAll<SVGElement>("[data-node]").forEach((e) => {
      const info = NODES[e.dataset.node!];
      if (!info) return;
      e.setAttribute("tabindex", "0");
      e.setAttribute("role", "button");
      e.setAttribute("aria-label", `${info.title}: show its connections`);
    });
  }, []);

  const nodeOf = (t: EventTarget | null) => (t as Element | null)?.closest?.("[data-node]")?.getAttribute("data-node") ?? null;
  const onOver = useCallback((e: React.PointerEvent | React.FocusEvent) => { const k = nodeOf(e.target); if (k) setActive(k); }, []);
  const onOut = useCallback(() => setActive(null), []);
  const onClick = useCallback((e: React.MouseEvent) => { const k = nodeOf(e.target); setPinned((p) => (k && p !== k ? k : null)); }, []);
  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { const k = nodeOf(e.target); if (k) { e.preventDefault(); setPinned((p) => (p === k ? null : k)); } }
    if (e.key === "Escape") setPinned(null);
  }, []);

  const info = shown ? NODES[shown] : null;
  const links = shown ? Object.entries(LINKS).filter(([k]) => k.split(">").includes(shown)) : [];

  return (
    <div className="missing">
      <div className="missing-copy">
        <span className="missing-k">The missing link</span>
        <h2>From your narrow domain to the whole field</h2>
        <p>
          A study of disease-associated microglia in Alzheimer&apos;s disease begins with a specific cellular
          observation. BrainKB connects it to related knowledge about neuroinflammation, neurodegeneration, genetic
          risk factors and potential therapeutic targets through shared ontology concepts and evidence-linked
          relationships.
        </p>
        <p className="missing-note">The rings show how far a finding can reach, not a strict hierarchy.</p>
      </div>

      <div
        ref={fig}
        className="missing-fig"
        onPointerOver={onOver}
        onPointerLeave={onOut}
        onFocus={onOver}
        onBlur={onOut}
        onClick={onClick}
        onKeyDown={onKey}
        dangerouslySetInnerHTML={{ __html: REACH_RINGS_SVG }}
      />

      <div className="missing-panel" aria-live="polite">
        {info ? (
          <>
            <span className="k">{info.kind}</span>
            <h3>{info.title}</h3>
            {info.example && <p className="ex">e.g. {info.example}</p>}
            {links.length > 0 && (
              <ul>
                {links.map(([k, l]) => {
                  const other = k.split(">").find((x) => x !== shown)!;
                  return (
                    <li key={k}>
                      <b>{NODES[other].title}.</b> {l.says} <span className="src">{l.source}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {info.note && <p className="note">{info.note}</p>}
          </>
        ) : (
          <p className="hint">Hover over or tap a concept to see how it connects, and the published evidence behind each link.</p>
        )}
      </div>
    </div>
  );
}
