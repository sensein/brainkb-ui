/**
 * API client utilities without authentication
 */
import { env } from '@/src/config/env';
import { CACHE_DURATIONS, DEFAULT_PAGINATION } from '@/src/config/constants';
import { FetchOptionsWithoutToken } from '@/src/types/api';

/**
 * Fetch paginated data from an endpoint without authentication
 */
export async function fetchPaginatedDataWithoutToken(
  options: FetchOptionsWithoutToken & { params?: Record<string, string> }
): Promise<unknown> {
  const { endpoint, limit = DEFAULT_PAGINATION.LIMIT, skip = DEFAULT_PAGINATION.SKIP, search, baseUrl, params } = options;
  
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    // For Next.js API routes (starting with /api/), use current origin
    // Otherwise, use the provided baseUrl or env.apiHost
    if (endpoint.startsWith('/api/')) {
      // In browser, use window.location.origin; in server, use baseUrl or env.apiHost
      const origin = typeof window !== 'undefined' 
        ? window.location.origin 
        : (baseUrl || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || env.apiHost);
      url = new URL(endpoint, origin);
    } else {
      const defaultBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : env.apiHost);
      url = new URL(endpoint, defaultBaseUrl);
    }
  }

  // Convert to strings if they're numbers (for backward compatibility)
  const limitStr = typeof limit === 'number' ? String(limit) : limit;
  const skipStr = typeof skip === 'number' ? String(skip) : skip;
  
  url.searchParams.set('limit', limitStr);
  url.searchParams.set('skip', skipStr);
  if (search && search.trim()) {
    url.searchParams.set('search', search.trim());
  }
  
  // Add additional query params if provided
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // No authentication headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
    next: { revalidate: CACHE_DURATIONS.MEDIUM }
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
): Promise<unknown> {
  // No authentication headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  let currentSkip = 0;
  const searchLimit = DEFAULT_PAGINATION.SEARCH_LIMIT;
  const maxSearchPages = DEFAULT_PAGINATION.MAX_SEARCH_PAGES;
  
  for (let page = 0; page < maxSearchPages; page++) {
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      const defaultBaseUrl = baseUrl || env.apiHost;
      url = new URL(endpoint, defaultBaseUrl);
    }

    url.searchParams.set('limit', String(searchLimit));
    url.searchParams.set('skip', String(currentSkip));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      next: { revalidate: CACHE_DURATIONS.MEDIUM }
    });

    if (!response.ok) {
      break;
    }

    const result = await response.json();
    if (Array.isArray(result.data)) {
      const foundItem = result.data.find((item: { _id?: string }) => item._id === id);
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

