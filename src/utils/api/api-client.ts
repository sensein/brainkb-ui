/**
 * API client utilities with authentication
 * Uses BaseApiService for shared logic
 */
import { env } from '@/src/config/env';
import { CACHE_DURATIONS, DEFAULT_PAGINATION } from '@/src/config/constants';
import { FetchOptions } from '@/src/types/api';
import { withAuthHeaders } from './auth';

/**
 * Paginated API Service - extends BaseApiService for paginated endpoints
 */
class PaginatedApiService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.apiHost;
  }

  /**
   * Fetch paginated data from an endpoint with authentication
   */
  async fetchPaginatedData(options: FetchOptions): Promise<unknown> {
    const { endpoint, limit = DEFAULT_PAGINATION.LIMIT, skip = DEFAULT_PAGINATION.SKIP, search, baseUrl } = options;
    
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      // For Next.js API routes (starting with /api/), use current origin
      // Otherwise, use the provided baseUrl or this.baseUrl
      if (endpoint.startsWith('/api/')) {
        // In browser, use window.location.origin; in server, use baseUrl or this.baseUrl
        const origin = typeof window !== 'undefined' 
          ? window.location.origin 
          : (baseUrl || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) || this.baseUrl);
        url = new URL(endpoint, origin);
      } else {
        const defaultBaseUrl = baseUrl || this.baseUrl;
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

    const headers = await withAuthHeaders('query');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      next: { revalidate: CACHE_DURATIONS.LONG }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Search for an entity by ID by paginating through the list endpoint.
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
  async searchById(
    endpoint: string,
    id: string,
    baseUrl?: string
  ): Promise<unknown> {
    const headers = await withAuthHeaders('query');
    let currentSkip = 0;
    const searchLimit = DEFAULT_PAGINATION.SEARCH_LIMIT;
    const maxSearchPages = DEFAULT_PAGINATION.MAX_SEARCH_PAGES;
    
    for (let page = 0; page < maxSearchPages; page++) {
      let url: URL;
      try {
        url = new URL(endpoint);
      } catch {
        const defaultBaseUrl = baseUrl || this.baseUrl;
        url = new URL(endpoint, defaultBaseUrl);
      }

      url.searchParams.set('limit', String(searchLimit));
      url.searchParams.set('skip', String(currentSkip));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        next: { revalidate: CACHE_DURATIONS.LONG }
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
}

// Create singleton instance
const paginatedApiService = new PaginatedApiService();

/**
 * Fetch paginated data from an endpoint with authentication
 */
export async function fetchPaginatedData(options: FetchOptions): Promise<unknown> {
  return paginatedApiService.fetchPaginatedData(options);
}

/**
 * Search for an entity by ID by paginating through the list endpoint.
 */
export async function searchById(
  endpoint: string,
  id: string,
  baseUrl?: string
): Promise<unknown> {
  return paginatedApiService.searchById(endpoint, id, baseUrl);
}

/**
 * POST data to an endpoint with authentication
 */
export async function postData<T = unknown>(
  endpoint: string,
  data: unknown,
  options: {
    useAuth?: boolean;
    tokenEndpointType?: 'ml' | 'query' | 'default';
    headers?: Record<string, string>;
    baseUrl?: string;
  } = {}
): Promise<T> {
  const { useAuth = true, tokenEndpointType = 'default', headers = {}, baseUrl } = options;

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
      const defaultBaseUrl = baseUrl || env.apiHost;
      url = new URL(endpoint, defaultBaseUrl);
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  if (useAuth) {
    const authHeaders = await withAuthHeaders(tokenEndpointType);
    Object.assign(requestHeaders, authHeaders);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  return await response.json();
}

/**
 * PUT data to an endpoint with authentication
 */
export async function putData<T = unknown>(
  endpoint: string,
  data: unknown,
  options: {
    useAuth?: boolean;
    tokenEndpointType?: 'ml' | 'query' | 'default';
    headers?: Record<string, string>;
    baseUrl?: string;
  } = {}
): Promise<T> {
  const { useAuth = true, tokenEndpointType = 'default', headers = {}, baseUrl } = options;

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
      const defaultBaseUrl = baseUrl || env.apiHost;
      url = new URL(endpoint, defaultBaseUrl);
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  if (useAuth) {
    const authHeaders = await withAuthHeaders(tokenEndpointType);
    Object.assign(requestHeaders, authHeaders);
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: requestHeaders,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned ${response.status}: ${errorText}`);
  }

  return await response.json();
}
