import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// One space's manifest: graphs, and members when the caller may see them.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    return forwardToQueryService(spacePath(params.slug));
}

// Rename the space or change its description (owner, admin or assigned manager).
// The slug, and so the space's IRI, never changes.
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
    const { name, description } = await req.json();
    return forwardToQueryService(spacePath(params.slug), {
        method: 'PATCH',
        body: JSON.stringify({ name, description }),
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
