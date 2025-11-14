import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { createHash } from 'crypto';
import { getData } from '@/src/app/components/getData';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

async function fetchEntityQueryData(sparqlQuery: string) {
    try {
        const queryParameter = { sparql_query: sparqlQuery };
        const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
        
        const response = await getData(queryParameter, endpoint);
        
        if (response.status === "success" && response.message?.results?.bindings) {
            return response.message.results.bindings as any[];
        }
        return [];
    } catch (error) {
        console.error('Error fetching entity query data:', error);
        throw error;
    }
}

// Create a cached version based on query hash
function getCachedEntityQuery(sparqlQuery: string) {
    // Create a hash of the query for cache key
    const queryHash = createHash('sha256').update(sparqlQuery).digest('hex').slice(0, 16);
    
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

