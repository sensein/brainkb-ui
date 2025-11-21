/**
 * Base API service class
 */
import { env } from '@/src/config/env';
import { ApiResponse } from '@/src/types/api';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  useAuth?: boolean;
}

export abstract class BaseApiService {
  protected abstract getBaseEndpoint(): string | undefined;

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
        const token = await this.getAuthToken();
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

  protected async getAuthToken(): Promise<string | null> {
    // This will be implemented by services that need auth
    // or use the centralized auth utility
    return null;
  }
}

