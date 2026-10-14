import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// Add someone to a space, or change their role (viewer, editor, owner).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    const { member, role } = await req.json();
    return forwardToQueryService(spacePath(params.slug, '/members'), {
        method: 'POST',
        body: JSON.stringify({ member, role }),
    });
}
