"use client";

// Illustrative sessions, one per skill, in the Home demo's `.demo` frame.
// Steps mirror each skill's SKILL.md workflow; the counts are examples.

import { useState } from "react";

type Line = [string, string];

const SESSIONS: { tab: string; icon: string; ctx: string; badge: string; lines: Line[] }[] = [
  {
    tab: "StructSense",
    icon: "◆",
    ctx: "Claude Code · structsense skill",
    badge: "EXTRACT",
    lines: [
      ["ask", "Extract the cell types from paper.pdf and map them to ontologies"],
      ["call", "→ structsense: NER · neuroscience prompt"],
      ["out", "← 42 entities · aliases resolved · evidence sentence kept"],
      ["call", "→ python -m scripts.concept_mapping map result.json"],
      ["out", "← 31 mapped to CL / UBERON · judge review applied"],
      ["ok", "✓ result.ttl validated · ready to ingest"],
    ],
  },
  {
    tab: "SynthScholar",
    icon: "▤",
    ctx: "Claude Code · synthscholar skill",
    badge: "REVIEW",
    lines: [
      ["ask", "Start a systematic review on PV interneurons in layer 4"],
      ["call", "→ protocol intake: question, PICO, eligibility, databases"],
      ["ok", "✓ protocol validated before the run"],
      ["ask", "Run it over these PDFs and fetch the DOIs I listed"],
      ["call", "→ full text: open access first, then your EZproxy access"],
      ["ok", "✓ review.md + review.ttl (SLR ontology) · screening audit trail kept"],
    ],
  },
  {
    tab: "BrainKB",
    icon: "◎",
    ctx: "Claude Code · brainkb skill",
    badge: "INGEST",
    lines: [
      ["ask", "Add result.ttl and the review to my lab space"],
      ["call", '→ brainkb_ingest_upload(space="my-lab")'],
      ["out", "← job queued · 2 files"],
      ["call", "→ brainkb_job_status(job_id)"],
      ["ok", "✓ ingested · PROV-O provenance recorded · attributed to you"],
    ],
  },
];

export default function SkillsDemo() {
  const [i, setI] = useState(0);
  const s = SESSIONS[i];

  return (
    <aside className="demo" aria-label="Example skill sessions">
      <div className="demo-tabs" role="tablist" aria-label="Skill">
        {SESSIONS.map((x, k) => (
          <button key={x.tab} role="tab" aria-selected={k === i} onClick={() => setI(k)}>
            <i>{x.icon}</i>
            {x.tab}
          </button>
        ))}
      </div>
      <div className="demo-head">
        <span className="dots">●●●</span>
        <span className="ctx">{s.ctx}</span>
        <span className="pill pub">{s.badge}</span>
      </div>
      <div className="demo-body" style={{ minHeight: 300 }}>
        {s.lines.map(([k, t], n) => (
          <div key={`${i}-${n}`} className={`ln ${k}`} style={{ animationDelay: `${n * 70}ms`, animationFillMode: "both" }}>
            {t}
          </div>
        ))}
      </div>
      <div className="demo-foot">
        <span>Illustrative session · runs in <b>your</b> agent, with <b>your</b> model</span>
      </div>
    </aside>
  );
}
