/**
 * API-related type definitions
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  has_more?: boolean;
  total?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FetchOptions {
  endpoint: string;
  limit?: string;
  skip?: string;
  search?: string;
  id?: string;
  baseUrl?: string;
}

export interface FetchOptionsWithoutToken {
  endpoint: string;
  limit?: string;
  skip?: string;
  search?: string;
  id?: string;
  baseUrl?: string;
}

