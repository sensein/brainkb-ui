import { NextRequest, NextResponse } from 'next/server';
import { queryServiceFetch } from '@/src/utils/api/query-service';

// Literature reviews matching a search: published SynthScholar reviews run on
// BrainKB (ml_service's public listing) and reviews ingested from SynthScholar runs
// (query service, as the caller — public spaces for anyone, private ones for their
// members). Matched on title and research question. Either source failing leaves
// the other's results.
export const dynamic = 'force-dynamic';

const ML_BASE = (process.env.ML_SERVICE_INTERNAL_BASE || process.env.NEXT_PUBLIC_ML_SERVICE_API_BASE || 'http://localhost:8007')
    .replace(/\/+$/, '') + '/api/synth-scholar';
const MAX = 10;

type Review = { id: string; title: string; question?: string; articles: number; source: 'BrainKB' | 'Ingested'; space?: string; href: string };

export async function GET(req: NextRequest) {
    const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
    if (!q) return NextResponse.json({ query: '', reviews: [] });
    const ql = q.toLowerCase();

    const [run, ingested] = await Promise.allSettled([
        fetch(`${ML_BASE}/public/reviews`, { cache: 'no-store', headers: { Accept: 'application/json' } })
            .then((r) => (r.ok ? r.json() : [])),
        queryServiceFetch(`/synthscholar/reviews?q=${encodeURIComponent(q)}`).then((r) => (r.ok ? r.json() : { reviews: [] })),
    ]);

    const out: Review[] = [];
    if (run.status === 'fulfilled' && Array.isArray(run.value)) {
        for (const r of run.value) {
            if (!(r?.is_public && r?.status === 'completed')) continue;
            if (!`${r.title ?? ''} ${r.review_id ?? ''}`.toLowerCase().includes(ql)) continue;
            out.push({ id: r.review_id, title: r.title, articles: r.included_count ?? 0, source: 'BrainKB',
                       href: `/knowledge-base/synth-scholar/${encodeURIComponent(r.review_id)}` });
        }
    }
    if (ingested.status === 'fulfilled') {
        for (const r of ingested.value?.reviews ?? []) {
            out.push({ id: r.review_id, title: r.title, question: r.research_question || undefined, articles: r.included_count ?? 0,
                       source: 'Ingested', space: r.space_slug,
                       href: `/knowledge-base/synth-scholar/ingested/${encodeURIComponent(r.review_id)}` });
        }
    }
    return NextResponse.json({ query: q, reviews: out.slice(0, MAX), more: out.length > MAX });
}
