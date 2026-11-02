import { NextRequest } from 'next/server';
import { forwardToQueryService } from '@/src/utils/api/query-service';

// Spaces the caller can see (public ones plus their own), and creating one.
export const dynamic = 'force-dynamic';

export async function GET() {
    return forwardToQueryService('/spaces');
}

export async function POST(req: NextRequest) {
    return forwardToQueryService('/spaces', { method: 'POST', body: JSON.stringify(await req.json()) });
}
