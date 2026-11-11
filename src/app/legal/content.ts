// Loads the legal pages from content/*.yaml (server only). Adding a policy
// means adding a YAML file; no code change. See content/README.md.

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { type SearchDoc, plain, sectionId } from "./search";

export type PolicyBlock =
  | { p: string }
  | { h: string }
  | { list: string[] }
  | { table: { cols: string[]; rows: string[][] } }
  | { note: string }
  | { callout: { title: string; text: string } };

export type PolicySection = { title: string; blocks: PolicyBlock[] };

/** One published version of a policy: who changed it, when, and what changed. */
export type PolicyVersion = {
  version: string;
  /** ISO date, e.g. "2026-10-20". */
  date: string;
  author: string;
  changes: string;
  /** Short or full commit hash, linked to the repository on GitHub. */
  commit?: string;
};

/** Where `commit` hashes in a policy's history link to. */
export const REPO_URL = "https://github.com/sensein/brainkb-ui";

export type Policy = {
  id: string;
  name: string;
  /** One line under its name, at /legal and on its page. */
  tagline: string;
  /** The opening paragraph of the policy. */
  summary: string;
  /** Newest first. */
  history: PolicyVersion[];
  /** The newest version's date (from `history`). */
  last_updated: string;
  contact?: { label: string; email: string };
  sections: PolicySection[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Checks a policy's history: complete entries, real dates, newest first, no repeated versions. */
function checkHistory(file: string, history: unknown): PolicyVersion[] {
  if (!Array.isArray(history) || history.length === 0) {
    throw new Error(`legal/content/${file}: "history" needs at least one version`);
  }
  const seen = new Set<string>();
  return history.map((raw, n) => {
    const v = { ...(raw as PolicyVersion), version: String((raw as PolicyVersion)?.version ?? "") };
    const where = `legal/content/${file}: history[${n}]`;
    for (const key of ["version", "date", "author", "changes"] as const) {
      if (!v[key]) throw new Error(`${where}: missing "${key}"`);
    }
    if (!ISO_DATE.test(v.date) || Number.isNaN(Date.parse(v.date))) throw new Error(`${where}: "date" must be YYYY-MM-DD`);
    if (n > 0 && v.date > (history[n - 1] as PolicyVersion).date) {
      throw new Error(`${where}: list versions newest first (${v.date} is after ${(history[n - 1] as PolicyVersion).date})`);
    }
    if (seen.has(v.version)) throw new Error(`${where}: version "${v.version}" appears twice`);
    seen.add(v.version);
    if (v.commit !== undefined) v.commit = String(v.commit);
    return v;
  });
}

const CONTENT_DIR = path.join(process.cwd(), "src", "app", "legal", "content");

export function loadPolicies(): Policy[] {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => /\.ya?ml$/.test(f) && !f.startsWith("_"))
    .sort()
    .map((file) => {
      const raw = yaml.load(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8")) as Policy;
      for (const key of ["id", "name", "tagline", "summary", "sections"] as const) {
        if (!raw?.[key]) throw new Error(`legal/content/${file}: missing "${key}"`);
      }
      const history = checkHistory(file, raw.history);
      return {
        ...raw,
        history,
        last_updated: history[0].date,
        sections: raw.sections.map((s) => ({ ...s, blocks: s.blocks ?? [] })),
      };
    });
}

/** The text of the /legal page itself, from content/_page.yaml. */
export type LegalPageText = {
  eyebrow: string;
  title: string;
  /** `{policies}` → "Four policies", `{sections}` → the total number of sections. */
  intro: string;
  search_placeholder: string;
  contact_prompt: string;
  contact_link: string;
};

export function loadPageText(): LegalPageText {
  const raw = yaml.load(fs.readFileSync(path.join(CONTENT_DIR, "_page.yaml"), "utf8")) as LegalPageText;
  for (const key of ["eyebrow", "title", "intro", "search_placeholder", "contact_prompt", "contact_link"] as const) {
    if (!raw?.[key]) throw new Error(`legal/content/_page.yaml: missing "${key}"`);
  }
  return raw;
}

/** The plain text of one block, for search. */
function blockText(b: PolicyBlock): string {
  if ("p" in b) return b.p;
  if ("h" in b) return b.h;
  if ("list" in b) return b.list.join(" ");
  if ("table" in b) return b.table.rows.map((r) => r.join(" ")).join(" ");
  if ("note" in b) return b.note;
  return `${b.callout.title}. ${b.callout.text}`;
}

/** What the search boxes look through: every section of every policy, as plain text. */
export function searchDocs(policies: Policy[]): SearchDoc[] {
  return policies.map((p) => ({
    id: p.id,
    name: p.name,
    sections: p.sections.map((s) => ({
      id: sectionId(s.title),
      title: s.title,
      text: plain(s.blocks.map(blockText).join(" ")),
    })),
  }));
}

/** "October 20, 2026", or "Oct 20, 2026" with `short`. */
export function formatDate(iso: string, month: "long" | "short" = "long"): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month, day: "numeric", timeZone: "UTC" });
}
