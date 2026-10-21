import { NextResponse } from 'next/server';
import { queryServiceFetch } from '@/src/utils/api/query-service';

// A file kept with an ingested review, as the caller. Streamed back with the query
// service's own headers (type, disposition, and the sandboxing CSP).
export const dynamic = 'force-dynamic';

const PASS = ['content-type', 'content-disposition', 'content-security-policy', 'x-content-type-options', 'etag'];

export async function GET(req: Request, { params }: { params: { id: string; path: string[] } }) {
    const path = params.path.map(encodeURIComponent).join('/');
    const incoming = new URL(req.url).searchParams;
    const qs = new URLSearchParams();
    if (incoming.get('download') === 'true') qs.set('download', 'true');
    if (incoming.get('space')) qs.set('space', incoming.get('space') as string);   // which space's copy
    try {
        const res = await queryServiceFetch(`/synthscholar/reviews/${encodeURIComponent(params.id)}/files/${path}${qs.size ? `?${qs}` : ''}`);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return NextResponse.json({ error: body?.detail || body?.error || `Request failed (${res.status})` }, { status: res.status });
        }
        const headers = new Headers();
        for (const h of PASS) {
            const v = res.headers.get(h);
            if (v) headers.set(h, v);
        }
        return new Response(res.body, { status: 200, headers });
    } catch (error) {
        console.error('[synthscholar] file:', error);
        return NextResponse.json({ error: 'The query service is unreachable.' }, { status: 502 });
    }
}
