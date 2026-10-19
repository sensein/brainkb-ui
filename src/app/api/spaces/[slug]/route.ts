import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// One space's manifest: graphs, and members when the caller may see them.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    return forwardToQueryService(spacePath(params.slug));
}

// Delete the space and everything in it. SuperAdmin only and irreversible; the
// query service enforces both and requires `confirm` to equal the slug.
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
    const confirm = req.nextUrl.searchParams.get('confirm') ?? '';
    return forwardToQueryService(spacePath(params.slug, `?confirm=${encodeURIComponent(confirm)}`), {
        method: 'DELETE',
    });
}
