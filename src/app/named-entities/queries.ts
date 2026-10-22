// SPARQL for /named-entities. {{graph}} is the NER graph; {{entity}} an entity IRI.

const PREFIXES = `PREFIX ner:  <https://brainkb.org/ner/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>`;

// One row per (paper, entity): the entity's specific ner: class, how often this
// paper mentions it, and the concept it resolved to. Papers are reached through
// mention -> document version -> publication, so counts are per paper even for
// entities several papers share. SAMPLE() collapses entities carrying two
// labels (e.g. PENK / Penk) into one row.
export const NETWORK_QUERY = `${PREFIXES}
SELECT ?paper (SAMPLE(?t) AS ?title) (SAMPLE(?d) AS ?doi)
       ?entity (SAMPLE(?l) AS ?label) (SAMPLE(?ty) AS ?type)
       (COUNT(DISTINCT ?m) AS ?mentions) (SAMPLE(?cid) AS ?concept)
WHERE {
  GRAPH <{{graph}}> {
    ?paper a ner:Publication ;
           ner:hasDocumentVersion ?v .
    OPTIONAL { ?paper ner:title ?t }
    OPTIONAL { ?paper ner:doi ?d }
    ?m ner:partOfDocumentVersion ?v ;
       ner:refersToEntity ?entity .
    ?entity rdfs:label ?l ;
            a ?ty .
    FILTER(?ty != ner:NamedEntity && STRSTARTS(STR(?ty), STR(ner:)))
    OPTIONAL { ?entity ner:resolvedToConcept/ner:conceptIdentifier ?cid }
  }
}
GROUP BY ?paper ?entity`;

// A few mentions of one entity, with the sentence each sits in.
export const DETAIL_QUERY = `${PREFIXES}
SELECT DISTINCT ?surface ?sentence ?title
WHERE {
  GRAPH <{{graph}}> {
    <{{entity}}> ner:hasMention ?m .
    ?m ner:surfaceForm ?surface ;
       ner:inSentence/ner:sentenceText ?sentence ;
       ner:partOfDocumentVersion ?v .
    ?paper ner:hasDocumentVersion ?v .
    OPTIONAL { ?paper ner:title ?title }
  }
}
LIMIT 5`;

// Bibliographic details of one paper as key/value rows, plus how many
// relation and causal statements were extracted from it. {{paper}} is its IRI.
// Author order lives only in an rdfs:comment ("authors, in order: ..."), since
// dcterms:creator is an unordered set.
export const PAPER_QUERY = `${PREFIXES}
SELECT ?key ?value
WHERE {
  GRAPH <{{graph}}> {
    { <{{paper}}> dcterms:bibliographicCitation ?value BIND("journal" AS ?key) }
    UNION { <{{paper}}> dcterms:issued ?value BIND("year" AS ?key) }
    UNION { <{{paper}}> ner:publicationDate ?value BIND("date" AS ?key) }
    UNION { <{{paper}}> ner:doi ?value BIND("doi" AS ?key) }
    UNION { <{{paper}}> ner:pmid ?value BIND("pmid" AS ?key) }
    UNION { <{{paper}}> ner:pmcid ?value BIND("pmcid" AS ?key) }
    UNION { <{{paper}}> rdfs:comment ?value BIND("comment" AS ?key) }
    UNION { <{{paper}}> dcterms:creator/rdfs:label ?value BIND("author" AS ?key) }
    UNION { SELECT ("relations" AS ?key) (COUNT(DISTINCT ?ra) AS ?value)
            WHERE { ?ra a ner:RelationAssertion ; prov:hadPrimarySource <{{paper}}> } }
    UNION { SELECT ("causal" AS ?key) (COUNT(DISTINCT ?cr) AS ?value)
            WHERE { ?cr a ner:CausalRelation ; prov:hadPrimarySource <{{paper}}> } }
  }
}`;

// Taxonomy nodes (bican:CellTypeTaxon) that extracted entities connect to, plus
// all their ancestors. One row per (entity, leaf taxon, ancestor-or-self).
// Two kinds of connection: a cell type mapped to a taxon (?rel is the skos
// relation, so exact matches can be told from looser ones), or a gene whose
// GeneAnnotation is one of a taxon's bican:curated_markers (?rel = "marker").
export const TAXONOMY_QUERY = `${PREFIXES}
PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?entity ?rel ?leaf ?taxon ?label ?accession ?parent ?cl
WHERE {
  GRAPH <{{graph}}> {
    {
      VALUES ?rel { skos:exactMatch skos:closeMatch skos:broadMatch skos:narrowMatch skos:relatedMatch }
      ?entity a ner:NamedEntity ;
              ?rel ?leaf .
      ?leaf a bican:CellTypeTaxon .
    } UNION {
      ?entity a ner:NamedEntity ;
              skos:exactMatch ?gene .
      ?leaf bican:curated_markers ?gene .
      BIND("marker" AS ?rel)
    }
    ?leaf bican:has_parent* ?taxon .
    ?taxon rdfs:label ?label ;
           bican:accession_id ?accession .
    OPTIONAL { ?taxon bican:has_parent ?parent }
    OPTIONAL { ?taxon bican:cell_type_ontology_term ?cl }
  }
}`;

// Gene records (bican:GeneAnnotation) that extracted genes map to, with the
// taxa that list them as curated markers. One row per (entity, gene, marker taxon).
export const GENE_QUERY = `${PREFIXES}
PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT DISTINCT ?entity ?gene ?symbol ?identifier ?species ?description ?moltype ?annotation ?taxon
WHERE {
  GRAPH <{{graph}}> {
    ?entity a ner:NamedEntity ;
            skos:exactMatch ?gene .
    ?gene a bican:GeneAnnotation .
    OPTIONAL { ?gene biolink:symbol ?symbol }
    OPTIONAL { ?gene <http://schema.org/identifier> ?identifier }
    OPTIONAL { ?gene biolink:in_taxon_label ?species }
    OPTIONAL { ?gene dcterms:description ?description }
    OPTIONAL { ?gene bican:molecular_type ?moltype }
    OPTIONAL { ?gene bican:referenced_in ?annotation }
    OPTIONAL { ?taxon bican:curated_markers ?gene }
  }
}`;
