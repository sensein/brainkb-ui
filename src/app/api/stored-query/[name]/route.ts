import { NextRequest, NextResponse } from 'next/server';
import { forwardToQueryService } from '@/src/utils/api/query-service';

// Runs one of the query service's stored queries (GET /query/stored/{name}) as
// the caller: signed-out visitors can read public spaces, members their private
// ones. The query service checks access and validates the parameters; this only
// forwards them.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
    if (!/^[a-z_]+\.[a-z_]+$/.test(params.name)) {
        return NextResponse.json({ error: 'Unknown stored query.' }, { status: 404 });
    }
    return forwardToQueryService(`/query/stored/${encodeURIComponent(params.name)}?${req.nextUrl.searchParams.toString()}`);
}
