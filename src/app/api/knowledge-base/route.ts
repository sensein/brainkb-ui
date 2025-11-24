import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getWarmedCache } from '@/src/utils/cache/cache-warm';
import { getData } from '@/src/app/components/utils/getData';
import { env } from '../../../config/env';

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

// Execute SPARQL query server-side (to avoid CORS issues)
async function executeQuery(sparqlQuery: string) {
    const queryParameter = { sparql_query: sparqlQuery };
    const endpoint = env.get('NEXT_PUBLIC_API_QUERY_ENDPOINT') || "query/sparql";

    console.info(`[KB API] Executing query (length: ${sparqlQuery.length})`);
    const response = await getData(queryParameter, endpoint);

    console.info(`[KB API] Query response status:`, response?.status);

    // Handle different possible response structures
    let bindings: any[] = [];
    let vars: string[] = [];

    if (response?.status === 'success' && response?.message?.results?.bindings) {
        bindings = response.message.results.bindings;
        vars = response.message.head?.vars || [];
    } else if (response?.results?.bindings) {
        bindings = response.results.bindings;
        vars = response.head?.vars || [];
    } else if (Array.isArray(response)) {
        bindings = response;
        vars = bindings.length > 0 ? Object.keys(bindings[0] || {}) : [];
    }

    console.info(`[KB API] Extracted ${bindings.length} bindings, ${vars.length} vars`);

    return {
        data: Array.isArray(bindings) ? bindings : [],
        headers: Array.isArray(vars) ? vars : []
    };
}

// Simplified: Only handle caching, data fetching moved to page component
async function fetchKnowledgeBaseData(slug: string, sparqlQuery?: string) {
    // Check for pre-warmed cache from build time first
    const warmedCache = getWarmedCache<{
        data: any[];
        headers: string[];
        pageTitle: string;
        pageSubtitle: string;
        entityPageSlug: string;
        timestamp?: number;
    }>(`kb-${slug}`);

    if (warmedCache) {
        const warmedData = warmedCache.data !== undefined ? warmedCache : warmedCache;
        const itemCount = warmedData.data?.length || (Array.isArray(warmedData) ? warmedData.length : 0);
        console.info(`[KB API] Using pre-warmed cache for slug: ${slug} (${itemCount} items)`);

        // Validate warmed data structure
        if (warmedData && typeof warmedData === 'object' && 'data' in warmedData) {
            if (Array.isArray(warmedData.data) && warmedData.data.length > 0) {
                return {
                    data: warmedData.data,
                    headers: Array.isArray(warmedData.headers) ? warmedData.headers : [],
                    pageTitle: warmedData.pageTitle || "",
                    pageSubtitle: warmedData.pageSubtitle || "",
                    entityPageSlug: warmedData.entityPageSlug || ""
                };
            }
        } else if (Array.isArray(warmedData)) {
            return {
                data: warmedData,
                headers: [],
                pageTitle: "",
                pageSubtitle: "",
                entityPageSlug: ""
            };
        }

        console.info(`[KB API] Warm cache for ${slug} is empty or invalid`);
    }

    // If query provided, execute it server-side (avoids CORS)
    if (sparqlQuery) {
        try {
            const result = await executeQuery(sparqlQuery);
            return {
                data: result.data,
                headers: result.headers,
                pageTitle: "",
                pageSubtitle: "",
                entityPageSlug: ""
            };
        } catch (error) {
            console.error(`[KB API] Error executing query:`, error);
            return {
                data: [],
                headers: [],
                pageTitle: "",
                pageSubtitle: "",
                entityPageSlug: ""
            };
        }
    }

    // No valid cache and no query - return empty
    return {
        data: [],
        headers: [],
        pageTitle: "",
        pageSubtitle: "",
        entityPageSlug: ""
    };
}

// Create a cached version for each slug
function getCachedKnowledgeBase(slug: string, sparqlQuery?: string) {
    return unstable_cache(
        async () => {
            const result = await fetchKnowledgeBaseData(slug, sparqlQuery);
            return result;
        },
        [`brainkb-kb-${slug}-${sparqlQuery ? Buffer.from(sparqlQuery).toString('base64').substring(0, 20) : 'default'}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`knowledge-base-${slug}`]
        }
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug = 'default', sparqlQuery } = body;

        if (!sparqlQuery) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'sparqlQuery is required'
                },
                { status: 400 }
            );
        }

        const cachedFetch = getCachedKnowledgeBase(slug, sparqlQuery);
        const result = await cachedFetch();

        const response = {
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            headers: Array.isArray(result.headers) ? result.headers : [],
            pageTitle: result.pageTitle || "",
            pageSubtitle: result.pageSubtitle || "",
            entityPageSlug: result.entityPageSlug || ""
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[KB API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch knowledge base data'
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const slug = searchParams.get('slug') || 'default';

        const cachedFetch = getCachedKnowledgeBase(slug);
        const result = await cachedFetch();

        // Return cached data if available, otherwise empty
        const response = {
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            headers: Array.isArray(result.headers) ? result.headers : [],
            pageTitle: result.pageTitle || "",
            pageSubtitle: result.pageSubtitle || "",
            entityPageSlug: result.entityPageSlug || ""
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('[KB API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to fetch knowledge base data'
            },
            { status: 500 }
        );
    }
}