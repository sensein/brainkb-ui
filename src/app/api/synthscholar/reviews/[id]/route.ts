import { forwardToQueryService } from '@/src/utils/api/query-service';

// One ingested review, as the caller (public spaces: anyone).
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    return forwardToQueryService(`/synthscholar/reviews/${encodeURIComponent(params.id)}`);
}
