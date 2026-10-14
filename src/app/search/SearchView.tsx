"use client";

// Live full-text search over public spaces, via /api/search (which proxies the
// query service). Results are paged with `offset`; the space chips re-run the
// search scoped to one space.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const PAGE = 25;
const SUGGESTIONS = ["neuron", "cell type", "hippocampus", "single-cell", "taxonomy"];

type Hit = {
  subject: string;
  graph: string | null;
  space: string | null;
  visibility: string | null;
  snippet: string;
  title: string | null;
  types: string[];
};

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; hits: Hit[]; more: boolean };

const href = (q: string, space?: string | null) =>
  `/search?${new URLSearchParams(space ? { q, space } : { q })}`;

// Most specific type first: "Resource" is the generic parent of "Schema" etc.
const kindOf = (types: string[]) => types.find((t) => t !== "Resource") ?? types[0] ?? "Record";

const shortIri = (iri: string) => iri.replace(/^https?:\/\//, "");

function Suggestions({ title, text }: { title: string; text: string }) {
  return (
    <div className="start">
      <h2>{title}</h2>
      <p>{text}</p>
      <div className="rel">
        {SUGGESTIONS.map((q) => (
          <Link key={q} href={href(q)}>{q}</Link>
        ))}
      </div>
    </div>
  );
}

function Row({ h }: { h: Hit }) {
  const [copied, setCopied] = useState(false);
  const kind = kindOf(h.types);
  const title = h.title && !/^sentence \d+$/i.test(h.title) ? h.title : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(h.subject);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <article className="hit">
      <span className="tico kind k-entity" aria-hidden="true">{kind.slice(0, 2)}</span>
      <div>
        <span className="kind k-entity">{kind}</span>
        {title && <h3>{title}</h3>}
        <p className={title ? undefined : "lead-snippet"}>{h.snippet}</p>
        <div className="meta">
          {h.space && <span className="src">{h.space}</span>}
          {h.visibility && <span>{h.visibility}</span>}
          <span className="iri" title={h.subject}>{shortIri(h.subject)}</span>
        </div>
      </div>
      <button type="button" className="view" onClick={copy}>
        {copied ? "Copied" : "Copy IRI"}
      </button>
    </article>
  );
}

export default function SearchView() {
  const router = useRouter();
  const params = useSearchParams();
  const term = (params?.get("q") ?? "").trim();
  const space = params?.get("space") || null;
  const [q, setQ] = useState(term);
  const [state, setState] = useState<State>({ status: "idle" });
  const [offset, setOffset] = useState(0);
  const [spaces, setSpaces] = useState<string[]>([]);
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

  // A new query or space starts over from the first page.
  useEffect(() => setOffset(0), [term, space]);

  useEffect(() => {
    if (!term) {
      setState({ status: "idle" });
      return;
    }
    const ctrl = new AbortController();
    if (offset === 0) setState({ status: "loading" });
    const p = new URLSearchParams({ q: term, limit: String(PAGE), offset: String(offset) });
    if (space) p.set("space", space);
    fetch(`/api/search?${p}`, { signal: ctrl.signal })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok || body.error) throw new Error(body.error || `Search failed (${r.status})`);
        const page: Hit[] = body.hits ?? [];
        setState((s) => ({
          status: "done",
          hits: offset > 0 && s.status === "done" ? [...s.hits, ...page] : page,
          more: page.length === PAGE,
        }));
        // Remember the spaces seen for this query so the chips survive scoping to one.
        if (!space) setSpaces((prev) => Array.from(new Set([...(offset > 0 ? prev : []), ...page.map((h) => h.space).filter((x): x is string => !!x)])));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setState({ status: "error", message: e.message });
      });
    return () => ctrl.abort();
  }, [term, space, offset]);

  const prompt = `Search BrainKB for “${term || "PVALB interneurons"}” and show where each fact came from.`;
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied("Copied");
    } catch {
      setCopied("Select the text to copy");
    }
    setTimeout(() => setCopied(null), 1500);
  };

  let results: React.ReactNode;
  if (state.status === "idle") {
    results = <Suggestions title="What would you like to find?" text="Search the text and records in BrainKB's public spaces. Or start with one of these:" />;
  } else if (state.status === "loading") {
    results = <p className="count" role="status">Searching for “{term}”…</p>;
  } else if (state.status === "error") {
    results = (
      <div className="start">
        <h2>Search is unavailable right now</h2>
        <p>{state.message}. Try again in a moment.</p>
      </div>
    );
  } else if (!state.hits.length) {
    results = <Suggestions title={`No results for “${term}”${space ? ` in ${space}` : ""}`} text="Try a broader term, or one of these:" />;
  } else {
    results = (
      <>
        <p className="count">
          <b>{state.hits.length}{state.more ? "+" : ""} result{state.hits.length === 1 ? "" : "s"}</b> for “{term}”
          {space ? ` in ${space}` : ""}
        </p>
        <div className="list" style={{ marginTop: 0 }}>
          {state.hits.map((h) => <Row key={h.subject} h={h} />)}
        </div>
        {state.more && (
          <button type="button" className="btn more" onClick={() => setOffset(state.hits.length)}>
            Load more results
          </button>
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
              router.push(t ? href(t) : "/search");
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
          {term && (spaces.length > 0 || space) && (
            <div className="tabs" role="group" aria-label="Filter by space">
              <button type="button" aria-pressed={!space} onClick={() => router.replace(href(term), { scroll: false })}>
                All spaces
              </button>
              {Array.from(new Set([...spaces, ...(space ? [space] : [])])).map((s) => (
                <button key={s} type="button" aria-pressed={s === space} onClick={() => router.replace(href(term, s), { scroll: false })}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <p className="note">
            <span><i>●</i> Public spaces, no login needed</span>
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
              <button className="btn copy" type="button" onClick={copyPrompt}>{copied ?? "Copy prompt"}</button>
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
              <p>This page searches public spaces. Signed in over MCP, your agent also searches your own and shared spaces.</p>
              <Link className="go" href="/mcp">Connect over MCP →</Link>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
