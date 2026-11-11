"use client";

// /legal: a search box over every policy, then a numbered row per policy with
// its sections as chips. While a search is typed, the rows narrow to the
// policies that match.

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBox, SearchResults } from "./LegalSearch";
import { search, type SearchDoc } from "./search";
import type { LegalPageText } from "./content";

export type PolicyRow = {
  id: string;
  name: string;
  tagline: string;
  /** ISO date. */
  last_updated: string;
  /** `last_updated` as "Oct 20, 2026", formatted on the server. */
  updated: string;
  sections: { id: string; title: string }[];
};

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const count = (n: number, one: string, many: string) => `${WORDS[n] ?? n} ${n === 1 ? one : many}`;

/** "Updated today" / "Updated this week" / "Recently updated", from the reader's clock (so it can't go stale in a build). */
function useFreshness(rows: PolicyRow[]) {
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const out: Record<string, string> = {};
    for (const r of rows) {
      const days = Math.round((todayUtc - Date.parse(`${r.last_updated}T00:00:00Z`)) / 86_400_000);
      if (days < 0 || Number.isNaN(days)) continue;
      if (days === 0) out[r.id] = "Updated today";
      else if (days < 7) out[r.id] = "Updated this week";
      else if (days < 30) out[r.id] = "Recently updated";
    }
    setLabels(out);
  }, [rows]);
  return labels;
}

export default function LegalIndex({ text, rows, docs }: { text: LegalPageText; rows: PolicyRow[]; docs: SearchDoc[] }) {
  const [query, setQuery] = useState("");
  // `/legal?q=cookies` opens with that search, so a search can be shared as a link.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
  }, []);
  const fresh = useFreshness(rows);
  const searching = query.trim().length >= 2;
  const matched = new Set(search(docs, query).map((h) => h.policy));
  const shown = searching ? rows.filter((r) => matched.has(r.id)) : rows;
  const total = rows.reduce((n, r) => n + r.sections.length, 0);

  return (
    <div className="lg-index">
      <section className="lg-top">
        <div>
          <span className="eyebrow">{text.eyebrow}</span>
          <h1>{text.title}</h1>
        </div>
        <p className="lead">
          {text.intro.replace("{policies}", count(rows.length, "policy", "policies")).replace("{sections}", String(total))}
        </p>
      </section>

      <SearchBox value={query} onChange={setQuery} placeholder={text.search_placeholder} />
      <SearchResults docs={docs} query={query} showPolicy />

      {searching && shown.length > 0 && <h2 className="lg-sub">Policies that match</h2>}
      <ol className="lg-rows">
        {shown.map((r) => (
          <li key={r.id} className="lg-row">
            <span className="n">{String(rows.indexOf(r) + 1).padStart(2, "0")}</span>
            <div className="body">
              <h2>
                <Link href={`/legal/${r.id}`}>{r.name}</Link>
                {fresh[r.id] && <span className="badge">{fresh[r.id]}</span>}
              </h2>
              <p>{r.tagline}</p>
              <ul className="chips" aria-label={`${r.name} sections`}>
                {r.sections.map((s) => (
                  <li key={s.id}><Link href={`/legal/${r.id}#${s.id}`}>{s.title}</Link></li>
                ))}
              </ul>
            </div>
            <div className="side">
              <time dateTime={r.last_updated}>{r.updated}</time>
              <Link href={`/legal/${r.id}`} className="read" aria-label={`Read the ${r.name}`}>Read →</Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
