import { NextRequest, NextResponse } from 'next/server';
import { forwardToQueryService, queryServiceFetch } from '@/src/utils/api/query-service';

// SynthScholar review ingest, through the UI server like every other query-service
// call: the query service's address is internal, and the request carries the
// signed-in user's token, so the space's write/read rules decide.
export const dynamic = 'force-dynamic';
// A review's output folder is large (100+ MB); give the upload time.
export const maxDuration = 600;

export async function GET(req: NextRequest) {
    const space = req.nextUrl.searchParams.get('space');
    return forwardToQueryService(`/synthscholar/reviews${space ? `?space=${encodeURIComponent(space)}` : ''}`);
}

// The multipart body is streamed through unchanged (not parsed and re-built), so
// the files keep their paths and the upload isn't held in memory here.
export async function POST(req: NextRequest) {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.startsWith('multipart/form-data')) {
        return NextResponse.json({ error: 'Expected the output folder as multipart/form-data.' }, { status: 400 });
    }
    try {
        const res = await queryServiceFetch('/synthscholar/reviews', {
            method: 'POST',
            headers: { 'Content-Type': contentType },
            body: req.body,
            // Node's fetch needs this to send a streamed request body.
            duplex: 'half',
        } as RequestInit);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            const message = body?.detail || body?.error || `Request failed (${res.status})`;
            return NextResponse.json({ error: typeof message === 'string' ? message : JSON.stringify(message) }, { status: res.status });
        }
        return NextResponse.json(body, { status: res.status });
    } catch (error) {
        console.error('[synthscholar] ingest:', error);
        return NextResponse.json({ error: 'The query service is unreachable.' }, { status: 502 });
    }
}
