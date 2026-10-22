// Turns the NETWORK_QUERY rows into papers, entities and paper–entity links,
// and holds the entity-type grouping the colors follow.

export type Binding = Record<string, { value?: string } | undefined>;

export type Paper = { id: string; title: string; doi?: string };
export type Entity = {
  id: string;
  label: string;
  type: string;
  group: GroupKey;
  concept?: string;
  total: number;
  // paper id -> mentions in that paper
  byPaper: Map<string, number>;
};
export type Network = { papers: Paper[]; entities: Entity[] };

// A network puts every color next to every other, and only three categorical
// slots stay distinguishable in that case (dataviz palette, all-pairs check),
// so three groups get a hue and the rest share a neutral gray. The tooltip,
// detail panel and table name the exact type.
export const GROUPS = [
  { key: "cells", label: "Cells", color: "#2a78d6",
    types: ["CellType", "CellSubtype", "CellLine"] },
  { key: "molecular", label: "Genes & molecules", color: "#eb6834",
    types: ["Gene", "Protein", "Peptide", "GenomicRegion", "GeneticVariant", "Genotype",
            "PostTranslationalModification", "IonChannel", "ChemicalEntity", "Neurotransmitter"] },
  { key: "anatomy", label: "Anatomy", color: "#1baf7a",
    types: ["BrainRegion", "AnatomicalEntity", "CellularStructure", "Synapse"] },
  { key: "other", label: "Methods & other", color: "#b2ab9d", types: [] as string[] },
] as const;
export type GroupKey = (typeof GROUPS)[number]["key"];

export const groupOf = (type: string): GroupKey =>
  GROUPS.find((g) => (g.types as readonly string[]).includes(type))?.key ?? "other";
export const colorOf = (group: GroupKey) => GROUPS.find((g) => g.key === group)!.color;

const localName = (iri: string) => iri.split(/[/#]/).filter(Boolean).pop() || iri;
// "CellType" -> "Cell type"
export const typeLabel = (type: string) =>
  type.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())
    .replace(/ ([A-Z])(?=[a-z])/g, (_, c: string) => ` ${c.toLowerCase()}`);

// BRAINKB: concepts are placeholders minted when no ontology term matched.
export const isProvisional = (concept?: string) => !concept || concept.startsWith("BRAINKB:");

export function buildNetwork(rows: Binding[]): Network {
  const papers = new Map<string, Paper>();
  const entities = new Map<string, Entity>();
  for (const r of rows) {
    const paperId = r.paper?.value;
    const entityId = r.entity?.value;
    if (!paperId || !entityId) continue;
    if (!papers.has(paperId)) {
      papers.set(paperId, { id: paperId, title: r.title?.value || localName(paperId), doi: r.doi?.value });
    }
    const type = localName(r.type?.value ?? "NamedEntity");
    const mentions = Number(r.mentions?.value ?? 0) || 0;
    let e = entities.get(entityId);
    if (!e) {
      e = { id: entityId, label: r.label?.value || localName(entityId), type, group: groupOf(type),
            concept: r.concept?.value, total: 0, byPaper: new Map() };
      entities.set(entityId, e);
    }
    e.byPaper.set(paperId, (e.byPaper.get(paperId) ?? 0) + mentions);
    e.total += mentions;
  }
  return { papers: [...papers.values()], entities: [...entities.values()] };
}

// Cell-type taxonomy (bican:CellTypeTaxon) reached from extracted entities.
export type Taxon = { id: string; label: string; accession: string; level: string; parent?: string; cl?: string };
// relation: exact/narrow/broad/close/related for mappings, "marker" for curated markers.
export type TaxonLink = { entity: string; taxon: string; exact: boolean; relation: string };
export type Taxonomy = { taxa: Map<string, Taxon>; links: TaxonLink[] };

// Level from the accession, e.g. CS20250428_SUBCL_0019 -> "Subclass".
const LEVELS: Record<string, string> = { NEIGH: "Neighborhood", CLASS: "Class", SUBCL: "Subclass", GROUP: "Group", CLUST: "Cluster" };
export const LEVEL_ORDER = ["Neighborhood", "Class", "Subclass", "Group", "Cluster"];
const levelOf = (accession: string) => LEVELS[accession.split("_")[1] ?? ""] ?? "Taxon";

export function buildTaxonomy(rows: Binding[]): Taxonomy {
  const taxa = new Map<string, Taxon>();
  const links = new Map<string, TaxonLink>();
  for (const r of rows) {
    const id = r.taxon?.value;
    if (!id) continue;
    if (!taxa.has(id)) {
      const accession = r.accession?.value ?? "";
      taxa.set(id, { id, label: r.label?.value || accession, accession, level: levelOf(accession),
                     parent: r.parent?.value, cl: r.cl?.value });
    }
    const entity = r.entity?.value, leaf = r.leaf?.value, rel = r.rel?.value ?? "";
    if (entity && leaf && !links.has(`${entity} ${leaf}`)) {
      const relation = rel === "marker" ? "marker" : rel.split("#").pop()?.replace("Match", "") ?? "";
      links.set(`${entity} ${leaf}`, { entity, taxon: leaf, exact: relation === "exact", relation });
    }
  }
  return { taxa, links: [...links.values()] };
}

// The taxa reachable from the given entities: their mapped taxa plus ancestors.
export function taxaFor(taxonomy: Taxonomy, entityIds: Set<string>) {
  const links = taxonomy.links.filter((l) => entityIds.has(l.entity) && taxonomy.taxa.has(l.taxon));
  const keep = new Map<string, Taxon>();
  for (const l of links) {
    for (let t = taxonomy.taxa.get(l.taxon); t && !keep.has(t.id); t = t.parent ? taxonomy.taxa.get(t.parent) : undefined) {
      keep.set(t.id, t);
    }
  }
  return { taxa: [...keep.values()], links };
}

// Gene records (bican:GeneAnnotation) that extracted genes map to.
export type GeneRecord = {
  id: string; symbol: string; identifier?: string; species?: string; description?: string;
  moltype?: string; annotation?: string; markerOf: Set<string>;
};
export type GeneData = { genes: Map<string, GeneRecord>; links: { entity: string; gene: string }[] };

export function buildGenes(rows: Binding[]): GeneData {
  const genes = new Map<string, GeneRecord>();
  const links = new Map<string, { entity: string; gene: string }>();
  for (const r of rows) {
    const id = r.gene?.value, entity = r.entity?.value;
    if (!id || !entity) continue;
    let g = genes.get(id);
    if (!g) {
      g = { id, symbol: r.symbol?.value || localName(id), identifier: r.identifier?.value, species: r.species?.value,
            description: r.description?.value, moltype: r.moltype?.value, annotation: r.annotation?.value, markerOf: new Set() };
      genes.set(id, g);
    }
    if (r.taxon?.value) g.markerOf.add(r.taxon.value);
    links.set(`${entity} ${id}`, { entity, gene: id });
  }
  return { genes, links: [...links.values()] };
}

// Gene records linked from the given entities.
export function genesFor(data: GeneData, entityIds: Set<string>) {
  const links = data.links.filter((l) => entityIds.has(l.entity));
  const ids = new Set(links.map((l) => l.gene));
  return { genes: [...ids].map((id) => data.genes.get(id)!), links };
}
