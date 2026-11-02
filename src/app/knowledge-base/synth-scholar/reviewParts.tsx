"use client";

/**
 * Pieces shared by the two literature-review detail pages (run on BrainKB, and
 * ingested into a space): sections with anchors and a section menu, the overview
 * card, the method note drawn from the review's own stated limitations, the
 * included-studies table with search/filter and linked identifiers, and the single
 * Download menu. Everything shown comes from the review's data; nothing is filled in.
 */

import React from "react";
import { Check, ChevronDown, Copy, Download, Info, Loader2, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/app/components/ui/dropdown-menu";

// ── Sections and section navigation ─────────────────────────────────

export function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 scroll-mt-24">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="text-gray-800">{children}</div>
    </section>
  );
}

export type NavItem = { id: string; label: string };

/** "On this page" links to the Review tab's sections. Scrolls without touching the
 *  URL hash, which the pages use for the active tab. */
export function SectionNav({ items }: { items: NavItem[] }) {
  if (items.length < 2) return null;
  const go = (e: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <nav aria-label="Sections of this review" className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mr-3">On this page</span>
      <ul className="inline-flex flex-wrap gap-x-1 gap-y-1 align-middle">
        {items.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} onClick={(e) => go(e, s.id)}
              className="inline-block px-2.5 py-1 rounded-full text-xs text-gray-700 hover:bg-sky-50 hover:text-sky-700 border border-transparent hover:border-sky-100">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── Overview ────────────────────────────────────────────────────────

export type Fact = { label: string; value: React.ReactNode };

/** The review at a glance. Only facts the caller has are passed in. */
export function OverviewSection({ question, facts, methodNote }: {
  question?: string;
  facts: Fact[];
  methodNote?: React.ReactNode;
}) {
  if (!question && facts.length === 0 && !methodNote) return null;
  return (
    <Section id="overview" title="Overview">
      {question && (
        <div className="mb-5">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Research question</div>
          <p className="text-gray-900 leading-relaxed">{question}</p>
        </div>
      )}
      {facts.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {facts.map((f) => (
            <div key={f.label} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{f.label}</dt>
              <dd className="text-sm text-gray-900 mt-1">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {methodNote}
    </Section>
  );
}

// ── Method note (from the review's own stated limitations) ──────────

// Statements about who screened/charted/appraised and whether humans checked it.
const METHOD_PATTERN =
  /(dual[- ]review|dual[- ]screen|human (dual |second |independent )?review|no human|reviewer independence|independent(ly)? (review|screen)|single reviewer|one reviewer|second reviewer|inter-?rater|measured agreement|language[- ]model|\bLLMs?\b|agent[- ]led|automated (screening|review|appraisal)|by (language-model )?agents)/i;

function plain(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]+/g, "")
    .replace(/^\s*(#+|[-*+]|\d+\.)\s+/, "")
    .trim();
}

/** Sentences of the limitations text that state how the review was conducted
 *  (agent-led screening, no human dual review, …). Empty when the text says nothing
 *  of the kind — the note is then not shown. */
export function methodStatements(limitations: string | undefined | null): string[] {
  if (!limitations) return [];
  const sentences = limitations
    .split(/\n+/)
    .flatMap((para) => plain(para).replace(/([.!?])\s+(?=[A-Z(])/g, "$1\u0000").split("\u0000").map((s) => s.trim()))
    .filter(Boolean);
  const out: string[] = [];
  for (const sentence of sentences) {
    if (!METHOD_PATTERN.test(sentence)) continue;
    // Keep only the clauses that make the statement, so the note stays short.
    const clauses = sentence.replace(/[.!?]$/, "").split(/;\s+/).filter((c) => METHOD_PATTERN.test(c));
    const s = `${clauses.join("; ")}.`;
    if (!out.includes(s)) out.push(s);
    if (out.length >= 2) break;
  }
  return out;
}

export function MethodNote({ statements, limitationsId }: { statements: string[]; limitationsId?: string }) {
  if (!statements.length) return null;
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="text-sm text-amber-950">
        <div className="font-semibold mb-1">Method note</div>
        {statements.map((s) => <p key={s} className="leading-relaxed">{s}</p>)}
        <p className="text-xs text-amber-800 mt-1.5">
          Quoted from the review&apos;s stated limitations
          {limitationsId && (
            <>
              {" "}— <a href={`#${limitationsId}`} onClick={(e) => {
                const el = document.getElementById(limitationsId);
                if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
              }}>read all limitations</a>
            </>
          )}.
        </p>
      </div>
    </div>
  );
}

// ── Dates and small fields ──────────────────────────────────────────

/** "public-literature-reviews" → "Public literature reviews", for when a space's name is not known. */
export function readableSlug(slug: string): string {
  const s = slug.replace(/[-_]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : slug;
}

export function formatDate(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? s : new Date(t).toLocaleDateString();
}

/** The range of dates the run recorded for its searches, if it recorded any. */
export function searchDateRange(dates: (string | null | undefined)[]): string | null {
  const ds = dates.filter((d): d is string => !!d).map((d) => ({ d, t: Date.parse(d) }));
  if (!ds.length) return null;
  const valid = ds.filter((x) => !Number.isNaN(x.t)).sort((a, b) => a.t - b.t);
  if (!valid.length) return Array.from(new Set(ds.map((x) => x.d))).join(", ");
  const first = formatDate(valid[0].d)!;
  const last = formatDate(valid[valid.length - 1].d)!;
  return first === last ? first : `${first} – ${last}`;
}

/** A long identifier shown small, with a copy button. */
export function CopyableId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }).catch(() => undefined);
  };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 max-w-full">
      <span>{label}</span>
      <code className="font-mono text-gray-600 truncate" title={value}>{value}</code>
      <button type="button" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}
        className="inline-flex items-center text-gray-500 hover:text-sky-700 shrink-0">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}

// ── Download menu ───────────────────────────────────────────────────

export type DownloadOption = { key: string; label: string; hint?: string };

export function DownloadMenu({ options, busyKey, onPick }: {
  options: DownloadOption[];
  busyKey?: string | null;
  onPick: (key: string) => void;
}) {
  if (!options.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={!!busyKey}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors text-xs font-medium disabled:opacity-60">
          {busyKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Download
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuLabel className="text-xs text-gray-500 font-medium">Download this review as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem key={o.key} onClick={() => onPick(o.key)} className="flex items-baseline justify-between gap-4 text-sm">
            <span>{o.label}</span>
            {o.hint && <span className="text-[11px] text-gray-500">{o.hint}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Included studies ────────────────────────────────────────────────

export type StudyRow = {
  pmid?: string;
  doi?: string;
  pmcid?: string;
  year?: string;
  title?: string;
  journal?: string;
  authors?: string;
  rob?: string;
  /** e.g. "full text (unpaywall)" or "abstract" — what the review read. */
  read?: string;
};

const cleanDoi = (doi: string) => doi.trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:)/i, "");

/** PMID, PMCID and DOI as links to the registries that resolve them. An id that is
 *  not in the registry's own form (e.g. a non-numeric "pmid") is shown as text. */
export function StudyIds({ pmid, doi, pmcid }: Pick<StudyRow, "pmid" | "doi" | "pmcid">) {
  const items: React.ReactNode[] = [];
  const p = (pmid || "").trim();
  const pmc = (pmcid || (/^PMC\d+$/i.test(p) ? p : "")).trim().toUpperCase();
  const link = (href: string, text: string, label: string) => (
    <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="break-all" title={`Open on ${label}`}>{text}</a>
  );
  if (/^\d+$/.test(p)) items.push(link(`https://pubmed.ncbi.nlm.nih.gov/${p}/`, `PMID ${p}`, "PubMed"));
  else if (p && !/^PMC\d+$/i.test(p) && cleanDoi(p) !== cleanDoi(doi || "")) items.push(<span key="pmid" className="break-all">{p}</span>);
  if (/^PMC\d+$/.test(pmc)) items.push(link(`https://pmc.ncbi.nlm.nih.gov/articles/${pmc}/`, pmc, "PubMed Central"));
  const d = doi ? cleanDoi(doi) : "";
  if (/^10\.\d{4,9}\//.test(d)) items.push(link(`https://doi.org/${d}`, `DOI ${d}`, "doi.org"));
  else if (d) items.push(<span key="doi" className="break-all">{d}</span>);
  if (!items.length) return <span className="text-gray-400">—</span>;
  return <span className="flex flex-col gap-0.5">{items}</span>;
}

export function RoBChip({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-xs text-gray-400">—</span>;
  const r = rating.toLowerCase();
  const cls = r.includes("low")
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : r.includes("high")
      ? "bg-red-50 text-red-700 border-red-200"
      : r.includes("some") || r.includes("moderate") || r.includes("unclear")
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-gray-50 text-gray-700 border-gray-200";
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${cls}`}>
      {rating}
    </span>
  );
}

const ALL = "__all__";

export function StudiesTable({ studies, showRead = false, showAuthors = false }: {
  studies: StudyRow[];
  showRead?: boolean;
  showAuthors?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [rob, setRob] = React.useState(ALL);
  const [read, setRead] = React.useState(ALL);

  const robValues = React.useMemo(
    () => Array.from(new Set(studies.map((s) => s.rob || ""))).sort(), [studies]);
  const readValues = React.useMemo(
    () => Array.from(new Set(studies.map((s) => (s.read?.startsWith("full text") ? "full text" : s.read || "")))).sort(),
    [studies]);
  const hasRob = robValues.some(Boolean);

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return studies.filter((s) => {
      if (rob !== ALL && (s.rob || "") !== rob) return false;
      if (read !== ALL && (s.read?.startsWith("full text") ? "full text" : s.read || "") !== read) return false;
      if (!needle) return true;
      return [s.title, s.authors, s.journal, s.year, s.pmid, s.doi, s.pmcid]
        .some((v) => v && v.toLowerCase().includes(needle));
    });
  }, [studies, q, rob, read]);

  const selectCls = "border border-gray-300 rounded-lg bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500";

  return (
    <>
      {hasRob && (
        <p className="text-sm text-gray-600 mb-4">
          <strong className="font-semibold text-gray-800">Risk of bias</strong> is the review&apos;s overall rating of the
          risk that a study&apos;s design or conduct biases its results.
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="relative flex-1">
          <span className="sr-only">Search included studies</span>
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, author, journal, year, PMID or DOI…"
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" />
        </label>
        {hasRob && robValues.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Risk of bias</span>
            <select value={rob} onChange={(e) => setRob(e.target.value)} className={selectCls}>
              <option value={ALL}>All</option>
              {robValues.map((v) => <option key={v || "none"} value={v}>{v || "Not rated"}</option>)}
            </select>
          </label>
        )}
        {showRead && readValues.length > 1 && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="whitespace-nowrap">Read on</span>
            <select value={read} onChange={(e) => setRead(e.target.value)} className={selectCls}>
              <option value={ALL}>All</option>
              {readValues.map((v) => <option key={v || "none"} value={v}>{v || "—"}</option>)}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2" aria-live="polite">
        {shown.length === studies.length ? `${studies.length} studies` : `Showing ${shown.length} of ${studies.length} studies`}
      </p>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-700 uppercase tracking-wider">
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Year</th>
              {showAuthors && <th className="px-3 py-2 text-left">Authors</th>}
              <th className="px-3 py-2 text-left">Identifiers</th>
              {showRead && <th className="px-3 py-2 text-left">Read on</th>}
              <th className="px-3 py-2 text-left whitespace-nowrap">Risk of bias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {shown.map((s, i) => (
              <tr key={`${s.pmid || s.doi || s.title}:${i}`} className="align-top">
                <td className="px-3 py-2 text-gray-900 min-w-[16rem]">
                  {s.title || "(untitled)"}
                  {s.journal && <span className="block text-xs text-gray-500 mt-0.5">{s.journal}</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{s.year || "—"}</td>
                {showAuthors && <td className="px-3 py-2 text-xs text-gray-600 min-w-[10rem]">{s.authors || "—"}</td>}
                <td className="px-3 py-2 font-mono text-xs text-gray-700 min-w-[9rem]">
                  <StudyIds pmid={s.pmid} doi={s.doi} pmcid={s.pmcid} />
                </td>
                {showRead && <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{s.read || "—"}</td>}
                <td className="px-3 py-2"><RoBChip rating={s.rob} /></td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={4 + (showAuthors ? 1 : 0) + (showRead ? 1 : 0)} className="px-3 py-8 text-center text-gray-500">
                  No included studies match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
