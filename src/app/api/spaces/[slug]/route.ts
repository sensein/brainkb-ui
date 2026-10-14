import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// One space's manifest: graphs, and members when the caller may see them.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    return forwardToQueryService(spacePath(params.slug));
}
