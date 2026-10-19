import { forwardToQueryService } from '@/src/utils/api/query-service';

// Remove one reservation (Admin/SuperAdmin). System reservations cannot be removed.
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const id = Number.parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
        return Response.json({ error: 'Invalid reservation id.' }, { status: 400 });
    }
    return forwardToQueryService(`/admin/reserved-graphs/${id}`, { method: 'DELETE' });
}
