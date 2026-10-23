// Turns the /literature query rows into papers, their entities grouped by kind,
// and the records each entity maps to (with a link to where that record lives).

export type Binding = Record<string, { value?: string } | undefined>;

const val = (r: Binding, k: string) => r[k]?.value;

export const GROUPS = [
  { key: "cells", label: "Cell types", types: ["CellType", "CellSubtype", "CellLine"] },
  { key: "genes", label: "Genes", types: ["Gene", "Protein", "Peptide", "GenomicRegion", "GeneticVariant"] },
  { key: "regions", label: "Brain regions", types: ["BrainRegion", "AnatomicalEntity"] },
  { key: "species", label: "Species", types: ["Species", "Organism"] },
  { key: "other", label: "Other", types: [] as string[] },
] as const;
export type GroupKey = (typeof GROUPS)[number]["key"];

const groupOf = (type: string): GroupKey =>
  GROUPS.find((g) => (g.types as readonly string[]).includes(type))?.key ?? "other";

// "CellSubtype" -> "Cell subtype"
export const typeLabel = (type: string) =>
  type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ ([A-Z])/g, (_, c: string) => ` ${c.toLowerCase()}`);

export type Paper = { id: string; title: string; doi?: string; year?: string; journal?: string };

export function buildPapers(rows: Binding[]): Paper[] {
  return rows
    .filter((r) => val(r, "paper"))
    .map((r) => ({ id: val(r, "paper")!, title: val(r, "title") || val(r, "paper")!, doi: val(r, "doi"), year: val(r, "year"), journal: val(r, "journal") }))
    .sort((a, b) => (b.year ?? "").localeCompare(a.year ?? "") || a.title.localeCompare(b.title));
}

// how: exact / close / broad / narrow / related
export type Link = { how: string; target: string };
export type Entity = {
  id: string; paper: string; label: string; type: string; group: GroupKey; mentions: number; links: Link[];
};

export function buildEntities(rows: Binding[]): Entity[] {
  const out = new Map<string, Entity>();
  for (const r of rows) {
    const id = val(r, "entity"), paper = val(r, "paper");
    if (!id || !paper) continue;
    const key = `${paper} ${id}`;
    let e = out.get(key);
    if (!e) {
      const type = (val(r, "type") ?? "").split("/").pop() ?? "";
      e = { id, paper, label: val(r, "label") ?? id, type, group: groupOf(type), mentions: Number(val(r, "mentions") ?? 0), links: [] };
      out.set(key, e);
    }
    const how = val(r, "how"), target = val(r, "target");
    if (how && target && !e.links.some((l) => l.target === target)) {
      e.links.push({ how: how.split("#").pop()!.replace("Match", ""), target });
    }
  }
  return [...out.values()];
}

export type TargetKind = "taxon" | "gene" | "region" | "species" | "term" | "provisional" | "missing";
export type Target = {
  id: string; kind: TargetKind; label: string; detail?: string; href?: string; previousLabel?: string;
};

const SPECIES: Record<string, string> = {
  "9606": "Homo sapiens", "9544": "Macaca mulatta", "9483": "Callithrix jacchus", "10090": "Mus musculus",
  "10116": "Rattus norvegicus", "9598": "Pan troglodytes", "9541": "Macaca fascicularis", "9685": "Felis catus",
  "9615": "Canis familiaris", "9823": "Sus scrofa", "7955": "Danio rerio",
};

const OBO = "http://purl.obolibrary.org/obo/";

export function buildTargets(rows: Binding[]): Map<string, Target> {
  const out = new Map<string, Target>();
  for (const r of rows) {
    const id = val(r, "target");
    if (!id) continue;
    const kind = (val(r, "kind") ?? "").split("/").pop();
    const label = val(r, "label"), symbol = val(r, "symbol"), identifier = val(r, "identifier");
    let t: Target;
    if (kind === "CellTypeTaxon") {
      const newest = val(r, "newest") ?? id, newestLabel = val(r, "newestLabel") ?? label ?? id;
      t = { id, kind: "taxon", label: newestLabel, detail: val(r, "accession"), href: `/taxonomy?taxon=${encodeURIComponent(newest)}`,
            previousLabel: label && label !== newestLabel ? label : undefined };
    } else if (kind === "GeneAnnotation") {
      const href = !identifier ? undefined
        : identifier.startsWith("ENS") ? `https://www.ensembl.org/id/${identifier}`
        : /^\d+$/.test(identifier) ? `https://www.ncbi.nlm.nih.gov/gene/${identifier}` : undefined;
      t = { id, kind: "gene", label: symbol ?? label ?? id, detail: [identifier, val(r, "species")].filter(Boolean).join(" · "), href };
    } else if (kind === "ParcellationTerm") {
      t = { id, kind: "region", label: label ?? id, detail: id.split("/").pop(), href: id };
    } else if (id.startsWith(`${OBO}NCBITaxon_`)) {
      const n = id.slice(`${OBO}NCBITaxon_`.length);
      t = { id, kind: "species", label: SPECIES[n] ?? `NCBITaxon:${n}`, detail: `NCBITaxon:${n}`, href: id };
    } else if (id.startsWith(OBO)) {
      const curie = id.slice(OBO.length).replace("_", ":");
      t = { id, kind: "term", label: label ?? curie, detail: label ? curie : undefined, href: id };
    } else if (id.startsWith("https://brainkb.org/concept/")) {
      t = { id, kind: "provisional", label: "provisional concept" };
    } else {
      t = { id, kind: kind ? "term" : "missing", label: label ?? "record not in the graph" };
    }
    out.set(id, t);
  }
  return out;
}

// An entity counts as mapped when it links to something real.
export const isMapped = (e: Entity, targets: Map<string, Target>) =>
  e.links.some((l) => { const k = targets.get(l.target)?.kind; return !!k && k !== "provisional" && k !== "missing"; });
