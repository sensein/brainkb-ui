import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string; member: string }> }) {
    const params = await ctx.params;
    return forwardToQueryService(spacePath(params.slug, `/members/${encodeURIComponent(params.member)}`), {
        method: 'DELETE',
    });
}
