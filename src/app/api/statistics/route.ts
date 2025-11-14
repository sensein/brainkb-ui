import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getData } from '@/src/app/components/getData';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import yaml from '@/src/app/components/config-home.yaml';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

async function fetchStatisticsData() {
    // Check for pre-warmed cache from build time first
    const warmedData = getWarmedCache<number[]>('statistics');
    if (warmedData) {
        // Only log in development to reduce noise
        if (process.env.NODE_ENV === 'development') {
            console.log('Using pre-warmed statistics cache from build');
        }
        return warmedData;
    }
    
    // If no warmed cache, fetch fresh data
    try {
        const updatedDataCount = await Promise.all(
            yaml.boxiconsstatisticscount.map(async (page) => {
                const queryParameter = { sparql_query: page.sparql_query };
                const endpoint = process.env.NEXT_PUBLIC_API_QUERY_ENDPOINT || "query/sparql";
                
                const response = await getData(queryParameter, endpoint);
                return response && response.status === "success" && response.message?.results?.bindings
                    ? response.message.results.bindings[0].count.value
                    : null;
            })
        );
        
        return updatedDataCount;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        throw error;
    }
}

// Create a cached version of the fetch function
const getCachedStatistics = unstable_cache(
    async () => fetchStatisticsData(),
    ['brainkb-statistics'],
    {
        revalidate: CACHE_DURATION,
        tags: ['statistics']
    }
);

export async function GET(request: NextRequest) {
    try {
        const data = await getCachedStatistics();
        return NextResponse.json({ 
            success: true, 
            data 
        });
    } catch (error) {
        console.error('Error in statistics API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch statistics' 
            },
            { status: 500 }
        );
    }
}

