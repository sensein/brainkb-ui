// Runs a browse page's SPARQL over a space's own data, for callers who may
// read the space but can't use the query service's SPARQL endpoint (it is
// admin-only). The space's triples come from GET /spaces/{slug}/data — public
// to anyone, private to members — and are queried in an in-memory store.

import { queryServiceFetch, findSpaceForGraph, spacePath } from './query-service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsonld = require('jsonld');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const oxigraph = require('oxigraph');

export class SpaceReadError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

// Parsed public-space data, reused briefly so a page's several queries (one per
// class, plus detail views) don't each re-download the space. Private spaces
// are never cached, since what a member reads must not reach another caller.
const CACHE_MS = 60_000;
const publicCache = new Map<string, { at: number; nquads: string }>();

async function spaceNquads(slug: string, isPublic: boolean): Promise<string> {
    const hit = publicCache.get(slug);
    if (isPublic && hit && Date.now() - hit.at < CACHE_MS) return hit.nquads;

    const res = await queryServiceFetch(spacePath(slug, '/data'));
    if (res.status === 401 || res.status === 403) {
        throw new SpaceReadError('This space is private. Sign in as a member to see it.', 403);
    }
    if (!res.ok) throw new SpaceReadError(`Could not read space "${slug}" (${res.status}).`, 502);
    const nquads: string = await jsonld.toRDF(await res.json(), { format: 'application/n-quads' });
    if (isPublic) publicCache.set(slug, { at: Date.now(), nquads });
    return nquads;
}

// Graphs too large for this path. Reading a space here means the query service
// serializing the whole space to JSON-LD and this server parsing it into memory,
// several GB each for bican-basal-ganglia (~1.8M triples): signed-out visits
// to /taxonomy got Oxigraph, gunicorn and next-server OOM-killed on the shared
// host. Comma-separated override: SPACE_FALLBACK_BLOCKED_GRAPHS.
const BLOCKED_GRAPHS = (process.env.SPACE_FALLBACK_BLOCKED_GRAPHS ?? 'https://brainkb.org/graph/bican-basal-ganglia/')
    .split(',').map((g) => g.trim().replace(/\/+$/, '')).filter(Boolean);

/** Same shape as the query service's SPARQL proxy: rows and column names. */
export async function runSparqlOverSpaces(sparql: string): Promise<{ data: any[]; headers: string[] }> {
    const graphs = Array.from(new Set(Array.from(sparql.matchAll(/GRAPH\s*<([^>]+)>/gi), (m) => m[1])));
    if (!graphs.length) throw new SpaceReadError('This query does not name a graph, so no space can answer it.', 400);
    const blocked = graphs.find((g) => BLOCKED_GRAPHS.includes(g.replace(/\/+$/, '')));
    if (blocked) {
        throw new SpaceReadError(`${blocked} is too large to read without signing in. Sign in with an admin account to view it.`, 403);
    }

    const store = new oxigraph.Store();
    for (const graph of graphs) {
        const space = await findSpaceForGraph(graph);
        if (!space) {
            throw new SpaceReadError(`No space you can read holds ${graph}. It may be private or not shared yet.`, 403);
        }
        const nquads = await spaceNquads(space.slug, space.visibility === 'public');
        // The space data is a single default graph; put it under the name the
        // query asks for so GRAPH <…> patterns match.
        store.load(nquads, { format: 'application/n-quads', to_graph_name: oxigraph.namedNode(graph) });
    }

    const out = JSON.parse(store.query(sparql, { results_format: 'application/sparql-results+json' }) as string);
    return { data: out?.results?.bindings ?? [], headers: out?.head?.vars ?? [] };
}
