/**
 * Base API service class
 * Provides shared logic for making API calls, authentication, and error handling
 */
import { env } from '@/src/config/env';
import { getAuthToken, getAuthTokenForService } from '@/src/utils/api/auth';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  useAuth?: boolean;
  tokenEndpoint?: 'ml' | 'query' | 'default';
}

export abstract class BaseApiService {
  /**
   * Get the base endpoint URL for this service
   * Override in subclasses to provide service-specific base URL
   */
  protected abstract getBaseEndpoint(): string | undefined;

  /**
   * Get the token endpoint type for this service
   * Override in subclasses if they need a specific token endpoint
   */
  protected getTokenEndpointType(): 'ml' | 'query' | 'default' {
    return 'default';
  }

  /**
   * Make an authenticated API request
   */
  protected async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      useAuth = true,
      tokenEndpoint,
    } = options;

    const baseEndpoint = this.getBaseEndpoint();
    if (!baseEndpoint) {
      throw new Error('Base endpoint not configured');
    }

    // Build URL
    const url = new URL(path, baseEndpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // Add authentication if needed
    if (useAuth && env.useBearerToken) {
      try {
        const tokenEndpointType = tokenEndpoint || this.getTokenEndpointType();
        const token = await getAuthTokenForService(tokenEndpointType);
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[BaseApiService] Failed to get auth token:', error);
        // Continue without auth if token fetch fails
      }
    }

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Make a request to a full URL (not relative to base endpoint)
   */
  protected async requestFullUrl<T>(
    fullUrl: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      useAuth = true,
      tokenEndpoint,
    } = options;

    // Build URL with query params
    const url = new URL(fullUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers,
    };

    // Add authentication if needed
    if (useAuth && env.useBearerToken) {
      try {
        const tokenEndpointType = tokenEndpoint || this.getTokenEndpointType();
        const token = await getAuthTokenForService(tokenEndpointType);
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[BaseApiService] Failed to get auth token:', error);
      }
    }

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get authentication headers
   */
  protected async getAuthHeaders(tokenEndpoint?: 'ml' | 'query' | 'default'): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (env.useBearerToken) {
      try {
        const tokenEndpointType = tokenEndpoint || this.getTokenEndpointType();
        const token = await getAuthTokenForService(tokenEndpointType);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[BaseApiService] Failed to get auth token:', error);
      }
    }

    return headers;
  }
}
