import { NextRequest, NextResponse } from 'next/server';
import { env } from '../../../config/env';

// Full-text search over public spaces, proxied to the query service's
// GET /api/search (the same endpoint the MCP's brainkb_search uses). Sent
// without credentials, so only public-space data comes back.
export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

type RawHit = { subject: string; named_graph_iri?: string; space?: string; visibility?: string; snippet?: string };
type Node = Record<string, unknown> & { '@id'?: string; '@type'?: string | string[] };

const TITLE_KEYS = [
  'dcterms:title',
  'http://purl.org/dc/terms/title',
  'https://brainkb.org/resource/resourceName',
  'schema:name',
  'skos:prefLabel',
  'rdfs:label',
  'http://www.w3.org/2000/01/rdf-schema#label',
];

const text = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return text(v[0]);
  if (v && typeof v === 'object' && '@value' in v) return String((v as { '@value': unknown })['@value']);
  return undefined;
};

// Last path or fragment segment of a type IRI, e.g. ".../resource/Schema" → "Schema".
const shortType = (iri: string) => iri.split(/[#/]/).filter(Boolean).pop() ?? iri;

// The response's `data` is a JSON-LD string describing each hit's subject;
// pull a readable title and type for each one.
function describe(data: unknown): Map<string, { title?: string; types: string[] }> {
  const out = new Map<string, { title?: string; types: string[] }>();
  let doc: unknown = data;
  if (typeof data === 'string') {
    try {
      doc = JSON.parse(data);
    } catch {
      return out;
    }
  }
  const graph = (doc as { '@graph'?: Node[] } | null)?.['@graph'];
  if (!Array.isArray(graph)) return out;
  for (const node of graph) {
    const id = node['@id'];
    if (!id) continue;
    const raw = node['@type'];
    const types = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(shortType);
    const title = TITLE_KEYS.map((k) => text(node[k])).find(Boolean);
    out.set(id, { title, types });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ query: '', hits: [] });

  const limit = Math.min(Math.max(Number(sp.get('limit')) || 25, 1), MAX_LIMIT);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);
  const params = new URLSearchParams({ q, limit: String(limit), offset: String(offset) });
  const space = sp.get('space');
  if (space) params.set('space', space);

  try {
    const res = await fetch(`${env.queryServiceBase}/api/search?${params}`, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: `Search service returned ${res.status}` }, { status: 502 });
    }
    const body = await res.json();
    const meta = describe(body?.data);
    const hits = ((body?.hits ?? []) as RawHit[]).map((h) => ({
      subject: h.subject,
      graph: h.named_graph_iri ?? null,
      space: h.space ?? null,
      visibility: h.visibility ?? null,
      snippet: h.snippet ?? '',
      title: meta.get(h.subject)?.title ?? null,
      types: meta.get(h.subject)?.types ?? [],
    }));
    return NextResponse.json({ query: q, space: space ?? null, limit, offset, hits });
  } catch (error) {
    console.error('[search] query service unreachable:', error);
    return NextResponse.json({ error: 'Search service is unreachable' }, { status: 502 });
  }
}
