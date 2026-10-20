"use client";

import { useState } from "react";

type Ring = "study" | "subfield" | "field" | "adjacent";

const RINGS: { id: Ring; role: string; name: string; examples: string[]; how: string }[] = [
  {
    id: "adjacent", role: "Adjacent fields", name: "Biomedicine, genetics, psychiatry",
    examples: ["Genetics", "Psychiatry", "Neurology", "AI models of vision"],
    how: "Reached through gene and disease terms (MONDO).",
  },
  {
    id: "field", role: "Field", name: "Neuroscience",
    examples: ["Sst cells in hippocampus", "Human cortex", "Macaque vision"],
    how: "Reached through cell-type taxonomies that span regions and species.",
  },
  {
    id: "subfield", role: "Subfield", name: "Visual neuroscience",
    examples: ["V1 circuits", "Pvalb and Vip interneurons", "Visual behavior"],
    how: "Reached through the same cell-type and brain-region terms (CL, UBERON).",
  },
  {
    id: "study", role: "Your study", name: "Sst interneurons in mouse V1",
    examples: ["cell type", "brain region", "species"],
    how: "Extracted entities are tagged with ontology terms when the paper is ingested.",
  },
];

// Outer radius of each ring, and where its label sits (distance below the centre).
const R: Record<Ring, number> = { adjacent: 198, field: 155, subfield: 105, study: 50 };
const LABEL: Partial<Record<Ring, { y: number; name: string; role: string }>> = {
  subfield: { y: 72, name: "Visual neuroscience", role: "SUBFIELD" },
  field: { y: 126, name: "Neuroscience", role: "FIELD" },
  adjacent: { y: 172, name: "Biomedicine", role: "ADJACENT FIELDS" },
};
const FILL: Record<Ring, string> = { adjacent: "#f5f7fc", field: "#eaf1fe", subfield: "#dbeafe", study: "#0b1628" };
// Findings reached in each ring: decoration that echoes the list.
const DOTS: [number, number][] = [[0, -80], [-62, 37], [65, -93], [115, 65], [-115, -31], [165, -34]];
const LINKS: [number, number, number, number][] = [
  [0, 0, 0, -80], [0, 0, -62, 37], [0, -80, 65, -93], [65, -93, 165, -34], [-62, 37, -115, -31], [0, 0, 115, 65],
];

/** One study in the middle, its subfield, its field and the fields around it:
 *  a finding tagged with shared ontology terms reaches every ring. */
export default function ReachRings() {
  const [active, setActive] = useState<Ring | null>(null);
  return (
    <div className="reach">
      <svg className="reach-fig" viewBox="-200 -200 400 400" role="img"
           aria-label="Nested rings: a study of Sst interneurons in mouse V1, inside visual neuroscience, inside neuroscience, next to biomedicine, genetics and psychiatry">
        {(["adjacent", "field", "subfield"] as Ring[]).map((r) => (
          <circle key={r} r={R[r]} fill={FILL[r]}
                  stroke={active === r ? "var(--blue)" : "#bfdbfe"} strokeWidth={active === r ? 3 : 1.2}
                  className="reach-ring" />
        ))}
        <g stroke="#0b1628" strokeWidth={1.4} strokeDasharray="3 4" fill="none" opacity={0.7}>
          {LINKS.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
        </g>
        {DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill="#0b1628" />)}
        <circle r={R.study} fill={FILL.study} stroke={active === "study" ? "var(--blue)" : "none"} strokeWidth={3} />
        <text textAnchor="middle" fill="#fff" className="reach-c">
          <tspan x={0} y={-10} fontWeight={600}>Your study</tspan>
          <tspan x={0} y={6}>Sst cells,</tspan>
          <tspan x={0} y={21}>mouse V1</tspan>
        </text>
        {Object.entries(LABEL).map(([r, l]) => (
          <text key={r} textAnchor="middle" className="reach-l">
            <tspan x={0} y={l!.y} className="nm">{l!.name}</tspan>
            <tspan x={0} y={l!.y + 13} className="rl">{l!.role}</tspan>
          </text>
        ))}
      </svg>
      <ul className="reach-list">
        {RINGS.map((r) => (
          <li key={r.id}>
            <button type="button" aria-pressed={active === r.id}
                    onMouseEnter={() => setActive(r.id)} onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(r.id)} onBlur={() => setActive(null)}
                    onClick={() => setActive((a) => (a === r.id ? null : r.id))}>
              <span className="rl">{r.role}</span>
              <span className="nm">{r.name}</span>
              <span className="ex">{r.examples.map((e) => <i key={e}>{e}</i>)}</span>
              <span className="how">{r.how}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
