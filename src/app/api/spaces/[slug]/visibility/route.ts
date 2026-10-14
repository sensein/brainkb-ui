import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// Private or public. Only the owner, an admin, or an assigned manager may change it.
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
    const { visibility } = await req.json();
    return forwardToQueryService(spacePath(params.slug, '/visibility'), {
        method: 'PATCH',
        body: JSON.stringify({ visibility }),
    });
}
