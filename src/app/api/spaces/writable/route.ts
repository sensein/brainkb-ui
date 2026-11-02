import { forwardToQueryService } from '@/src/utils/api/query-service';

// Spaces (with their graphs) the signed-in user may ingest into — the same check
// ingestion uses: membership (including roles inherited from a parent space), a
// space write access rule, or Admin/SuperAdmin; plus graphs in no space.
export const dynamic = 'force-dynamic';

export async function GET() {
    return forwardToQueryService('/spaces/writable');
}
