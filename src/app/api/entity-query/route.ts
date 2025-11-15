import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createHash } from 'crypto';
import { getData } from '@/src/app/components/getData';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

// Helper to get query hash
function getQueryHash(sparqlQuery: string): string {
    return createHash('sha256').update(sparqlQuery).digest('hex').slice(0, 16);
}

async function fetchEntityQueryData(sparqlQuery: string) {
    // Fetch fresh data (entity-level warm caching removed)
    const queryHash = getQueryHash(sparqlQuery);
    
    try {
        const queryParameter = { sparql_query: sparqlQuery };
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
        
        const response = await getData(queryParameter, endpoint);
        
        if (response.status === "success" && response.message?.results?.bindings) {
            const bindings = response.message.results.bindings;
            const count = Array.isArray(bindings) ? bindings.length : 0;
            if (process.env.NODE_ENV === 'development') {
                console.log(`[entity-query] Fetched fresh data: ${count} items`);
                if (count === 0) {
                    console.warn(`[entity-query] ========== QUERY RETURNED EMPTY RESULTS ==========`);
                    console.warn(`[entity-query] Query hash: ${queryHash}`);
                    console.warn(`[entity-query] Full query:`, sparqlQuery);
                    console.warn(`[entity-query] ================================================`);
                }
            }
            return Array.isArray(bindings) ? bindings : [];
        }
        
        // If API returns invalid format, return empty array instead of throwing
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[entity-query] Invalid response format. Status: ${response.status}`);
            console.warn(`[entity-query] Response:`, JSON.stringify(response).substring(0, 500));
        }
        return [];
    } catch (error) {
        console.error('Error fetching entity query data:', error);
        // Don't throw - return empty array so page can display gracefully
        // This ensures we never show an error when cache fails, just fetch fresh
        return [];
    }
}

// Create a cached version based on query hash
function getCachedEntityQuery(sparqlQuery: string) {
    // Create a hash of the query for cache key
    const queryHash = getQueryHash(sparqlQuery);
    
    return unstable_cache(
        async () => fetchEntityQueryData(sparqlQuery),
        [`brainkb-entity-query-${queryHash}`],
        {
            revalidate: CACHE_DURATION,
            tags: [`entity-query-${queryHash}`]
        }
    );
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { sparql_query } = body;
        
        if (!sparql_query || typeof sparql_query !== 'string') {
            return NextResponse.json(
                { 
                    success: false, 
                    error: 'sparql_query is required and must be a string' 
                },
                { status: 400 }
            );
        }
        
        const cachedFetch = getCachedEntityQuery(sparql_query);
        const result = await cachedFetch();
        
        return NextResponse.json({ 
            success: true, 
            data: result 
        });
    } catch (error: any) {
        console.error('Error in entity-query API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error.message || 'Failed to fetch entity query data' 
            },
            { status: 500 }
        );
    }
}

