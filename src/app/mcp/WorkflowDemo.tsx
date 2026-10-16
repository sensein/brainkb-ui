"use client";

// "From question to answer" replays, taken from the MCP server's own site
// (session-data on MCP_SITE). The first four are real answers from BrainKB;
// ingest and history are illustrative. `**x**` marks bold text.

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

type Table = { cols: string[]; num?: number[]; rows: string[][] };
type Session = {
  task: string;
  prompt: string;
  lines: string[];
  result: string;
  table?: Table;
  notes?: string[];
  src?: string;
  real: boolean;
  dwell: number;
};

const PAPERS = "Sources: 10.1038/s41576-022-00509-1 · 10.7554/eLife.47889 · 10.3233/JAD-190687";

const SESSIONS: Session[] = [
  {
    task: "Naming variants",
    prompt: "How is the neocortex written across the papers in BrainKB?",
    lines: [
      "Confirms it is acting **as you**",
      "Picks the **naming-variants** question from the ready-made set",
      "Finds the entity **neocortex** in the graph",
      "Groups every **verbatim mention** by paper",
    ],
    result: "**3 papers · 10 mentions**, written as **isocortex** · **neocortex** · **mouse neocortex**",
    src: PAPERS,
    real: true,
    dwell: 9000,
  },
  {
    task: "Shared entities",
    prompt: "Which entities do these papers share, and under what names?",
    lines: [
      "Picks the **shared-across-sources** question",
      "Counts **papers** and **mentions** per entity",
      "Collects the **verbatim wording** each paper uses",
    ],
    result: "**7 entities** appear in more than one paper",
    table: {
      cols: ["Entity", "Papers", "Mentions", "Verbatim wording"],
      num: [1, 2],
      rows: [
        ["neocortex", "3", "10", "isocortex · neocortex · mouse neocortex"],
        ["transcription_factor", "2", "17", "transcription factors · Transcription factor · TF"],
        ["single_cell_rna_seq", "2", "15", "single cell RNA-seq · single-cell RNA-seq · scRNA-seq"],
        ["rna_seq", "2", "13", "RNA-seq · RNA sequencing"],
        ["mus_musculus", "2", "15", "mouse"],
        ["hippocampus", "2", "7", "hippocampus"],
        ["developing_mouse_cortex", "2", "2", "developing mouse cortex"],
      ],
    },
    src: PAPERS,
    real: true,
    dwell: 12000,
  },
  {
    task: "Trends by year",
    prompt: "How many dated sources mention entities mapped exactly or closely to each term, per year?",
    lines: [
      "Picks the **terms-by-year** question",
      "Follows **exact and close** ontology mappings to each term",
      "Counts **dated sources** per publication year",
    ],
    result: "**8 terms** appear in more than one year",
    table: {
      cols: ["Term", "Likely label", "2019", "2020", "2023"],
      num: [2, 3, 4],
      rows: [
        ["UBERON_0001950", "neocortex", "1", "1", "1"],
        ["UBERON_0001954", "hippocampus (Ammon's horn)", "–", "1", "1"],
        ["NCBITaxon_10090", "Mus musculus", "1", "–", "1"],
        ["EFO_0008896", "RNA-seq", "1", "–", "1"],
        ["EFO_0008913", "single-cell RNA-seq", "1", "–", "1"],
        ["brainkb concept 7f506536…", "provisional", "1", "–", "1"],
        ["brainkb concept ac3ec995…", "provisional", "1", "–", "1"],
        ["brainkb concept d9d088dc…", "provisional", "1", "–", "1"],
      ],
    },
    src: PAPERS,
    real: true,
    dwell: 12000,
  },
  {
    task: "Mapping review",
    prompt: "What is each entity mapped to, and at which mapping relationship?",
    lines: [
      "Picks the **mapping-relationship** question",
      "Reads **exact, close, broad, narrow** and **related** matches",
      "Leaves out **provisional BRAINKB** concepts, which count as unmapped",
      "Flags the **non-exact** matches for review",
    ],
    result: "**216 mappings** for **215 entities**",
    table: {
      cols: ["Relationship", "Count", "What it claims"],
      num: [1],
      rows: [
        ["exact", "192 (89%)", "The same concept; the only identity claim"],
        ["close", "19", "Similar enough for some uses, but not the same"],
        ["broad", "2", "The ontology term is more general than the entity"],
        ["narrow", "1", "The ontology term is more specific than the entity"],
        ["related", "2", "Associated, not the same"],
      ],
    },
    notes: [
      "**hippocampus** is only a close match: UBERON:0001954 is Ammon's horn, which is narrower than the hippocampus.",
      "**chromatin_immunoprecipitation** has two exact targets, EFO:0004176 and OBI:0001975. Fine, but worth a quick check.",
      "**762 provisional BRAINKB concepts** are left out; they count as unmapped.",
    ],
    src: "Graph: sandbox named-entity test graph. Mappings belong to the entity, not to any one paper.",
    real: true,
    dwell: 15000,
  },
  {
    task: "Ingest a file",
    prompt: "Ingest review.ttl into my lab space.",
    lines: [
      "Confirms it is acting **as you**",
      "Finds **your lab space** and its graph",
      "Streams the file **straight from disk**",
      "Checks the **triple count** against the file",
    ],
    result: "Ingested, attributed to you, and nothing lost.",
    real: false,
    dwell: 6500,
  },
  {
    task: "Trace a change",
    prompt: "What changed in my lab space this week, and who did it?",
    lines: [
      "Lists the **graphs** in the space",
      "Reads each graph's **change log**",
      "Looks up **who** ran each ingest",
      "Pulls the **exact triples** that were added",
    ],
    result: "A dated change log with the person behind each change.",
    real: false,
    dwell: 6500,
  },
];

function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, n) =>
        n % 2 ? <b key={n}>{part}</b> : <Fragment key={n}>{part}</Fragment>,
      )}
    </>
  );
}

const STEP = 0.45; // seconds between lines appearing

export default function WorkflowDemo() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const s = SESSIONS[i];

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Auto-advance; restarts whenever the session changes or play resumes.
  useEffect(() => {
    if (paused || reduced) return;
    const t = setTimeout(() => {
      if (!document.hidden) setI((n) => (n + 1) % SESSIONS.length);
    }, s.dwell);
    return () => clearTimeout(t);
  }, [i, paused, reduced, s.dwell]);

  const resume = useCallback(() => setPaused(false), []);

  return (
    <div
      ref={boxRef}
      className="workflow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={resume}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!boxRef.current?.contains(e.relatedTarget as Node)) resume();
      }}
    >
      <div>
        <span className="eyebrow">From question to answer</span>
        <h2>Watch your agent<br />work with BrainKB.</h2>
        <p>
          Replays of real answers from BrainKB: naming variants, shared entities and trends by year across three
          papers, and a mapping review of the sandbox test graph. Then illustrative ingest and provenance flows. Pick
          a task to jump to it; hover to pause.
        </p>
        <div className="wf-tasks" role="group" aria-label="Example sessions">
          {SESSIONS.map((x, k) => (
            <button
              key={x.task}
              type="button"
              aria-pressed={k === i}
              className={k === i && !paused && !reduced ? "playing" : undefined}
              style={{ ["--dwell" as string]: `${x.dwell}ms` }}
              onClick={() => setI(k)}
            >
              {x.task}
            </button>
          ))}
        </div>
      </div>

      <div className="demo">
        <div className="demo-head">
          <span className="dots">●●●</span>
          <span className="ctx">agent-session</span>
          <span>{s.real ? "REAL DATA" : "ILLUSTRATIVE"}</span>
        </div>
        <div className="demo-body wf-body" aria-live="polite" key={i}>
          <div className="wf-prompt">› {s.prompt}</div>
          {s.lines.map((l, n) => (
            <div key={n} className="wf-log" style={{ animationDelay: `${0.35 + n * STEP}s` }}>
              <span>{String(n + 1).padStart(2, "0")}</span>
              <span><Rich text={l} /></span>
            </div>
          ))}
          <div className="wf-result" style={{ animationDelay: `${0.45 + s.lines.length * STEP}s` }}>
            ✓ <Rich text={s.result} />
            {s.table && (
              <div className="wf-table">
                <table>
                  <thead>
                    <tr>
                      {s.table.cols.map((c, n) => (
                        <th key={c} className={s.table?.num?.includes(n) ? "n" : undefined}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((r) => (
                      <tr key={r[0]}>
                        {r.map((c, n) => (
                          <td key={n} className={s.table?.num?.includes(n) ? "n" : undefined}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.notes && (
              <ul>
                {s.notes.map((t) => (
                  <li key={t}><Rich text={t} /></li>
                ))}
              </ul>
            )}
            {s.src && <span className="src">{s.src}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
