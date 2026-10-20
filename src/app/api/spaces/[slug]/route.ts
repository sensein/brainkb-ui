import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// One space's manifest: graphs, and members when the caller may see them.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    return forwardToQueryService(spacePath(params.slug));
}

// Rename the space, change its description, or give it a new slug (owner, admin or
// assigned manager). A new slug moves the graphs named after the old one; the old slug
// and IRIs stay as aliases (see the query service's SPACES_MODEL.md).
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
    const { name, description, slug } = await req.json();
    return forwardToQueryService(spacePath(params.slug), {
        method: 'PATCH',
        body: JSON.stringify({ name, description, slug }),
    });
}

// Delete the space and everything in it. SuperAdmin only and irreversible; the
// query service enforces both and requires `confirm` to equal the slug.
export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
    const confirm = req.nextUrl.searchParams.get('confirm') ?? '';
    return forwardToQueryService(spacePath(params.slug, `?confirm=${encodeURIComponent(confirm)}`), {
        method: 'DELETE',
    });
}
