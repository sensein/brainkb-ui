"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const TRY = ["neuron", "cell type", "hippocampus", "single-cell", "taxonomy"];

export const SEARCH_INPUT_ID = "lp-q";

/** Hero search: opens /search; the "try" links run an example query. */
export default function HeroSearch() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    router.push(`/search?${new URLSearchParams({ q: t })}`);
  };

  // "/" focuses the search box from anywhere on the page; Escape clears it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = input.current;
      if (!el) return;
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        el.focus();
      }
      if (e.key === "Escape" && document.activeElement === el) setQ("");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      className="search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
    >
      <label className="searchbox" htmlFor={SEARCH_INPUT_ID}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={input}
          id={SEARCH_INPUT_ID}
          type="search"
          autoComplete="off"
          required
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search cell types, brain regions, genes, papers…"
          aria-label="Search BrainKB"
        />
        <kbd>/</kbd>
        <button className="btn primary" type="submit">
          Search
        </button>
      </label>
      <div className="try">
        <b>Try it now, no login:</b>
        {TRY.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setQ(t);
              go(t);
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </form>
  );
}

/** CTA link that scrolls back to the hero and puts the cursor in the search box. */
export function FocusSearchLink({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <a
      className={className}
      href="#top"
      onClick={() => setTimeout(() => document.getElementById(SEARCH_INPUT_ID)?.focus({ preventScroll: true }), 400)}
    >
      {children}
    </a>
  );
}
