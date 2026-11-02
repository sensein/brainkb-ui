import { forwardToQueryService } from '@/src/utils/api/query-service';

// One ingested review, as the caller (public spaces: anyone).
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    // A review is unique per space; ?space= says which copy (omitted: the one readable copy).
    const space = new URL(req.url).searchParams.get('space');
    return forwardToQueryService(`/synthscholar/reviews/${encodeURIComponent(params.id)}${space ? `?space=${encodeURIComponent(space)}` : ''}`);
}
