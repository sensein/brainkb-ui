import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// Remove one access rule (space managers only).
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { slug: string; ruleId: string } }) {
    const id = Number.parseInt(params.ruleId, 10);
    if (!Number.isFinite(id) || id < 1) {
        return Response.json({ error: 'Invalid rule id.' }, { status: 400 });
    }
    return forwardToQueryService(spacePath(params.slug, `/access-rules/${id}`), { method: 'DELETE' });
}
