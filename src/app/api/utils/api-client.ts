import { withAuthHeaders } from './auth';

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

export interface FetchOptions {
    endpoint: string;
    limit?: string;
    skip?: string;
    id?: string;
    baseUrl?: string;
}

export async function fetchPaginatedData(
    options: FetchOptions
): Promise<any> {
    const { endpoint, limit = '50', skip = '0', baseUrl } = options;
    
    let url: URL;
    try {
        url = new URL(endpoint);
    } catch {
        const defaultBaseUrl = baseUrl || process.env.NEXT_PUBLIC_API_ADMIN_HOST || 'https://queryservice.brainkb.org';
        url = new URL(endpoint, defaultBaseUrl);
    }

    url.searchParams.set('limit', limit);
    url.searchParams.set('skip', skip);

    const headers = await withAuthHeaders();

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

export async function searchById(
    endpoint: string,
    id: string,
    baseUrl?: string
): Promise<any> {
    const headers = await withAuthHeaders();
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

