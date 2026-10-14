"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Concept only: results are illustrative samples, not live BrainKB data.
// TODO: replace SAMPLE with a call to the BrainKB search API.
type Kind = "cell" | "region" | "entity" | "paper" | "space";
type Hit = {
  t: string; k: Kind; d: string; m: string[]; s: string;
  aka?: string[]; rel?: [string, string][]; ev?: [string, string, string]; evs?: string;
};

const SAMPLE: Hit[] = [
  { t: "Purkinje cell", k: "cell", d: "GABAergic projection neuron of the cerebellar cortex, with a large, fan-shaped dendritic tree.", m: ["CL:0000121", "3 spaces"], s: "14 papers",
    aka: ["Purkinje neuron", "cerebellar Purkinje cell"], rel: [["Located in", "Cerebellar cortex"], ["Expresses", "PCP2, CALB1"], ["Projects to", "Deep cerebellar nuclei"]],
    ev: ["Each ", "Purkinje cell", " extends a planar dendritic arbor into the molecular layer…"], evs: "Results ¶2 · Journal article, full text" },
  { t: "Cerebellar cortex", k: "region", d: "Layered cortex of the cerebellum containing Purkinje, granule and basket cells.", m: ["UBERON:0002129"], s: "9 papers",
    aka: ["cortex of cerebellum"], rel: [["Part of", "Cerebellum"], ["Contains", "Purkinje cell"], ["Layers", "Molecular, Purkinje, granular"]],
    ev: ["The ", "cerebellar cortex", " is organised into three distinct layers…"], evs: "Introduction ¶1 · Review article" },
  { t: "Parvalbumin-positive interneuron", k: "cell", d: "Fast-spiking GABAergic interneuron expressing PVALB.", m: ["Marker PVALB", "Cell Ontology"], s: "21 papers",
    aka: ["PV+ basket cell", "FS interneuron", "PV interneuron"], rel: [["Expresses", "PVALB"], ["Located in", "Neocortex"], ["Layers", "2–6"]],
    ev: ["…fast-spiking ", "parvalbumin-positive", " basket cells were recorded in layer 4…"], evs: "Results ¶3 · Journal article, full text" },
  { t: "PVALB", k: "entity", d: "Calcium-binding protein used as a marker of fast-spiking interneurons.", m: ["Gene", "Cell marker"], s: "18 papers",
    aka: ["parvalbumin"], rel: [["Marker of", "Parvalbumin-positive interneuron"], ["Type", "Gene"]],
    ev: ["Interneurons were identified by ", "PVALB", " immunoreactivity…"], evs: "Methods ¶4 · Journal article" },
  { t: "Hippocampus", k: "region", d: "Medial temporal lobe structure involved in memory formation and spatial navigation.", m: ["UBERON:0002421", "7 names across papers"], s: "32 papers",
    aka: ["hippocampal formation", "Ammon's horn"], rel: [["Part of", "Temporal lobe"], ["Contains", "CA1, CA3, dentate gyrus"], ["Studied in", "Hippocampal place cells across species"]],
    ev: ["Lesions of the ", "hippocampus", " impaired the formation of new spatial memories…"], evs: "Discussion ¶2 · Journal article, full text" },
  { t: "Basal ganglia circuit review", k: "paper", d: "Systematic review of basal ganglia connectivity findings, with charted evidence.", m: ["PRISMA review", "Linked data"], s: "46 included studies" },
  { t: "Hippocampal place cells across species", k: "paper", d: "Literature review of place cell recordings and their reported properties.", m: ["PRISMA review"], s: "28 included studies" },
  { t: "Basal ganglia terms", k: "space", d: "Curated terms and relations for basal ganglia structures.", m: ["Public space"], s: "2 contributors" },
  { t: "Neocortex", k: "region", d: "Six-layered cortex; how it is named varies widely across papers.", m: ["UBERON:0001950", "12 names across papers"], s: "40 papers",
    aka: ["isocortex", "neopallium"], rel: [["Part of", "Cerebral cortex"], ["Has layers", "1–6"], ["Contains", "Parvalbumin-positive interneuron"]],
    ev: ["Across the ", "neocortex", ", interneuron density varied by layer…"], evs: "Results ¶1 · Journal article, full text" },
];

const KINDS: Record<"all" | Kind, string> = { all: "All", cell: "Cell types", region: "Brain regions", entity: "Genes & entities", paper: "Papers & reviews", space: "Spaces" };
const LABEL: Record<Kind, string> = { cell: "Cell type", region: "Brain region", entity: "Gene", paper: "Review", space: "Space" };
const IDEAS: [Kind, string, string][] = [
  ["cell", "Purkinje cell", "Cerebellar projection neuron"],
  ["cell", "parvalbumin interneurons", "Fast-spiking cortical interneurons"],
  ["region", "hippocampus", "Memory and spatial navigation"],
  ["paper", "basal ganglia", "Systematic review of connectivity"],
];

const href = (q: string) => `/search?q=${encodeURIComponent(q)}`;
const KindTag = ({ k }: { k: Kind }) => <span className={`kind k-${k}`}>{LABEL[k]}</span>;
const isScope = (s: string | null): s is "all" | Kind => !!s && s in KINDS;

function Start({ title, text }: { title: string; text: string }) {
  return (
    <div className="start">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="ideas">
        {IDEAS.map(([k, q, d]) => (
          <Link key={q} className="idea" href={href(q)}>
            <KindTag k={k} />
            <b>{q[0].toUpperCase() + q.slice(1)}</b>
            <span className="d">{d}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Best({ h }: { h: Hit }) {
  const rel = h.rel ?? [];
  // Related chips: single linkable entities only (skip lists, numbers and layer names).
  const chips = rel.filter(([, b]) => (b.split(/,\s*/).length === 1 || /^\d/.test(b)) && !/^\d|Molecular|Gene$/.test(b));
  const more = h.s.replace(/^(\d+)/, (n) => String(+n - 1));
  return (
    <>
      <article className="best">
        <div className="best-h">
          <div className="top">
            <KindTag k={h.k} />
            <span className="kind k-public">Public</span>
          </div>
          <h2>{h.t}</h2>
          <p>{h.d}</p>
          <div className="aka">
            Also known as {h.aka?.map((a) => <i key={a}>{a}</i>)}
          </div>
        </div>
        <div className="best-b">
          <div className="facts">
            <h3>Key facts</h3>
            <dl>
              {rel.map(([a, b]) => (
                <div key={a} style={{ display: "contents" }}>
                  <dt>{a}</dt>
                  <dd><Link href={href(b)}>{b}</Link></dd>
                </div>
              ))}
            </dl>
          </div>
          {h.ev && (
            <div className="evi">
              <h3>Evidence</h3>
              <blockquote>“{h.ev[0]}<mark>{h.ev[1]}</mark>{h.ev[2]}”</blockquote>
              <p className="from">{h.evs} · and {more} more</p>
            </div>
          )}
        </div>
        <div className="best-f">
          <div className="meta">
            {h.m.map((x) => <span key={x}>{x}</span>)}
            <span className="src">From {h.s}</span>
          </div>
          <div className="acts">
            <a className="btn" href="#">See all sources</a>
            <a className="btn primary" href="#">Open entity</a>
          </div>
        </div>
      </article>
      {chips.length > 0 && (
        <div className="related">
          <h3>Explore related</h3>
          <div className="rel">
            {chips.map(([a, b]) => (
              <Link key={b} href={href(b)}>
                {b}
                <span>{a.toLowerCase()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ h }: { h: Hit }) {
  return (
    <a className="hit" href="#">
      <span className={`tico kind k-${h.k}`} aria-hidden="true">{LABEL[h.k].slice(0, 2)}</span>
      <div>
        <KindTag k={h.k} />
        <h3>{h.t}</h3>
        <p>{h.d}</p>
        <div className="meta">
          {h.m.map((x) => <span key={x}>{x}</span>)}
          <span className="src">From {h.s}</span>
        </div>
      </div>
      <span className="view">View →</span>
    </a>
  );
}

export default function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const term = (params?.get("q") ?? "").trim();
  const scopeParam = params?.get("scope") ?? null;
  const scope = isScope(scopeParam) ? scopeParam : "all";
  const [q, setQ] = useState(term);
  const [copied, setCopied] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setQ(term), [term]);
  useEffect(() => {
    document.title = term ? `${term} · Search | BrainKB` : "Search | BrainKB";
    if (!term) input.current?.focus();
  }, [term]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Rank: title matches count more than matches in the description or other names.
  const matches = useMemo(() => {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/s$/, ""));
    if (!words.length) return [];
    const score = (h: Hit) => {
      const hay = [h.t, h.d, ...h.m, ...(h.aka ?? [])].join(" ").toLowerCase(), t = h.t.toLowerCase();
      return words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0) + (t.includes(w) ? 2 : 0), 0);
    };
    return SAMPLE.map((h) => ({ h, sc: score(h) })).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).map((x) => x.h);
  }, [term]);

  const count = (k: string) => (k === "all" ? matches.length : matches.filter((h) => h.k === k).length);
  const hits = matches.filter((h) => scope === "all" || h.k === scope);
  const prompt = `Search BrainKB for “${term || "parvalbumin interneurons"}” and show where each fact came from.`;

  const setScope = (s: string) => {
    const p = new URLSearchParams(params?.toString());
    p.set("scope", s);
    router.replace(`/search?${p}`, { scroll: false });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied("Copied");
    } catch {
      setCopied("Select the text to copy");
    }
    setTimeout(() => setCopied(null), 1500);
  };

  let results: React.ReactNode;
  if (!term) {
    results = <Start title="What would you like to find?" text="Search cell types, brain regions, genes, papers and reviews across public spaces. Or start with one of these:" />;
  } else if (!hits.length) {
    results = <Start title={`No results for “${term}”`} text="This preview holds only a few example entries. Try one of these:" />;
  } else {
    const [top, ...rest] = hits;
    const featured = !!top.rel;
    const list = featured ? rest : hits;
    results = (
      <>
        <p className="count">
          <b>{hits.length} result{hits.length === 1 ? "" : "s"}</b> for “{term}”{scope === "all" ? "" : ` in ${KINDS[scope].toLowerCase()}`}
        </p>
        {featured && <Best h={top} />}
        {list.length > 0 && (
          <div className="list">
            <p className="list-h">{featured ? "More results" : "Results"}</p>
            {list.map((h) => <Row key={h.t} h={h} />)}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="band">
        <div className="wrap">
          <form
            className="searchbox"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const t = q.trim();
              router.push(t ? `/search?${new URLSearchParams({ q: t, scope })}` : "/search");
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={input}
              type="search"
              autoComplete="off"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cell types, brain regions, genes, papers…"
              aria-label="Search BrainKB"
            />
            <kbd>/</kbd>
            <button className="btn primary" type="submit">Search</button>
          </form>
          {term && (
            <div className="tabs" role="group" aria-label="Filter by type">
              {Object.entries(KINDS).map(([k, v]) => (
                <button key={k} type="button" aria-pressed={k === scope} disabled={!count(k) && k !== "all"} onClick={() => setScope(k)}>
                  {v}
                  <span>{count(k)}</span>
                </button>
              ))}
            </div>
          )}
          <p className="note">
            <span><i>●</i> Public spaces, no login needed</span>
            <span><b>Sample data</b> · this is a concept preview</span>
          </p>
        </div>
      </div>

      <main className="wrap">
        <div className="layout">
          <section aria-live="polite">{results}</section>
          <aside>
            <div className="card blue">
              <h4>Ask your AI agent instead</h4>
              <p>Run this search from Claude, ChatGPT, Cursor or VS Code over MCP.</p>
              <div className="prompt">{prompt}</div>
              <button className="btn copy" type="button" onClick={copy}>{copied ?? "Copy prompt"}</button>
              <Link className="go" href="/mcp">How to connect an agent →</Link>
            </div>
            <div className="card">
              <h4>Every fact has a source</h4>
              <ol className="steps">
                <li><b>1</b>The sentence and paper it came from</li>
                <li><b>2</b>The job that extracted it</li>
                <li><b>3</b>Who added it, when, and every change</li>
              </ol>
              <Link className="go" href="/#provenance">How provenance works →</Link>
            </div>
            <div className="card">
              <h4>Search your private spaces too</h4>
              <p>Log in with Globus, ORCID or GitHub (top right) to include your own and shared spaces.</p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
