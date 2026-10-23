"""Generate BrainKB query_service/core/stored_queries.py from the /taxonomy and
/literature queries.ts files, so the stored queries the pages call match them.

usage: python scripts/gen_stored_queries.py <brainkb-ui dir> <BrainKB>/query_service/core/stored_queries.py
"""
import re, sys
ui, out = sys.argv[1:3]
NAMES = {  # UI export -> stored name, and the parameters it takes besides graph
 ("taxonomy", "TAXA_QUERY"): ("taxonomy.taxa", {}),
 ("taxonomy", "REVISIONS_QUERY"): ("taxonomy.revisions", {}),
 ("taxonomy", "MARKERS_QUERY"): ("taxonomy.markers", {}),
 ("taxonomy", "PAPERS_QUERY"): ("taxonomy.papers", {}),
 ("taxonomy", "MARKER_PAPERS_QUERY"): ("taxonomy.marker_papers", {}),
 ("taxonomy", "EPI_SUMMARY_QUERY"): ("taxonomy.epigenome_summaries", {}),
 ("taxonomy", "EPI_TRACKS_QUERY"): ("taxonomy.epigenome_tracks", {"summaries": "iri_list"}),
 ("taxonomy", "EPI_ENHANCERS_QUERY"): ("taxonomy.epigenome_enhancers", {"summaries": "iri_list"}),
 ("taxonomy", "CLUSTERS_QUERY"): ("taxonomy.clusters", {"taxon": "iri"}),
 ("taxonomy", "CELLS_QUERY"): ("taxonomy.cells", {"taxon": "iri"}),
 ("taxonomy", "CELL_REGIONS_QUERY"): ("taxonomy.cell_regions", {"taxon": "iri"}),
 ("taxonomy", "CELL_DONORS_QUERY"): ("taxonomy.cell_donors", {"taxon": "iri"}),
 ("literature", "PAPERS_QUERY"): ("literature.papers", {}),
 ("literature", "ENTITIES_QUERY"): ("literature.entities", {}),
 ("literature", "TARGETS_QUERY"): ("literature.targets", {}),
 ("literature", "DETAIL_QUERY"): ("literature.mentions", {"entity": "iri"}),
}
entries = []
for page in ["taxonomy", "literature"]:
    ts = open(f"{ui}/src/app/{page}/queries.ts").read()
    pre = re.search(r"const PREFIXES = `(.*?)`", ts, re.S).group(1)
    lim = dict(re.findall(r"(\w+): (\d+)", re.search(r"export const LIMITS = \{(.*?)\}", ts, re.S).group(1)))
    for m in re.finditer(r"((?://[^\n]*\n)*)export const (\w+) = `\$\{PREFIXES\}(.*?)`;", ts, re.S):
        doc, name, body = m.group(1), m.group(2), m.group(3)
        if (page, name) not in NAMES:
            continue
        stored, params = NAMES[(page, name)]
        body = re.sub(r"\$\{LIMITS\.(\w+)\}", lambda x: lim[x.group(1)], body)
        body = body.replace("{{tax}}", "{{graph}}").replace("{{ner}}", "{{graph}}")
        q = (pre + body).strip("\n")
        assert "`" not in q and '"""' not in q
        found = set(re.findall(r"\{\{(\w+)\}\}", q)) - {"graph"}
        assert found == set(params), (stored, found, params)
        cap = re.findall(r"\bLIMIT (\d+)\s*$", q)
        assert cap, stored
        comment = "".join("# " + l[2:].lstrip() + "\n" if l.startswith("//") else "" for l in doc.splitlines())
        entries.append((stored, params, int(cap[0]), q, comment))
missing = {v[0] for v in NAMES.values()} - {e[0] for e in entries}
assert not missing, missing
with open(out, "w") as f:
    f.write('''# -*- coding: utf-8 -*-
"""
Stored (named) SPARQL queries that anyone allowed to read a space may run
against that space's graph, without the admin-only arbitrary-SPARQL endpoint.

Each entry is a fixed query from the BrainKB UI (/taxonomy, /literature).
Callers choose the query by name and supply only:
  graph     -- a named graph that belongs to a space (checked for read access)
  and the parameters the query declares, each validated before substitution:
    "iri"      a single IRI, written <{{name}}> in the query
    "iri_list" up to MAX_IRI_LIST IRIs, substituted as "<a> <b> ..." (for VALUES)
Every query ends in a LIMIT; `limit` is that cap, so callers can tell when a
result was cut off.

Generated from brainkb-ui src/app/{taxonomy,literature}/queries.ts; keep the two
in step when a page's query changes.
"""

MAX_IRI_LIST = 50

STORED_QUERIES = {
''')
    for stored, params, cap, q, comment in entries:
        f.write(f'''{"".join("    " + l + chr(10) for l in comment.splitlines())}    "{stored}": {{
        "params": {params!r},
        "limit": {cap},
        "query": """{q}""",
    }},
''')
    f.write("}\n")
print(len(entries), "stored queries")
