// SPARQL for /literature. {{graph}} holds the StructSense paper extractions and
// the records their entities map to (taxa, gene annotations, parcellation terms);
// {{entity}} is an entity IRI. Everything stays in one graph: Oxigraph times out
// on queries that join across graphs.

const PREFIXES = `PREFIX ner: <https://brainkb.org/ner/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>`;

// Row caps, as on the browse pages (class-browser.yaml), set well above what
// the graph holds today (2026-10-23: 4 papers, 743 entity rows, 498 targets).
// The page warns when a query comes back exactly at its cap.
export const LIMITS = { PAPERS: 1000, ENTITIES: 20000, TARGETS: 20000 } as const;

export const PAPERS_QUERY = `${PREFIXES}
SELECT ?paper (SAMPLE(?t) AS ?title) (SAMPLE(?d) AS ?doi) (SAMPLE(?y) AS ?year) (SAMPLE(?j) AS ?journal)
WHERE {
  GRAPH <{{graph}}> {
    ?paper a ner:Publication .
    OPTIONAL { ?paper ner:title ?t }
    OPTIONAL { ?paper ner:doi ?d }
    OPTIONAL { ?paper dcterms:issued ?y }
    OPTIONAL { ?paper dcterms:bibliographicCitation ?j }
  }
}
GROUP BY ?paper
LIMIT ${LIMITS.PAPERS}`;

// One row per (entity, mapping): the entity's specific ner: class, its paper,
// how often that paper mentions it, and what it maps to by which skos relation.
// SAMPLE() collapses entities carrying two labels (PENK / Penk) into one row.
export const ENTITIES_QUERY = `${PREFIXES}
SELECT ?paper ?entity (SAMPLE(?l) AS ?label) (SAMPLE(?ty) AS ?type) (COUNT(DISTINCT ?m) AS ?mentions) ?how ?target
WHERE {
  GRAPH <{{graph}}> {
    ?entity a ner:NamedEntity ;
            prov:hadPrimarySource ?paper ;
            rdfs:label ?l ;
            a ?ty ;
            ner:hasMention ?m .
    FILTER(?ty != ner:NamedEntity && STRSTARTS(STR(?ty), STR(ner:)))
    OPTIONAL {
      VALUES ?how { skos:exactMatch skos:closeMatch skos:broadMatch skos:narrowMatch skos:relatedMatch }
      ?entity ?how ?target .
    }
  }
}
GROUP BY ?paper ?entity ?how ?target
LIMIT ${LIMITS.ENTITIES}`;

// What the mapped-to records say about themselves. A cell-type taxon from an
// earlier release also gets the newest taxon that revises it (?newest), which
// is what /taxonomy shows.
export const TARGETS_QUERY = `${PREFIXES}
SELECT ?target (SAMPLE(?k) AS ?kind) (SAMPLE(?lab) AS ?label) (SAMPLE(?sym) AS ?symbol) (SAMPLE(?id) AS ?identifier)
       (SAMPLE(?sp) AS ?species) (SAMPLE(?acc) AS ?accession) (SAMPLE(?nw) AS ?newest) (SAMPLE(?nwl) AS ?newestLabel)
WHERE {
  GRAPH <{{graph}}> {
    VALUES ?how { skos:exactMatch skos:closeMatch skos:broadMatch skos:narrowMatch skos:relatedMatch }
    ?entity a ner:NamedEntity ;
            ?how ?target .
    OPTIONAL { ?target a ?k }
    OPTIONAL { ?target rdfs:label ?lab }
    OPTIONAL { ?target biolink:symbol ?sym }
    OPTIONAL { ?target <http://schema.org/identifier> ?id }
    OPTIONAL { ?target biolink:in_taxon_label ?sp }
    OPTIONAL { ?target bican:accession_id ?acc }
    OPTIONAL {
      ?target a bican:CellTypeTaxon ;
              ^bican:revision_of* ?nw .
      FILTER NOT EXISTS { ?n bican:revision_of ?nw }
      ?nw rdfs:label ?nwl .
    }
  }
}
GROUP BY ?target
LIMIT ${LIMITS.TARGETS}`;

// A few mentions of one entity, with the sentence each sits in.
export const DETAIL_QUERY = `${PREFIXES}
SELECT DISTINCT ?surface ?sentence ?title
WHERE {
  GRAPH <{{graph}}> {
    <{{entity}}> ner:hasMention ?m .
    ?m ner:surfaceForm ?surface ;
       ner:inSentence/ner:sentenceText ?sentence .
    OPTIONAL { <{{entity}}> prov:hadPrimarySource/ner:title ?title }
  }
}
LIMIT 5`;
