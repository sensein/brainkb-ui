"use client";

// One policy on its own page: a plain header (number, title, one line, meta),
// then three columns, docs-style: every policy on the left, the policy in the
// middle, and an "on this page" rail on the right that follows the reader's
// scroll down through its sections and sub-headings.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Rich } from "../tutorial/TutorialHub";
import { SearchBox, SearchResults } from "./LegalSearch";
import { sectionId, type SearchDoc } from "./search";
import { REPO_URL, type LegalPageText, type Policy, type PolicyBlock, type PolicyVersion } from "./content";

const pad = (n: number) => String(n).padStart(2, "0");

/** Anchor id of a sub-heading inside a section. */
const subId = (section: string, h: string) => `${section}--${sectionId(h)}`;

function Block({ b, section }: { b: PolicyBlock; section: string }) {
  if ("p" in b) return <p><Rich text={b.p} /></p>;
  if ("h" in b) return <h3 id={subId(section, b.h)}>{b.h}</h3>;
  if ("list" in b) {
    return (
      <ul className="lg-list">
        {b.list.map((t) => <li key={t}><Rich text={t} /></li>)}
      </ul>
    );
  }
  if ("table" in b) {
    return (
      <div className="tut-table">
        <table>
          <thead>
            <tr>{b.table.cols.map((c) => <th key={c}><Rich text={c} /></th>)}</tr>
          </thead>
          <tbody>
            {b.table.rows.map((r) => (
              <tr key={r[0]}>{r.map((c, m) => <td key={m}><Rich text={c} /></td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if ("note" in b) {
    return (
      <div className="tut-note">
        <span aria-hidden="true">i</span>
        <p><Rich text={b.note} /></p>
      </div>
    );
  }
  return (
    <div className="tut-callout" role="note">
      <b><Rich text={b.callout.title} /></b>
      <p><Rich text={b.callout.text} /></p>
    </div>
  );
}

type Neighbour = { id: string; name: string } | undefined;

/** A row of the "on this page" rail: a section, or a sub-heading in one. */
type TocItem = { id: string; title: string; section: string; sub: boolean; num?: string };

/** Anchor id of the version history at the end of the page. */
const HISTORY_ID = "version-history";

/** How far below the top of the window a heading counts as being read (the sticky header is ~76px). */
const READ_LINE = 120;

export default function PolicyDoc({
  policy,
  policies,
  number,
  doc,
  updated,
  minutes,
  prev,
  next,
  contactText,
  versions,
}: {
  policy: Policy;
  /** Every policy, for the sidebar. */
  policies: { id: string; name: string }[];
  /** Its place in the list at /legal, from 1. */
  number: number;
  doc: SearchDoc;
  /** `policy.last_updated` as "Oct 20, 2026", formatted on the server so it matches on hydration. */
  updated: string;
  minutes: number;
  prev: Neighbour;
  next: Neighbour;
  contactText: Pick<LegalPageText, "contact_prompt" | "contact_link">;
  /** `policy.history` with each date formatted on the server, as `when`. */
  versions: (PolicyVersion & { when: string })[];
}) {
  const [active, setActive] = useState("");
  const [query, setQuery] = useState("");
  const railRef = useRef<HTMLElement>(null);
  const ids = policy.sections.map((s) => sectionId(s.title));
  const no = pad(number);
  const toc: TocItem[] = policy.sections.flatMap((s, n) => [
    { id: ids[n], title: s.title, section: ids[n], sub: false, num: pad(n + 1) },
    ...s.blocks.flatMap((b) => ("h" in b ? [{ id: subId(ids[n], b.h), title: b.h, section: ids[n], sub: true }] : [])),
  ]).concat({ id: HISTORY_ID, title: "Version history", section: HISTORY_ID, sub: false });
  const activeSection = toc.find((t) => t.id === active)?.section;

  // Track the heading being read: the last one above the read line, or the
  // last one of all once the page is scrolled to the bottom.
  useEffect(() => {
    const els = toc.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        let cur = els[0]?.id ?? "";
        for (const el of els) {
          if (el.getBoundingClientRect().top > READ_LINE) break;
          cur = el.id;
        }
        const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        if (atEnd && els.length) cur = els[els.length - 1].id;
        setActive(cur);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toc derives from policy
  }, [policy]);

  // Keep the highlighted row in view inside the rail, which scrolls on its own.
  useEffect(() => {
    const rail = railRef.current;
    const row = rail?.querySelector<HTMLElement>(`[data-toc="${active}"]`);
    if (!rail || !row || rail.scrollHeight <= rail.clientHeight) return;
    const top = row.offsetTop;
    if (top < rail.scrollTop + 40 || top + row.offsetHeight > rail.scrollTop + rail.clientHeight - 40) {
      rail.scrollTo({ top: top - rail.clientHeight / 3, behavior: "smooth" });
    }
  }, [active]);

  const goTo = (id: string) => {
    history.replaceState(null, "", `#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lg-doc">
      <header className="lg-top lg-doc-head">
        <div>
          <span className="eyebrow">Policy {no}</span>
          <h1>{policy.name}</h1>
        </div>
        <div>
          <p className="lead">{policy.tagline}</p>
          <div className="meta">
            <span>Updated <time dateTime={policy.last_updated}>{updated}</time></span>
            <span>{policy.sections.length} sections</span>
            <span>{minutes} min read</span>
          </div>
        </div>
      </header>

      <div className="lg-doc-grid">
        <aside className="lg-nav" aria-label="Policies">
          <h5>Policies</h5>
          <nav>
            {policies.map((p, n) => (
              <Link
                key={p.id}
                href={`/legal/${p.id}`}
                className={p.id === policy.id ? "cur" : undefined}
                aria-current={p.id === policy.id ? "page" : undefined}
              >
                <span>{pad(n + 1)}</span>{p.name}
              </Link>
            ))}
          </nav>
          <button type="button" className="lg-print" onClick={() => window.print()}>Print or save as PDF</button>
          <Link href="/legal" className="lg-all">← All policies</Link>
        </aside>

        <article className="lg-body">
          <p className="lg-intro"><Rich text={policy.summary} /></p>
          {policy.sections.map((s, n) => (
            <section key={ids[n]} id={ids[n]} className="lg-sec">
              <span className="num">{no}.{n + 1}</span>
              <h2>{s.title}</h2>
              {s.blocks.map((b, k) => <Block key={k} b={b} section={ids[n]} />)}
            </section>
          ))}

          <section id={HISTORY_ID} className="lg-sec lg-history">
            <span className="num">Provenance</span>
            <h2>Version history</h2>
            <p className="lg-history-lead">
              Who changed this policy, when, and what changed. The current version is {versions[0].version}.
            </p>
            <div className="tut-table">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Date</th>
                    <th>Edited by</th>
                    <th>What changed</th>
                    <th>Commit</th>
                  </tr>
                </thead>
                <tbody>
                  {versions.map((v, n) => (
                    <tr key={v.version}>
                      <td className="ver">
                        {v.version}
                        {n === 0 && <span className="cur">Current</span>}
                      </td>
                      <td className="when"><time dateTime={v.date}>{v.when}</time></td>
                      <td className="who">{v.author}</td>
                      <td><Rich text={v.changes} /></td>
                      <td className="commit">
                        {v.commit ? (
                          <a href={`${REPO_URL}/commit/${v.commit}`} target="_blank" rel="noopener noreferrer">{v.commit.slice(0, 7)}</a>
                        ) : (
                          <span title="Not committed yet">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {(prev || next) && (
            <nav className="lg-pager" aria-label="Other policies">
              {prev && (
                <Link href={`/legal/${prev.id}`}>
                  <small>← Previous</small>
                  <b>{prev.name}</b>
                </Link>
              )}
              {next && (
                <Link href={`/legal/${next.id}`} className="nx">
                  <small>Next →</small>
                  <b>{next.name}</b>
                </Link>
              )}
            </nav>
          )}
          {policy.contact && (
            <p className="lg-ask">
              {contactText.contact_prompt} <a href={`mailto:${policy.contact.email}`}>{contactText.contact_link}</a>
            </p>
          )}
        </article>

        <aside className="lg-rail" ref={railRef} aria-label="On this page">
          <SearchBox value={query} onChange={setQuery} placeholder="Search this policy" />
          <SearchResults docs={[doc]} query={query} onPick={goTo} />
          <h5>On this page</h5>
          <nav className="lg-toc">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                data-toc={t.id}
                className={[t.sub && "sub", t.id === active && "sel", !t.sub && t.section === activeSection && t.id !== active && "in"]
                  .filter(Boolean)
                  .join(" ") || undefined}
                aria-current={t.id === active ? "location" : undefined}
                onClick={(e) => { e.preventDefault(); goTo(t.id); }}
              >
                {t.num && <span>{t.num}</span>}{t.title}
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
