"use client";

// Tutorial, laid out as a book: one chapter per topic, numbered sections, a
// chapter sidebar and an "on this page" rail. The chapters come from
// content/*.yaml (loaded by content.ts in the page); this file only renders them.
// Inline markup: `code`, **bold**, *italic*, [text](href).

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { CodeBox } from "../components/marketing/SkillSetup";
import type { Block, Code, Need, Section, Topic } from "./types";

const slug = (s: string) => `t-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

/** `code`, **bold**, *italic* and [text](href) in tutorial copy. */
function Rich({ text, onHash }: { text: string; onHash?: (id: string) => void }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/);
  return (
    <>
      {parts.map((p, n) => {
        if (p.length > 1 && p.startsWith("`") && p.endsWith("`")) return <code key={n}>{p.slice(1, -1)}</code>;
        if (p.startsWith("**") && p.endsWith("**")) return <b key={n}>{p.slice(2, -2)}</b>;
        if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) return <i key={n}>{p.slice(1, -1)}</i>;
        const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const [, label, href] = link;
          if (href.startsWith("http")) return <a key={n} href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
          if (href.startsWith("#")) {
            return (
              <a key={n} href={href} onClick={(e) => { e.preventDefault(); onHash?.(href.slice(1)); }}>{label}</a>
            );
          }
          return <Link key={n} href={href}>{label}</Link>;
        }
        return <Fragment key={n}>{p}</Fragment>;
      })}
    </>
  );
}

function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };
  return { copied, copy };
}

function Ask({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="tut-ask">
      <span className="who">Ask</span>
      <span className="q">{text}</span>
      <button type="button" onClick={() => copy(text)}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

/** Alternative commands (e.g. npx / GitHub) as tabs; one item renders as a plain code box. */
function CodeTabs({ items }: { items: Code[] }) {
  const [i, setI] = useState(0);
  const { copied, copy } = useCopy();
  if (items.length === 1) return <CodeBox {...items[0]} />;
  const cur = items[i];
  return (
    <div className="tut-ex-pane">
      <div className="tut-ex-head">
        <div className="tut-ex-tabs" role="tablist" aria-label="Install options">
          {items.map((o, k) => (
            <button key={o.label} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
              {o.label}
            </button>
          ))}
        </div>
        <button type="button" className="copy" onClick={() => copy(cur.cmd)}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre className="tut-tabs-pre">{cur.cmd}</pre>
    </div>
  );
}

/** Input, then one of several outputs (tabs). */
function Example({ input, outputs }: { input: Code; outputs: Code[] }) {
  const [i, setI] = useState(0);
  const { copied, copy } = useCopy();
  const out = outputs[i];
  return (
    <div className="tut-example">
      <div className="tut-ex-pane">
        <div className="tut-ex-head"><span>{input.label}</span></div>
        <pre className="in">{input.cmd}</pre>
      </div>
      <div className="tut-ex-arrow" aria-hidden="true">↓</div>
      <div className="tut-ex-pane">
        <div className="tut-ex-head">
          <div className="tut-ex-tabs" role="tablist" aria-label="Output">
            {outputs.map((o, k) => (
              <button key={o.label} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
                {o.label}
              </button>
            ))}
          </div>
          <button type="button" className="copy" onClick={() => copy(out.cmd)}>{copied ? "Copied" : "Copy"}</button>
        </div>
        <pre>{out.cmd}</pre>
      </div>
    </div>
  );
}

function NeedRows({ rows, kind }: { rows: Need[]; kind: "req" | "opt" }) {
  return (
    <ul className={`tut-needs ${kind}`}>
      {rows.map((r) => (
        <li key={r.name}>
          <span className="mark" aria-hidden="true">{kind === "req" ? "✓" : "+"}</span>
          <div>
            <b>{r.name}</b>
            <p><Rich text={r.why} /></p>
            {r.cmd && <code className="cmd">{r.cmd}</code>}
          </div>
        </li>
      ))}
    </ul>
  );
}

const sectionId = (topic: Topic, n: number) => `${topic.id}--${slug(topic.sections[n].title).slice(2)}`;

export default function TutorialHub({ topics: TOPICS }: { topics: Topic[] }) {
  const [id, setId] = useState(TOPICS[0].id);
  const [active, setActive] = useState("");
  const [filter, setFilter] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const ci = Math.max(0, TOPICS.findIndex((t) => t.id === id));
  const topic = TOPICS[ci];
  const next = TOPICS[ci + 1];

  /** Open a chapter, optionally at one of its sections. */
  const open = (target: string, section?: string) => {
    // Accepts "chapter" or "chapter--section" (in-text links).
    const chapter = target.split("--")[0];
    if (!section && target.includes("--")) section = target;
    if (!TOPICS.some((t) => t.id === chapter)) return;
    setId(chapter);
    setMenuOpen(false);
    history.replaceState(null, "", `#${section ?? chapter}`);
    setTimeout(() => {
      document.getElementById(section ?? "tut-chapter")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // Deep links: #structsense opens a chapter, #structsense--install a section.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      const chapter = h.split("--")[0];
      if (!TOPICS.some((t) => t.id === chapter)) return;
      setId(chapter);
      // Wait for the chapter to render and lay out before scrolling to the section.
      if (h.includes("--")) setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: "start" }), 120);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [TOPICS]);

  // Highlight the section being read.
  useEffect(() => {
    const els = topic.sections.map((_, n) => document.getElementById(sectionId(topic, n))).filter(Boolean) as HTMLElement[];
    setActive(els[0]?.id ?? "");
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [topic]);

  const q = filter.trim().toLowerCase();

  const renderSection = (s: Section, n: number) => {
    let stepNo = 0;
    const renderBlock = (b: Block, k: number): React.ReactNode => {
      if ("p" in b) return <p key={k} className="tut-p"><Rich text={b.p} onHash={open} /></p>;
      if ("h" in b) return <h4 key={k} className="tut-h">{b.h}</h4>;
      if ("note" in b) {
        return (
          <div key={k} className="tut-note">
            <span aria-hidden="true">i</span>
            <p><Rich text={b.note} onHash={open} /></p>
          </div>
        );
      }
      if ("ask" in b) return <Ask key={k} text={b.ask} />;
      if ("code" in b) return <CodeBox key={k} {...b.code} />;
      if ("example" in b) return <Example key={k} {...b.example} />;
      if ("options" in b) return <CodeTabs key={k} items={b.options} />;
      if ("step" in b) {
        stepNo += 1;
        return (
          <div key={k} className="tut-stepcard">
            <span className="num">{stepNo}</span>
            <div className="body">
              <h4>{b.step.title}</h4>
              {b.step.desc && <p className="desc"><Rich text={b.step.desc} onHash={open} /></p>}
              {b.step.blocks.map(renderBlock)}
            </div>
          </div>
        );
      }
      if ("features" in b) {
        return (
          <div key={k} className="tut-features">
            {b.features.map((f) => (
              <div key={f.title}>
                <b>{f.title}</b>
                <p><Rich text={f.desc} onHash={open} /></p>
              </div>
            ))}
          </div>
        );
      }
      if ("steps" in b) {
        return (
          <ol key={k} className="tut-steps">
            {b.steps.map((t) => <li key={t}><span><Rich text={t} onHash={open} /></span></li>)}
          </ol>
        );
      }
      if ("tips" in b) {
        return (
          <ul key={k} className="tut-tips">
            {b.tips.map((t) => <li key={t}><span><Rich text={t} onHash={open} /></span></li>)}
          </ul>
        );
      }
      if ("table" in b) {
        return (
          <div key={k} className="tut-table">
            <table>
              <thead>
                <tr>{b.table.cols.map((c) => <th key={c}><Rich text={c} /></th>)}</tr>
              </thead>
              <tbody>
                {b.table.rows.map((r) => (
                  <tr key={r[0]}>
                    {r.map((c, m) => <td key={m}><Rich text={c} onHash={open} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return (
        <div key={k} className="tut-needs-wrap">
          <div>
            <span className="tut-lbl req">Required</span>
            <NeedRows rows={b.needs.required} kind="req" />
          </div>
          <div>
            <span className="tut-lbl opt">Optional · add it for</span>
            <NeedRows rows={b.needs.optional} kind="opt" />
          </div>
        </div>
      );
    };
    return (
      <section key={s.title} id={sectionId(topic, n)} className="book-sec">
        <h2><span className="num">{ci + 1}.{n + 1}</span>{s.title}</h2>
        <p className="book-sub">{s.subtitle}</p>
        {s.blocks.map(renderBlock)}
      </section>
    );
  };

  return (
    <div className="book">
      <button type="button" className="book-menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        ☰ Chapters · {ci + 1}. {topic.name}
      </button>

      <aside className={`book-side${menuOpen ? " open" : ""}`} aria-label="Chapters">
        <div className="book-title">▤ BrainKB Tutorial</div>
        <input
          type="search"
          className="book-filter"
          placeholder="Filter sections…"
          aria-label="Filter sections"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {TOPICS.map((t, c) => {
          const secs = t.sections
            .map((s, n) => ({ s, n }))
            .filter(({ s }) => !q || s.title.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
          if (q && secs.length === 0) return null;
          return (
            <div key={t.id} className={`book-ch${t.id === id ? " cur" : ""}`}>
              <button type="button" onClick={() => open(t.id)}>
                <span>{c + 1}</span>{t.name}
              </button>
              {(t.id === id || q) && (
                <div className="book-secs">
                  {secs.map(({ s, n }) => {
                    const sid = sectionId(t, n);
                    return (
                      <a
                        key={sid}
                        href={`#${sid}`}
                        className={sid === active ? "sel" : undefined}
                        onClick={(e) => { e.preventDefault(); open(t.id, sid); }}
                      >
                        {c + 1}.{n + 1}&nbsp;&nbsp;{s.title}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      <article className="book-main" id="tut-chapter" key={topic.id}>
        <header className={`book-head${topic.logo ? " has-logo" : ""}`}>
          <div>
            <div className="eyebrow">Chapter {ci + 1}</div>
            <h1>{topic.name}</h1>
            <p className="book-lead">{topic.summary}</p>
          </div>
          {topic.logo && (
            // eslint-disable-next-line @next/next/no-img-element -- static logo from /public
            <img className="book-logo" src={topic.logo} alt={`${topic.name} logo`} />
          )}
        </header>
        <dl className="tut-facts">
          {Object.entries(topic.facts).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {topic.tryIt && (
          <div className="book-try">
            <h6>Try it yourself</h6>
            <CodeTabs items={topic.tryIt} />
          </div>
        )}
        <hr />
        {topic.sections.map(renderSection)}
        <hr />
        <div className="book-pager">
          {ci > 0 && (
            <button type="button" onClick={() => open(TOPICS[ci - 1].id)}>
              <small>Previous chapter</small>← {ci}. {TOPICS[ci - 1].name}
            </button>
          )}
          {next && (
            <button type="button" className="nx" onClick={() => open(next.id)}>
              <small>Next chapter</small>{ci + 2}. {next.name} →
            </button>
          )}
        </div>
      </article>

      <aside className="book-rail" aria-label="About this chapter">
        <div className="book-quick">
          <a href={topic.help.replace(/\/issues$/, "")} target="_blank" rel="noopener noreferrer">◉ GitHub</a>
          <a href={topic.help} target="_blank" rel="noopener noreferrer">✎ Report an issue</a>
        </div>
        <h5>On this page</h5>
        <nav className="book-toc">
          {topic.sections.map((s, n) => {
            const sid = sectionId(topic, n);
            return (
              <a
                key={sid}
                href={`#${sid}`}
                className={sid === active ? "sel" : undefined}
                onClick={(e) => { e.preventDefault(); open(topic.id, sid); }}
              >
                {s.title}
              </a>
            );
          })}
        </nav>
        <div className="book-panel">
          <h6>✓ Prerequisites</h6>
          <ul className="pre">
            {topic.prereqs.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
        <div className="book-panel">
          <h6>↗ Useful links</h6>
          <ul className="lnk">
            {topic.links.map((l) =>
              l.href.startsWith("http") ? (
                <li key={l.label}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a></li>
              ) : (
                <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
              ),
            )}
          </ul>
        </div>
        {next && (
          <div className="book-panel">
            <h6>→ Next chapter</h6>
            <p>{next.summary}</p>
            <button type="button" className="btn primary" onClick={() => open(next.id)}>Go to {next.name} →</button>
          </div>
        )}
      </aside>
    </div>
  );
}
