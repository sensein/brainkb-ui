import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createHash } from 'crypto';
import { authOptions } from '@/lib/auth';
import { getAuthTokenForService } from '@/src/utils/api/auth';
import { env } from '@/src/config/env';
import { queryServiceFetch, spacePath } from '@/src/utils/api/query-service';

// Put a SynthScholar review's RDF into the graph database, in a space the user
// chooses. Every step runs as the signed-in user, so permissions stay where they
// are enforced: ml_service lets only the review's owner (or an admin) read and
// record it; the query service decides whether this user may add a graph to the
// space and ingest into it. Nothing here grants rights of its own.
//
//   1. ml_service: the review (owner check) and its Turtle — the stored review.ttl
//      of an imported run, else the RDF export.
//   2. query service: register the review's graph in the space — the IRI comes from
//      ml_service (https://brainkb.org/synthscholar/reviews/<the review's own id>/).
//   3. query service: ingest the Turtle into that graph (a background job).
//   4. ml_service: record the ingest on the review (shown in its provenance).
//
// A review goes into the graph once: its graph is append-only, so a second push
// would duplicate nothing useful and is refused.
export const dynamic = 'force-dynamic';

const ML_BASE = (process.env.ML_SERVICE_INTERNAL_BASE || process.env.NEXT_PUBLIC_ML_SERVICE_API_BASE || 'http://localhost:8007')
    .replace(/\/+$/, '') + '/api/synth-scholar';


const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

async function detail(res: Response): Promise<string> {
    const body = await res.json().catch(() => ({}));
    const d = body?.detail ?? body?.error;
    return typeof d === 'string' ? d : d ? JSON.stringify(d) : `HTTP ${res.status}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions as any) as any;
    if (!session?.backendToken) return fail(401, 'Sign in to add a review to the knowledge graph.');
    const userId: string | null = session.user?.id || session.user?.orcid_id || session.user?.email || null;
    if (!userId) return fail(401, 'Your session has no user id — sign in again.');

    const { space_slug } = await req.json().catch(() => ({}));
    if (!space_slug || typeof space_slug !== 'string') return fail(400, 'Choose a space.');

    const mlToken = await getAuthTokenForService('ml');
    if (!mlToken) return fail(401, 'Could not authenticate with the review service — sign in again.');
    const ml = (path: string, init: RequestInit = {}) => fetch(`${ML_BASE}${path}`, {
        ...init, cache: 'no-store',
        headers: { Authorization: `Bearer ${mlToken}`, ...(init.headers || {}) },
    });
    const id = encodeURIComponent(params.id);

    // 1. The review — ml_service answers 404 to anyone but its owner (or an admin).
    const status = await ml(`/reviews/${id}/status`);
    if (!status.ok) return fail(status.status, await detail(status));
    const summary = await status.json();
    if (summary.status !== 'completed') return fail(409, 'Only a completed review can go into the knowledge graph.');
    if (summary.in_graph) return fail(409, 'This review is already in the knowledge graph.');

    let ttl: Buffer | null = null;
    let sourceFile = 'review.ttl';
    const artifacts = await ml(`/reviews/${id}/artifacts`);
    if (artifacts.ok) {
        const list: { path: string }[] = await artifacts.json();
        if (list.some((a) => a.path === 'review.ttl')) {
            const r = await ml(`/reviews/${id}/artifacts/review.ttl?download=true`);
            if (r.ok) ttl = Buffer.from(await r.arrayBuffer());
        }
    }
    if (!ttl) {
        const r = await ml(`/reviews/${id}/export?format=ttl`);
        if (!r.ok) return fail(r.status, `Could not get the review's RDF: ${await detail(r)}`);
        ttl = Buffer.from(await r.arrayBuffer());
        sourceFile = 'export.ttl';
    }
    if (!ttl.length) return fail(422, 'The review has no RDF to ingest.');
    const sha256 = createHash('sha256').update(ttl).digest('hex');
    const graphIri: string = summary.graph_iri;
    if (!graphIri) return fail(502, 'The review service did not name the review\'s graph.');

    // The same local run imported twice is two reviews with one graph. Registering
    // it again in the same space succeeds quietly, so check first: a registered
    // graph means this review's RDF is (or is being) in the graph already.
    const registry = await queryServiceFetch('/query/registered-named-graphs');
    if (registry.ok) {
        const text = JSON.stringify(await registry.json().catch(() => ({})));
        const bare = graphIri.replace(/\/+$/, '');
        if (text.includes(`"${bare}/"`) || text.includes(`"${bare}"`)) {
            return fail(409, `This review's graph (${graphIri}) is already registered — it has been ingested before, possibly from another import of the same run.`);
        }
    }

    // 2. Register the review's graph in the space (owner/editor of the space; the
    //    query service refuses reserved graphs and graphs held by another space).
    const reg = await queryServiceFetch(spacePath(space_slug, '/graphs'), {
        method: 'POST',
        body: JSON.stringify({
            named_graph_url: graphIri,
            description: `SynthScholar review: ${String(summary.title || params.id).slice(0, 200)}`,
        }),
    });
    if (!reg.ok) return fail(reg.status, `Could not add the review's graph to the space: ${await detail(reg)}`);

    // 3. Ingest — the query service checks the ingest role and the space's write rules again.
    const queryToken = await getAuthTokenForService('query');
    if (!queryToken) return fail(401, 'Could not authenticate with the query service — sign in again.');
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(ttl)], { type: 'text/turtle' }), `${params.id}.ttl`);
    const qs = new URLSearchParams({ user_id: String(userId), named_graph_iri: graphIri });
    const ins = await fetch(`${env.queryServiceBase}/api/insert/files/knowledge-graph-triples?${qs}`, {
        method: 'POST', body: form, cache: 'no-store',
        headers: { Authorization: `Bearer ${queryToken}` },
    });
    if (!ins.ok) return fail(ins.status, `Ingest was refused: ${await detail(ins)}`);
    const job = await ins.json().catch(() => ({}));

    // 4. Record it on the review, for its provenance.
    const rec = await ml(`/reviews/${id}/graph-ingests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ space_slug, graph_iri: graphIri, job_id: job.job_id ?? null, source_file: sourceFile, sha256 }),
    });
    if (!rec.ok) {
        // The data is in; only the note on the review failed. Say so rather than hide it.
        return NextResponse.json({
            space_slug, graph_iri: graphIri, job_id: job.job_id ?? null,
            warning: `Ingested, but the review could not record it: ${await detail(rec)}`,
        }, { status: 202 });
    }
    return NextResponse.json({ space_slug, graph_iri: graphIri, job_id: job.job_id ?? null, ...(await rec.json()) }, { status: 202 });
}
