export type SortKey = "recent" | "title" | "rating";

export type ProvenanceChange = {
  field: string;
  from?: string;
  to?: string;
  note?: string;
};
export type ProvenanceVersion = {
  id: string;
  label: string;
  date: string; // ISO
  authoredBy?: string;
  changes: ProvenanceChange[];
};
export type Provenance = {
  sourceUrl?: string;
  sourceLabel?: string;
  owner?: string;
  updated?: string; // ISO
  method?: string; // curated|synced|reviewed|auto-import
  currentVersionId?: string;
  versions?: ProvenanceVersion[];
};
export type CardItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  rating: number;
  date: string; // ISO
  href?: string;
  relatedIds?: string[];
  provenance?: Provenance;
  ontologyType?: string;
  ontologyId?: string;
  // Enhanced details
  molecularFunction?: string;
  biologicalProcess?: string;
  cellularComponent?: string;
  synonyms?: string[];
  crossReferences?: { database: string; id: string; url?: string }[];
  publications?: { title: string; authors: string; journal: string; year: number; pmid?: string }[];
  pathways?: { name: string; description: string; url?: string }[];
  expressionData?: { tissue: string; level: 'high' | 'medium' | 'low' | 'none' }[];
  clinicalSignificance?: { variant: string; significance: string; description: string }[];
};
export type NewFeedback = { itemId: string; message: string; contact?: string };