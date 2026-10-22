// SPARQL for /taxonomy. {{tax}} is the graph holding the cell-type taxonomy,
// gene records and epigenome nodes; {{ner}} the graph with the StructSense
// paper extractions. "Newest" taxa are the ones no other taxon is a
// bican:revision_of, so the page shows whatever release is latest in the graph.

const PREFIXES = `PREFIX bican: <https://identifiers.org/brain-bican/vocab/>
PREFIX epi: <https://identifiers.org/brain-bican/vocab/draft/>
PREFIX biolink: <https://w3id.org/biolink/vocab/>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX ner: <https://brainkb.org/ner/>
PREFIX prov: <http://www.w3.org/ns/prov#>`;

// Named taxa (they carry an accession; cluster-level taxa do not) of the newest
// release, with their level, species (from the taxonomy title), display color
// and how many clusters sit under them.
export const TAXA_QUERY = `${PREFIXES}
SELECT ?taxon ?label ?accession ?level ?title ?version ?parent ?order ?cl ?color ?prev ?literature ?clusters
WHERE {
  GRAPH <{{tax}}> {
    ?taxon a bican:CellTypeTaxon ;
           bican:accession_id ?accession ;
           rdfs:label ?label .
    FILTER NOT EXISTS { ?newer bican:revision_of ?taxon }
    OPTIONAL {
      ?taxon bican:part_of_set ?set .
      OPTIONAL { ?set rdfs:label ?level }
      OPTIONAL { ?set bican:part_of_taxonomy/bican:title ?title }
    }
    OPTIONAL { ?taxon biolink:version ?version }
    OPTIONAL { ?taxon bican:has_parent ?parent }
    OPTIONAL { ?taxon bican:order ?order }
    OPTIONAL { ?taxon bican:cell_type_ontology_term ?cl }
    OPTIONAL { ?c bican:is_color_for_taxon ?taxon ; bican:color_hex_triplet ?color }
    OPTIONAL { ?taxon bican:revision_of ?prev }
    OPTIONAL { ?taxon bican:literature_support ?literature }
    OPTIONAL {
      SELECT ?taxon (COUNT(DISTINCT ?k) AS ?clusters)
      WHERE { ?k a bican:Cluster ; bican:has_parent ?taxon }
      GROUP BY ?taxon
    }
  }
}`;

// Every step of every newest taxon's revision chain: ?from revision_of ?prev,
// with what the earlier revision said about itself.
export const REVISIONS_QUERY = `${PREFIXES}
SELECT ?taxon ?from ?prev ?label ?accession ?version ?parentLabel ?cl
WHERE {
  GRAPH <{{tax}}> {
    ?taxon bican:accession_id ?a .
    FILTER NOT EXISTS { ?newer bican:revision_of ?taxon }
    ?taxon bican:revision_of* ?from .
    ?from bican:revision_of ?prev .
    OPTIONAL { ?prev rdfs:label ?label }
    OPTIONAL { ?prev bican:accession_id ?accession }
    OPTIONAL { ?prev biolink:version ?version }
    OPTIONAL { ?prev bican:has_parent/rdfs:label ?parentLabel }
    OPTIONAL { ?prev bican:cell_type_ontology_term ?cl }
  }
}`;

// Curated marker genes of each newest taxon and of each of its earlier revisions
// (?holder), so the two can be compared.
export const MARKERS_QUERY = `${PREFIXES}
SELECT DISTINCT ?taxon ?holder ?gene ?symbol ?identifier
WHERE {
  GRAPH <{{tax}}> {
    ?taxon bican:accession_id ?a .
    FILTER NOT EXISTS { ?newer bican:revision_of ?taxon }
    ?taxon bican:revision_of* ?holder .
    ?holder bican:curated_markers ?gene .
    OPTIONAL { ?gene biolink:symbol ?symbol }
    OPTIONAL { ?gene schema:identifier ?identifier }
  }
}`;

// Papers whose extracted entities point at a newest taxon or any earlier
// revision of it (?hit) by a skos relation. Kept apart from MARKER_PAPERS_QUERY
// (and in one graph) because Oxigraph times out on the combined/cross-graph form.
export const PAPERS_QUERY = `${PREFIXES}
SELECT ?taxon ?hit ?how ?entity (SAMPLE(?el) AS ?entityLabel)
       ?paper (SAMPLE(?t) AS ?title) (SAMPLE(?d) AS ?doi) (COUNT(DISTINCT ?m) AS ?mentions)
WHERE {
  GRAPH <{{ner}}> {
    VALUES ?how { skos:exactMatch skos:closeMatch skos:broadMatch skos:narrowMatch skos:relatedMatch }
    ?entity ?how ?hit ;
            prov:hadPrimarySource ?paper .
    ?taxon bican:revision_of* ?hit ;
           bican:accession_id ?a .
    FILTER NOT EXISTS { ?newer bican:revision_of ?taxon }
    ?entity rdfs:label ?el ;
            ner:hasMention ?m .
    OPTIONAL { ?paper ner:title ?t }
    OPTIONAL { ?paper ner:doi ?d }
  }
}
GROUP BY ?taxon ?hit ?how ?entity ?paper`;

// Papers with an extracted gene that is a curated marker of a newest taxon or
// of one of its earlier revisions (?how = "marker").
export const MARKER_PAPERS_QUERY = `${PREFIXES}
SELECT ?taxon ?hit ?how ?entity (SAMPLE(?el) AS ?entityLabel) (SAMPLE(?g) AS ?gene)
       ?paper (SAMPLE(?t) AS ?title) (SAMPLE(?d) AS ?doi) (COUNT(DISTINCT ?m) AS ?mentions)
WHERE {
  GRAPH <{{ner}}> {
    ?taxon bican:accession_id ?a .
    FILTER NOT EXISTS { ?newer bican:revision_of ?taxon }
    ?taxon bican:revision_of* ?hit .
    ?hit bican:curated_markers ?g .
    ?entity skos:exactMatch ?g ;
            prov:hadPrimarySource ?paper ;
            rdfs:label ?el ;
            ner:hasMention ?m .
    OPTIONAL { ?paper ner:title ?t }
    OPTIONAL { ?paper ner:doi ?d }
  }
  BIND("marker" AS ?how)
}
GROUP BY ?taxon ?hit ?how ?entity ?paper`;

// One row per (epigenome summary, measurement), with its track and
// marker-enhancer counts. Summaries without epi:about are for species that have
// no taxonomy here (mouse); they are matched to taxa by accession.
export const EPI_SUMMARY_QUERY = `${PREFIXES}
SELECT ?summary ?taxon ?accession ?species ?measurement ?tracks ?enhancers
WHERE {
  GRAPH <{{tax}}> {
    ?summary a epi:EpigenomicSummary ;
             bican:accession_id ?accession .
    OPTIONAL { ?summary epi:about ?taxon }
    OPTIONAL { ?summary biolink:in_taxon ?species }
    OPTIONAL { ?summary epi:available_measurement ?measurement }
    {
      SELECT ?summary (COUNT(DISTINCT ?tr) AS ?tracks) (COUNT(DISTINCT ?en) AS ?enhancers)
      WHERE {
        ?summary a epi:EpigenomicSummary .
        OPTIONAL { ?summary epi:has_track ?tr }
        OPTIONAL { ?summary epi:has_marker_enhancer ?en }
      }
      GROUP BY ?summary
    }
  }
}`;

// Tracks of the given summaries. {{summaries}} is a space-separated list of <IRI>s.
export const EPI_TRACKS_QUERY = `${PREFIXES}
SELECT ?summary ?track ?label ?measurement ?assay ?lab ?url ?match ?level ?assembly ?format
WHERE {
  GRAPH <{{tax}}> {
    VALUES ?summary { {{summaries}} }
    ?summary epi:has_track ?track .
    ?track rdfs:label ?label .
    OPTIONAL { ?track epi:measurement ?measurement }
    OPTIONAL { ?track epi:assay ?assay }
    OPTIONAL { ?track epi:produced_by ?lab }
    OPTIONAL { ?track schema:url ?url }
    OPTIONAL { ?track epi:cell_type_match ?match }
    OPTIONAL { ?track epi:cell_type_level ?level }
    OPTIONAL { ?track epi:genome_assembly ?assembly }
    OPTIONAL { ?track epi:file_format ?format }
  }
}`;

// Marker-gene enhancers (activity-by-contact links) of the given summaries,
// with the other cell types the enhancer is also active in.
export const EPI_ENHANCERS_QUERY = `${PREFIXES}
SELECT ?summary ?enhancer ?gene ?symbol ?region ?regionType ?abc ?specific
       (COUNT(DISTINCT ?other) AS ?shared) (GROUP_CONCAT(DISTINCT ?ol; separator="; ") AS ?sharedLabels)
WHERE {
  GRAPH <{{tax}}> {
    VALUES ?summary { {{summaries}} }
    ?summary epi:has_marker_enhancer ?enhancer .
    ?enhancer epi:target_gene_symbol ?symbol ;
              epi:region ?region .
    OPTIONAL { ?enhancer epi:target_gene ?gene }
    OPTIONAL { ?enhancer epi:region_type ?regionType }
    OPTIONAL { ?enhancer epi:abc_score ?abc }
    OPTIONAL { ?enhancer epi:specific ?specific }
    OPTIONAL { ?enhancer epi:shared_with ?other }
    OPTIONAL { ?enhancer epi:shared_with_label ?otherLabel }
    BIND(COALESCE(?otherLabel, "") AS ?ol)
  }
}
GROUP BY ?summary ?enhancer ?gene ?symbol ?region ?regionType ?abc ?specific`;
