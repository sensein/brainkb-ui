import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { slug: string; member: string } }) {
    return forwardToQueryService(spacePath(params.slug, `/members/${encodeURIComponent(params.member)}`), {
        method: 'DELETE',
    });
}
