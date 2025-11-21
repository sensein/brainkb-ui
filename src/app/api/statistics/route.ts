import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getData } from '@/src/app/components/getData';
import { getWarmedCache } from '@/src/app/utils/cache-warm';
import yaml from '@/src/config/yaml/config-home.yaml';

// Force dynamic rendering - this route fetches external data
export const dynamic = 'force-dynamic';

// Cache duration: 24 hours (in seconds)
const CACHE_DURATION = 24 * 60 * 60;

async function fetchStatisticsData(): Promise<number[]> {
    // Check for pre-warmed cache from build time first
    const warmedData = getWarmedCache<number[]>('statistics');
    if (warmedData && Array.isArray(warmedData)) {
        // Only log in development to reduce noise
        if (process.env.NODE_ENV === 'development') {
            console.log('Using pre-warmed statistics cache from build');
        }
        return warmedData;
    }
    
    // If no warmed cache, fetch fresh data
    try {
        // Ensure yaml.boxiconsstatisticscount is an array
        if (!Array.isArray(yaml.boxiconsstatisticscount)) {
            console.error('yaml.boxiconsstatisticscount is not an array');
            return [];
        }
        
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
        
        // Ensure we always return an array
        return Array.isArray(updatedDataCount) ? updatedDataCount : [];
    } catch (error) {
        console.error('Error fetching statistics:', error);
        // Return empty array instead of throwing to prevent crashes
        return [];
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
        // Ensure data is always an array
        const dataArray = Array.isArray(data) ? data : [];
        return NextResponse.json({ 
            success: true, 
            data: dataArray
        });
    } catch (error) {
        console.error('Error in statistics API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch statistics',
                data: [] // Always return an array even on error
            },
            { status: 500 }
        );
    }
}

