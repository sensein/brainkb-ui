const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

export interface FetchOptionsWithoutToken {
    endpoint: string;
    limit?: string;
    skip?: string;
    search?: string;
    id?: string;
    baseUrl?: string;
}

/**
 * Fetch paginated data from an endpoint without authentication
 */
export async function fetchPaginatedDataWithoutToken(
    options: FetchOptionsWithoutToken
): Promise<any> {
    const { endpoint, limit = '50', skip = '0', search, baseUrl } = options;
    
    let url: URL;
    try {
        url = new URL(endpoint);
    } catch {
        const defaultBaseUrl = baseUrl || process.env.NEXT_PUBLIC_API_ADMIN_HOST || 'https://queryservice.brainkb.org';
        url = new URL(endpoint, defaultBaseUrl);
    }

    url.searchParams.set('limit', limit);
    url.searchParams.set('skip', skip);
    if (search && search.trim()) {
        url.searchParams.set('search', search.trim());
    }

    // No authentication headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        next: { revalidate: CACHE_DURATION }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
}

/**
 * Search for an entity by ID by paginating through the list endpoint without authentication.
 * 
 * ⚠️ PERFORMANCE WARNING: This function simulates a direct ID lookup by paginating
 * through the list endpoint. This is highly inefficient and will lead to poor performance
 * as the number of entities grows, potentially making up to 50 API calls to find a single entity.
 * 
 * The backend should ideally provide a dedicated endpoint for fetching an entity by its ID
 * (e.g., /api/ner/{id} or /api/resources/{id}). If that's not possible, this workaround
 * should be used with caution and only for small datasets or when caching is properly implemented.
 * 
 * @param endpoint - The API endpoint to search
 * @param id - The ID of the entity to find
 * @param baseUrl - Optional base URL if endpoint is relative
 * @returns The found entity
 * @throws Error if entity is not found
 */
export async function searchByIdWithoutToken(
    endpoint: string,
    id: string,
    baseUrl?: string
): Promise<any> {
    // No authentication headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    
    let currentSkip = 0;
    const searchLimit = 100;
    const maxSearchPages = 50;
    
    for (let page = 0; page < maxSearchPages; page++) {
        let url: URL;
        try {
            url = new URL(endpoint);
        } catch {
            const defaultBaseUrl = baseUrl || process.env.NEXT_PUBLIC_API_ADMIN_HOST || 'https://queryservice.brainkb.org';
            url = new URL(endpoint, defaultBaseUrl);
        }

        url.searchParams.set('limit', String(searchLimit));
        url.searchParams.set('skip', String(currentSkip));

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers,
            next: { revalidate: CACHE_DURATION }
        });

        if (!response.ok) {
            break;
        }

        const result = await response.json();
        if (Array.isArray(result.data)) {
            const foundItem = result.data.find((item: any) => item._id === id);
            if (foundItem) {
                return foundItem;
            }
            
            if (!result.has_more || result.data.length === 0) {
                break;
            }
            
            currentSkip += searchLimit;
        } else {
            break;
        }
    }

    throw new Error('Entity not found');
}

