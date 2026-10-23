// Turns the /taxonomy query rows into a taxon tree per species, each newest
// taxon's revision chain and markers, the papers pointing at it, and its
// epigenome summaries.

export type Binding = Record<string, { value?: string } | undefined>;

const val = (r: Binding, k: string) => r[k]?.value;

export const LEVEL_ORDER = ["Neighborhood", "Class", "Subclass", "Group"];
const LEVELS: Record<string, string> = { NEIGH: "Neighborhood", CLASS: "Class", SUBCL: "Subclass", GROUP: "Group" };
// The set label when there is one, else the level coded in the accession
// (CS20250428_SUBCL_0019 -> Subclass).
const levelOf = (set: string | undefined, accession: string) =>
  set && LEVEL_ORDER.includes(set) ? set : LEVELS[accession.split("_")[1] ?? ""] ?? "Taxon";

export type Taxon = {
  id: string; label: string; accession: string; level: string; species: string;
  parent?: string; order: number; version?: string; cl?: string; color?: string;
  prev?: string; clusters: number; children: string[];
};
export type Taxonomy = { taxa: Map<string, Taxon>; roots: Map<string, string[]>; species: string[] };

export function buildTaxonomy(rows: Binding[]): Taxonomy {
  const taxa = new Map<string, Taxon>();
  for (const r of rows) {
    const id = val(r, "taxon");
    if (!id || taxa.has(id)) continue;
    const accession = val(r, "accession") ?? "";
    // "Human_HMBA_basalganglia_consensus_AIT" -> "Human"
    const species = val(r, "title")?.split("_")[0] || "All";
    taxa.set(id, {
      id, label: val(r, "label") || accession, accession, level: levelOf(val(r, "level"), accession), species,
      parent: val(r, "parent"), order: Number(val(r, "order") ?? 0), version: val(r, "version"), cl: val(r, "cl"),
      color: val(r, "color"), prev: val(r, "prev"),
      clusters: Number(val(r, "clusters") ?? 0), children: [],
    });
  }
  const roots = new Map<string, string[]>();
  for (const t of taxa.values()) {
    const p = t.parent ? taxa.get(t.parent) : undefined;
    if (p) p.children.push(t.id);
    else roots.set(t.species, [...(roots.get(t.species) ?? []), t.id]);
  }
  const byOrder = (a: string, b: string) => taxa.get(a)!.order - taxa.get(b)!.order;
  for (const t of taxa.values()) t.children.sort(byOrder);
  for (const ids of roots.values()) ids.sort(byOrder);
  const species = [...roots.keys()].sort((a, b) => (roots.get(b)!.length - roots.get(a)!.length) || a.localeCompare(b));
  return { taxa, roots, species };
}

// Root first: Neighborhood > Class > ... > the taxon itself.
export function lineage(taxonomy: Taxonomy, id: string): Taxon[] {
  const chain: Taxon[] = [];
  for (let t = taxonomy.taxa.get(id); t && !chain.includes(t); t = t.parent ? taxonomy.taxa.get(t.parent) : undefined) chain.unshift(t);
  return chain;
}

export function descendants(taxonomy: Taxonomy, id: string): string[] {
  const out: string[] = [];
  const walk = (x: string) => { for (const c of taxonomy.taxa.get(x)?.children ?? []) { out.push(c); walk(c); } };
  walk(id);
  return out;
}

// An earlier revision of a newest taxon, newest first in Revisions.
export type Revision = { id: string; label?: string; accession?: string; version?: string; parentLabel?: string; cl?: string };

export function buildRevisions(rows: Binding[]): Map<string, Revision[]> {
  const next = new Map<string, Map<string, string>>(); // head -> from -> prev
  const info = new Map<string, Revision>();
  for (const r of rows) {
    const head = val(r, "taxon"), from = val(r, "from"), prev = val(r, "prev");
    if (!head || !from || !prev) continue;
    if (!next.has(head)) next.set(head, new Map());
    next.get(head)!.set(from, prev);
    if (!info.has(prev)) {
      info.set(prev, { id: prev, label: val(r, "label"), accession: val(r, "accession"), version: val(r, "version"),
                       parentLabel: val(r, "parentLabel"), cl: val(r, "cl") });
    }
  }
  const out = new Map<string, Revision[]>();
  for (const [head, steps] of next) {
    const chain: Revision[] = [];
    for (let x = steps.get(head); x && !chain.some((c) => c.id === x); x = steps.get(x)) chain.push(info.get(x)!);
    out.set(head, chain);
  }
  return out;
}

export type Marker = { gene: string; symbol: string; identifier?: string };

// holder (a newest taxon or one of its revisions) -> its curated markers.
export function buildMarkers(rows: Binding[]): Map<string, Marker[]> {
  const out = new Map<string, Marker[]>();
  for (const r of rows) {
    const holder = val(r, "holder"), gene = val(r, "gene");
    if (!holder || !gene) continue;
    const list = out.get(holder) ?? [];
    if (!list.some((m) => m.gene === gene)) list.push({ gene, symbol: val(r, "symbol") || gene.slice(-8), identifier: val(r, "identifier") });
    out.set(holder, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.symbol.localeCompare(b.symbol));
  return out;
}

// how: exact/narrow/broad/close/related for a skos mapping, "marker" for a curated marker gene.
export type PaperHit = {
  taxon: string; hit: string; how: string; entity: string; entityLabel: string; gene?: string;
  paper: string; title: string; doi?: string; mentions: number;
};

export function buildPapers(rows: Binding[]): Map<string, PaperHit[]> {
  const out = new Map<string, PaperHit[]>();
  for (const r of rows) {
    const taxon = val(r, "taxon"), entity = val(r, "entity"), paper = val(r, "paper");
    if (!taxon || !entity || !paper) continue;
    const how = val(r, "how") ?? "";
    const hit: PaperHit = {
      taxon, hit: val(r, "hit") ?? taxon, how: how === "marker" ? "marker" : how.split("#").pop()!.replace("Match", ""),
      entity, entityLabel: val(r, "entityLabel") ?? entity, gene: val(r, "gene"),
      paper, title: val(r, "title") || paper, doi: val(r, "doi"), mentions: Number(val(r, "mentions") ?? 0),
    };
    out.set(taxon, [...(out.get(taxon) ?? []), hit]);
  }
  return out;
}

export const SPECIES_OF_NCBI: Record<string, string> = {
  "9606": "human", "9544": "macaque", "9483": "marmoset", "10090": "mouse",
};

export type EpiSummary = {
  id: string; taxon?: string; accession: string; species: string;
  measurements: string[]; tracks: number; enhancers: number;
};
export type Epigenome = { summaries: Map<string, EpiSummary>; byTaxon: Map<string, string[]>; byAccession: Map<string, string[]> };

export function buildEpigenome(rows: Binding[]): Epigenome {
  const summaries = new Map<string, EpiSummary>();
  for (const r of rows) {
    const id = val(r, "summary");
    if (!id) continue;
    let s = summaries.get(id);
    if (!s) {
      const ncbi = val(r, "species")?.split("_").pop() ?? "";
      s = { id, taxon: val(r, "taxon"), accession: val(r, "accession") ?? "", species: SPECIES_OF_NCBI[ncbi] ?? ncbi,
            measurements: [], tracks: Number(val(r, "tracks") ?? 0), enhancers: Number(val(r, "enhancers") ?? 0) };
      summaries.set(id, s);
    }
    const m = val(r, "measurement");
    if (m && !s.measurements.includes(m)) s.measurements.push(m);
  }
  const byTaxon = new Map<string, string[]>(), byAccession = new Map<string, string[]>();
  for (const s of summaries.values()) {
    s.measurements.sort();
    if (s.taxon) byTaxon.set(s.taxon, [...(byTaxon.get(s.taxon) ?? []), s.id]);
    else byAccession.set(s.accession, [...(byAccession.get(s.accession) ?? []), s.id]);
  }
  return { summaries, byTaxon, byAccession };
}

export type Track = {
  summary: string; id: string; label: string; measurement: string; assay?: string; lab?: string;
  url?: string; match?: string; level?: string; assembly?: string; format?: string;
};
export const toTrack = (r: Binding): Track => ({
  summary: val(r, "summary") ?? "", id: val(r, "track") ?? "", label: val(r, "label") ?? "",
  measurement: val(r, "measurement") ?? "other", assay: val(r, "assay"), lab: val(r, "lab"), url: val(r, "url"),
  match: val(r, "match"), level: val(r, "level"), assembly: val(r, "assembly"), format: val(r, "format"),
});

export type Enhancer = {
  summary: string; id: string; gene?: string; symbol: string; region: string; regionType?: string;
  abc?: number; specific: boolean; shared: number; sharedLabels: string[];
};
export const toEnhancer = (r: Binding): Enhancer => ({
  summary: val(r, "summary") ?? "", id: val(r, "enhancer") ?? "", gene: val(r, "gene"), symbol: val(r, "symbol") ?? "",
  region: val(r, "region") ?? "", regionType: val(r, "regionType"),
  abc: val(r, "abc") !== undefined ? Number(val(r, "abc")) : undefined,
  specific: val(r, "specific") === "true", shared: Number(val(r, "shared") ?? 0),
  sharedLabels: (val(r, "sharedLabels") ?? "").split("; ").filter(Boolean),
});
