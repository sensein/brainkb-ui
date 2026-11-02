import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// Register a named graph and add it to this space (owner/editor). Reserved graphs
// and graphs already in another space are refused by the query service.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    const { named_graph_url, description } = await req.json();
    return forwardToQueryService(spacePath(params.slug, '/graphs'), {
        method: 'POST',
        body: JSON.stringify({ named_graph_url, description }),
    });
}
