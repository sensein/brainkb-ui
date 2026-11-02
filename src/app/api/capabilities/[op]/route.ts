import { NextRequest } from 'next/server';
import { forwardToQueryService } from '@/src/utils/api/query-service';

// Knowledge-graph capabilities (Admin/SuperAdmin; the query service enforces it):
//   GET  user?member=…   a user's roles, effective capabilities and grants
//   GET  role?role=…     capabilities granted to a role/group
//   GET  available       the catalogue, with what is delegatable
//   POST grant | revoke            {member, capability}
//   POST grant-role | revoke-role  {role, capability}
export const dynamic = 'force-dynamic';

const GETS: Record<string, (q: URLSearchParams) => string | null> = {
    user: (q) => (q.get('member') ? `/admin/capabilities?member=${encodeURIComponent(q.get('member')!)}` : null),
    role: (q) => (q.get('role') ? `/admin/capabilities/role?role=${encodeURIComponent(q.get('role')!)}` : null),
    available: () => '/admin/capabilities/available',
};
const POSTS: Record<string, (b: any) => object> = {
    grant: (b) => ({ member: b.member, capability: b.capability }),
    revoke: (b) => ({ member: b.member, capability: b.capability }),
    'grant-role': (b) => ({ role: b.role, capability: b.capability }),
    'revoke-role': (b) => ({ role: b.role, capability: b.capability }),
};

export async function GET(req: NextRequest, { params }: { params: { op: string } }) {
    const path = GETS[params.op]?.(req.nextUrl.searchParams);
    if (!path) return Response.json({ error: 'Unknown or incomplete request.' }, { status: 400 });
    return forwardToQueryService(path);
}

export async function POST(req: NextRequest, { params }: { params: { op: string } }) {
    const build = POSTS[params.op];
    if (!build) return Response.json({ error: 'Unknown request.' }, { status: 400 });
    return forwardToQueryService(`/admin/capabilities/${params.op}`, {
        method: 'POST',
        body: JSON.stringify(build(await req.json())),
    });
}
