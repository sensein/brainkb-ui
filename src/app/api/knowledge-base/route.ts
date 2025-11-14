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
    const warmedData = getWarmedCache<{
        data: any[];
        headers: string[];
        pageTitle: string;
        pageSubtitle: string;
        entityPageSlug: string;
    }>(`kb-${slug}`);
    
    if (warmedData) {
        console.log(`Using pre-warmed KB cache for slug: ${slug}`);
        return warmedData;
    }
    
    // If no warmed cache, fetch fresh data
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

            return {
                data: bindings,
                headers: vars,
                pageTitle: page.page || "",
                pageSubtitle: page.description || "",
                entityPageSlug: page.entitypageslug || ""
            };
        } else {
            throw new Error("Invalid data format");
        }
    } catch (error) {
        console.error(`Error fetching knowledge base data for slug "${slug}":`, error);
        throw error;
    }
}

// Create a cached version for each slug
function getCachedKnowledgeBase(slug: string) {
    return unstable_cache(
        async () => fetchKnowledgeBaseData(slug),
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

        return NextResponse.json({ 
            success: true, 
            ...result 
        });
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

