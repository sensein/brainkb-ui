"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MCP_ENDPOINT } from "../tokens";

// Animated, illustrative sessions showing the ways to connect. "ask" and "cmd"
// lines are typed out character by character, so their content is plain text.
type Line = ["ask" | "cmd", string] | ["call" | "out" | "ok" | "share" | "ans", ReactNode];
type Scene = { tab: string; icon: string; ctx: string; badge: string; via: ReactNode; lines: Line[] };

const SCENES: Scene[] = [
  {
    tab: "Ask an agent",
    icon: "✳",
    ctx: `Claude · ${MCP_ENDPOINT.replace(/^https?:\/\//, "")}`,
    badge: "NO LOGIN",
    via: <>Works in <b>Claude</b>, <b>ChatGPT</b>, <b>Perplexity</b>, <b>Cursor</b>…</>,
    lines: [
      ["ask", "Which cell types express PVALB in the neocortex?"],
      ["call", '→ brainkb_search(q="PVALB neocortex")'],
      ["out", "← 27 papers · 4 cell types · public spaces"],
      ["ans", <>
        <b>Parvalbumin-positive basket and chandelier cells</b>, mostly layers 2–6, mapped to the Cell Ontology.
        <br />
        <span className="src">27 PAPERS</span>
        <span className="src">PROV-O</span>
      </>],
    ],
  },
  {
    tab: "Agent skill",
    icon: "◆",
    ctx: "Claude Code · BrainKB skill",
    badge: "YOUR MACHINE",
    via: <>One step: <b>npx brainkb install</b></>,
    lines: [
      ["cmd", "npx brainkb install"],
      ["ok", "✓ BrainKB skill installed · MCP server registered"],
      ["ask", "Add result.ttl to my lab space"],
      ["call", '→ brainkb_ingest_upload(space="my-lab")'],
      ["out", "← job queued"],
      ["call", "→ brainkb_job_status(job_id)"],
      ["ok", "✓ ingested · PROV-O provenance recorded · attributed to you"],
    ],
  },
  {
    tab: "Run locally",
    icon: "⌂",
    ctx: "Your server · self-hosted BrainKB",
    badge: "DECENTRALIZED",
    via: <>Your data stays yours. <b>Sharing is opt-in.</b></>,
    lines: [
      ["cmd", "docker compose -f docker-compose.unified.yml up -d"],
      ["ok", "✓ graph store · search · API · MCP running"],
      ["cmd", "MCP_TRANSPORT=stdio python server.py"],
      ["ok", "✓ local MCP connected to your BrainKB"],
      ["ask", "Share the cortex dataset with the community"],
      ["share", '→ brainkb_set_space_visibility("cortex", "public")'],
      ["ok", "✓ now open knowledge · your name on every triple"],
    ],
  },
  {
    tab: "API",
    icon: "⌘",
    ctx: "Terminal · plain HTTP",
    badge: "NO TOKEN",
    via: <>Open standards: <b>RDF</b>, <b>JSON-LD</b>, <b>PROV-O</b></>,
    lines: [
      ["cmd", "curl brainkb.org/api/search?q=purkinje"],
      ["out", '{ "hits": [ { "subject": "…/Purkinje_cell",\n            "space": "cerebellum",\n            "visibility": "public" } ] }'],
      ["cmd", "curl brainkb.org/api/spaces/cerebellum/data"],
      ["ok", "✓ JSON-LD · every triple with its provenance"],
    ],
  },
];

const TYPED = new Set(["ask", "cmd"]);

type Shown = { k: string; content: ReactNode; typing: boolean };

export default function HeroDemo() {
  // `run` bumps on every tab click so re-clicking the current tab replays it.
  const [{ i, run }, setPlay] = useState({ i: 0, run: 0 });
  const [shown, setShown] = useState<Shown[]>([]);
  const [progress, setProgress] = useState(0);
  const paused = useRef(false);
  const sc = SCENES[i];

  useEffect(() => {
    let alive = true;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const setLast = (patch: Partial<Shown>) => setShown((s) => [...s.slice(0, -1), { ...s[s.length - 1], ...patch }]);

    (async () => {
      setShown([]);
      setProgress(0);
      for (let n = 0; n < sc.lines.length; n++) {
        const [k, t] = sc.lines[n];
        if (reduce || !TYPED.has(k)) {
          if (!reduce) await sleep(k === "ans" ? 650 : 420);
          if (!alive) return;
          setShown((s) => [...s, { k, content: t, typing: false }]);
        } else {
          const text = t as string;
          setShown((s) => [...s, { k, content: "", typing: true }]);
          for (let c = 1; c <= text.length; c++) {
            if (!alive) return;
            setLast({ content: text.slice(0, c) });
            await sleep(k === "cmd" ? 22 : 28);
          }
          await sleep(250);
          if (!alive) return;
          setLast({ typing: false });
        }
        setProgress((n + 1) / sc.lines.length);
      }
      await sleep(reduce ? 6000 : 3200);
      while (alive && paused.current) await sleep(500);
      if (alive) setPlay((p) => ({ i: (p.i + 1) % SCENES.length, run: p.run }));
    })();
    return () => {
      alive = false;
    };
  }, [i, run, sc]);

  return (
    <aside
      className="demo"
      aria-label="How to connect to BrainKB: animated examples"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="demo-tabs" role="tablist" aria-label="Ways to connect">
        {SCENES.map((s, k) => (
          <button key={s.tab} role="tab" aria-selected={k === i} onClick={() => setPlay((p) => ({ i: k, run: p.run + 1 }))}>
            <i>{s.icon}</i>
            {s.tab}
          </button>
        ))}
      </div>
      <div className="demo-head">
        <span className="dots">●●●</span>
        <span className="ctx">{sc.ctx}</span>
        <span className="pill pub">{sc.badge}</span>
      </div>
      <div className="demo-body">
        {shown.map((l, n) => (
          <div key={`${i}-${run}-${n}`} className={`ln ${l.k}`}>
            {l.content}
            {l.typing && <span className="caret" />}
          </div>
        ))}
      </div>
      <div className="demo-foot">
        <span>{sc.via}</span>
        <span className="bar">
          <i style={{ width: `${progress * 100}%` }} />
        </span>
        <span>
          {i + 1} / {SCENES.length}
        </span>
      </div>
    </aside>
  );
}
