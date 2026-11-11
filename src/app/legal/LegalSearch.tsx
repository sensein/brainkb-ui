"use client";

// The search box and its results, used on /legal (every policy) and on each
// policy page (that policy only).

import Link from "next/link";
import { search, type SearchDoc } from "./search";

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="lg-search">
      <span aria-hidden="true">⌕</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

/** Matching sections, each a link to `/legal/<policy>#<section>` (or, with `onPick`, a jump within the page). */
export function SearchResults({
  docs,
  query,
  showPolicy,
  onPick,
}: {
  docs: SearchDoc[];
  query: string;
  showPolicy?: boolean;
  onPick?: (section: string) => void;
}) {
  if (query.trim().length < 2) return null;
  const hits = search(docs, query);
  if (!hits.length) return <p className="lg-none">No matches for “{query.trim()}”.</p>;
  return (
    <ul className="lg-hits" aria-label="Search results">
      {hits.map((h) => {
        const body = (
          <>
            <b>{showPolicy && <span className="pol">{h.name} › </span>}{h.title}</b>
            <span className="snip">{h.before}{h.match && <mark>{h.match}</mark>}{h.after}</span>
          </>
        );
        return (
          <li key={`${h.policy}#${h.section}`}>
            {onPick ? (
              <a href={`#${h.section}`} onClick={(e) => { e.preventDefault(); onPick(h.section); }}>{body}</a>
            ) : (
              <Link href={`/legal/${h.policy}#${h.section}`}>{body}</Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
