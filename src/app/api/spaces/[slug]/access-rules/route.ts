import { NextRequest } from 'next/server';
import { forwardToQueryService, spacePath } from '@/src/utils/api/query-service';

// A space's fine-grained access rules: who may read / write / manage it, by
// global role, by person, or by space role. Members may list them; only the
// space's managers (owner, admins, assigned managers) may change them.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
    return forwardToQueryService(spacePath(params.slug, '/access-rules'));
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    const { action, subject_type, subject_value } = await req.json();
    return forwardToQueryService(spacePath(params.slug, '/access-rules'), {
        method: 'POST',
        body: JSON.stringify({ action, subject_type, subject_value }),
    });
}
