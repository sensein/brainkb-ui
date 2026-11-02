import { NextRequest } from 'next/server';
import { forwardToQueryService } from '@/src/utils/api/query-service';

// Reserved named graphs (Admin/SuperAdmin). The query service enforces the role.
export const dynamic = 'force-dynamic';

export async function GET() {
    return forwardToQueryService('/admin/reserved-graphs');
}

export async function POST(req: NextRequest) {
    const { iri, match_type, reason, space_slug } = await req.json();
    return forwardToQueryService('/admin/reserved-graphs', {
        method: 'POST',
        body: JSON.stringify({ iri, match_type, reason: reason || null, space_slug: space_slug || null }),
    });
}
