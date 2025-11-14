import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getData } from '@/src/app/components/getData';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import yaml from '@/src/app/components/config-knowledgebases.yaml';

// Force dynamic rendering - this route uses searchParams
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

async function fetchKnowledgeBaseData(slug: string) {
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
        // Extract data from cache (cache file has {data, headers, ...} structure)
        const warmedData = warmedCache.data !== undefined ? warmedCache : warmedCache;
        
        // Only log in development to reduce noise
        if (process.env.NODE_ENV === 'development') {
            const itemCount = warmedData.data?.length || (Array.isArray(warmedData) ? warmedData.length : 0);
            console.log(`Using pre-warmed KB cache for slug: ${slug} (${itemCount} items)`);
        }
        
        // Validate warmed data structure
        if (warmedData && typeof warmedData === 'object' && 'data' in warmedData) {
            // Standard structure: {data, headers, pageTitle, ...}
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
            // If cache returned array directly (old format), wrap it
            return {
                data: warmedData,
                headers: [],
                pageTitle: "",
                pageSubtitle: "",
                entityPageSlug: ""
            };
        }
        
        // Warm cache has empty/invalid data, fetch fresh
        if (process.env.NODE_ENV === 'development') {
            console.log(`Warm cache for ${slug} is empty or invalid, fetching fresh data`);
        }
    }
    
    // If no warmed cache or warm cache is empty, fetch fresh data
    try {
        const page = yaml.pages.find((page) => page.slug === slug);
        if (!page) {
            throw new Error(`Page with slug "${slug}" not found`);
        }

        const query_to_execute = page.sparql_query;
        const queryParameter = { sparql_query: query_to_execute };
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";

        const response = await getData(queryParameter, endpoint);

        if (response.status === 'success' && response.message?.results?.bindings) {
            const bindings = response.message.results.bindings;
            const vars = response.message.head.vars;

            if (process.env.NODE_ENV === 'development') {
                console.log(`Fetched fresh KB data for ${slug}: ${bindings.length} items`);
            }

            // Always return data, even if empty (empty might be valid)
            return {
                data: Array.isArray(bindings) ? bindings : [],
                headers: Array.isArray(vars) ? vars : [],
                pageTitle: page.page || "",
                pageSubtitle: page.description || "",
                entityPageSlug: page.entitypageslug || ""
            };
        } else {
            // If API returns invalid format, return empty arrays instead of throwing
            // This allows the page to show "No data available" gracefully
            console.warn(`Invalid response format for ${slug}, returning empty data`);
            return {
                data: [],
                headers: [],
                pageTitle: page.page || "",
                pageSubtitle: page.description || "",
                entityPageSlug: page.entitypageslug || ""
            };
        }
    } catch (error) {
        console.error(`Error fetching knowledge base data for slug "${slug}":`, error);
        // Don't throw - return empty data structure so page can display gracefully
        // This ensures we never show an error when cache fails, just fetch fresh
        const page = yaml.pages.find((page) => page.slug === slug);
        return {
            data: [],
            headers: [],
            pageTitle: page?.page || "",
            pageSubtitle: page?.description || "",
            entityPageSlug: page?.entitypageslug || ""
        };
    }
}

// Create a cached version for each slug
// Note: fetchKnowledgeBaseData already checks warm cache first, then fetches fresh if needed
function getCachedKnowledgeBase(slug: string) {
    return unstable_cache(
        async () => {
            const result = await fetchKnowledgeBaseData(slug);
            // Always return result - even if empty, it might be valid
            // The page will handle empty data display
            return result;
        },
        [`brainkb-kb-${slug}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`knowledge-base-${slug}`]
        }
    );
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const slug = searchParams.get('slug') || 'default';

        const cachedFetch = getCachedKnowledgeBase(slug);
        const result = await cachedFetch();

        // Ensure data and headers are always arrays
        const response = {
            success: true,
            data: Array.isArray(result.data) ? result.data : [],
            headers: Array.isArray(result.headers) ? result.headers : [],
            pageTitle: result.pageTitle || "",
            pageSubtitle: result.pageSubtitle || "",
            entityPageSlug: result.entityPageSlug || ""
        };

        if (process.env.NODE_ENV === 'development') {
            console.log(`KB API response for ${slug}: ${response.data.length} items, ${response.headers.length} headers`);
        }

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in knowledge-base API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to fetch knowledge base data' 
            },
            { status: 500 }
        );
    }
}

