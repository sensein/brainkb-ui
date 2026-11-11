// Search over the legal pages, shared by the /legal index and each policy
// page. No server-only imports, so client components can use it.

export type SearchDoc = { id: string; name: string; sections: { id: string; title: string; text: string }[] };

export type Hit = { policy: string; name: string; section: string; title: string; before: string; match: string; after: string };

export const sectionId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Strip the inline markup (`code`, **bold**, *italic*, [text](href)) to plain text. */
export const plain = (s: string) =>
  s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*]/g, "").replace(/\s+/g, " ").trim();

/** Sections whose title or text contain the query, with a snippet around the first match. */
export function search(docs: SearchDoc[], query: string): Hit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: Hit[] = [];
  for (const d of docs) {
    for (const s of d.sections) {
      const inTitle = s.title.toLowerCase().includes(q) || d.name.toLowerCase().includes(q);
      const at = s.text.toLowerCase().indexOf(q);
      if (at < 0 && !inTitle) continue;
      const start = at < 0 ? 0 : Math.max(0, at - 60);
      const end = at < 0 ? 140 : at + q.length + 80;
      hits.push({
        policy: d.id,
        name: d.name,
        section: s.id,
        title: s.title,
        before: (start > 0 ? "…" : "") + s.text.slice(start, at < 0 ? end : at),
        match: at < 0 ? "" : s.text.slice(at, at + q.length),
        after: at < 0 ? (end < s.text.length ? "…" : "") : s.text.slice(at + q.length, end) + (end < s.text.length ? "…" : ""),
      });
    }
  }
  return hits;
}
