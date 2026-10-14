// Server-side calls to the query service's REST endpoints (spaces, space data),
// sent with the signed-in user's token when there is one and anonymously
// otherwise. Anonymous callers still get public spaces; the backend decides
// what each caller may see or change.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { env } from '@/src/config/env';
import { getAuthTokenForService } from './auth';

// Skip the token exchange entirely for anonymous callers, so a public read
// doesn't log an auth failure.
async function callerToken(): Promise<string | null> {
    const session = await getServerSession(authOptions as any);
    if (!(session as any)?.backendToken) return null;
    return getAuthTokenForService('query');
}

export async function queryServiceFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await callerToken();
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return fetch(`${env.queryServiceBase}/api${path}`, { ...init, headers, cache: 'no-store' });
}

const seg = (s: string) => encodeURIComponent(s);
export const spacePath = (slug: string, rest = '') => `/spaces/${seg(slug)}${rest}`;

// Graph IRIs are compared without a trailing slash: the backend stores
// "https://brainkb.org/x/" while a config may say "https://brainkb.org/x".
const norm = (iri: string) => iri.replace(/\/+$/, '');

export type SpaceRef = { slug: string; visibility: string };

/**
 * The space that holds `graphIri`, among the spaces this caller can see.
 * Spaces are listed without their graphs, so each candidate's manifest is read.
 */
export async function findSpaceForGraph(graphIri: string): Promise<SpaceRef | null> {
    const res = await queryServiceFetch('/spaces');
    if (!res.ok) return null;
    const { spaces = [] } = (await res.json()) as { spaces?: SpaceRef[] };
    const want = norm(graphIri);
    // Fast path: by convention a space's graph is <base>/<slug>/.
    const guess = spaces.find((s) => want.endsWith(`/${s.slug}`));
    const ordered = guess ? [guess, ...spaces.filter((s) => s !== guess)] : spaces;
    for (const s of ordered) {
        const r = await queryServiceFetch(spacePath(s.slug));
        if (!r.ok) continue;
        const manifest = (await r.json()) as { graphs?: string[] };
        if ((manifest.graphs ?? []).some((g) => norm(g) === want)) return { slug: s.slug, visibility: s.visibility };
    }
    return null;
}

/**
 * Forward a request to the query service as the caller and hand back its
 * status and JSON body unchanged, so the backend stays the one place that
 * decides who may see or change a space.
 */
export async function forwardToQueryService(path: string, init: RequestInit = {}) {
    try {
        const res = await queryServiceFetch(path, init);
        const body = await res.json().catch(() => ({}));
        // FastAPI reports failures as {detail}, some routes as {error}.
        if (!res.ok) {
            const message = body?.detail || body?.error || `Request failed (${res.status})`;
            return NextResponse.json({ error: typeof message === 'string' ? message : JSON.stringify(message) }, { status: res.status });
        }
        return NextResponse.json(body, { status: res.status });
    } catch (error) {
        console.error(`[spaces] ${path}:`, error);
        return NextResponse.json({ error: 'The space service is unreachable.' }, { status: 502 });
    }
}
