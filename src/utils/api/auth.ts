import { env } from '@/src/config/env';
import { TokenResponse } from '@/src/types/api';

/**
 * Token endpoint types
 */
export type TokenEndpointType = 'ml' | 'query' | 'user-management' | 'default';

/**
 * Fetch auth token from a specific endpoint with custom credentials
 * This allows using credentials from form data instead of env variables
 */
async function fetchAuthTokenFromEndpointWithCredentials(
    tokenEndpoint: string,
    serviceName: string,
    email: string,
    password: string
): Promise<string> {
    if (!tokenEndpoint || !email || !password) {
        throw new Error(`JWT authentication credentials not provided for ${serviceName} service`);
    }

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            }),
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Token request failed: ${response.status}`);
        }

        const tokenData: TokenResponse = await response.json();
        return tokenData.access_token;
    } catch (error) {
        console.error(`[Auth] Failed to get ${serviceName} JWT token:`, error);
        throw new Error(`${serviceName} service authentication failed`);
    }
}

/**
 * Fetch auth token from a specific endpoint
 * This is the single function that handles all token fetching logic
 * Note: Tokens are NOT cached for security reasons - always fetched fresh
 */
async function fetchAuthTokenFromEndpoint(tokenEndpoint: string, serviceName: string): Promise<string> {
    const jwtUser = env.jwtUser;
    const jwtPassword = env.jwtPassword;

    if (!tokenEndpoint || !jwtUser || !jwtPassword) {
        throw new Error(`JWT authentication credentials not configured for ${serviceName} service`);
    }

    return fetchAuthTokenFromEndpointWithCredentials(tokenEndpoint, serviceName, jwtUser, jwtPassword);
}

/**
 * Fetch auth token for ML service
 */
async function fetchMLAuthToken(): Promise<string> {
    const tokenEndpoint = env.tokenEndpointMLService;
    if (!tokenEndpoint) {
        throw new Error('ML service token endpoint not configured');
    }
    return fetchAuthTokenFromEndpoint(tokenEndpoint, 'ML');
}

/**
 * Fetch auth token for Query service
 */
async function fetchQueryAuthToken(): Promise<string> {
    const tokenEndpoint = env.tokenEndpointQueryService;
    if (!tokenEndpoint) {
        throw new Error('Query service token endpoint not configured');
    }
    return fetchAuthTokenFromEndpoint(tokenEndpoint, 'Query');
}

/**
 * Fetch auth token for User Management service
 */
async function fetchUserManagementAuthToken(): Promise<string> {
    const tokenEndpoint = env.get('NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE');
    if (!tokenEndpoint) {
        throw new Error('User Management service token endpoint not configured');
    }
    return fetchAuthTokenFromEndpoint(tokenEndpoint, 'User Management');
}

/**
 * Fetch auth token for default service (uses ML service endpoint)
 */
async function fetchDefaultAuthToken(): Promise<string> {
    return fetchMLAuthToken();
}

/**
 * Get auth token for a specific service type
 * Tokens are always fetched fresh (not cached) for security
 */
export async function getAuthTokenForService(serviceType: TokenEndpointType = 'default'): Promise<string | null> {
    try {
        switch (serviceType) {
            case 'ml':
                return await fetchMLAuthToken();
            case 'query':
                return await fetchQueryAuthToken();
            case 'user-management':
                return await fetchUserManagementAuthToken();
            case 'default':
            default:
                return await fetchDefaultAuthToken();
        }
    } catch (error) {
        console.error(`[Auth] Failed to get auth token for ${serviceType}:`, error);
        return null;
    }
}

/**
 * Get auth token (defaults to ML service for backward compatibility)
 * @deprecated Use getAuthTokenForService() instead
 */
export async function getAuthToken(): Promise<string> {
    const token = await getAuthTokenForService('default');
    if (!token) {
        throw new Error('Failed to get authentication token');
    }
    return token;
}

/**
 * Get headers with authentication
 */
export async function withAuthHeaders(tokenEndpoint?: TokenEndpointType): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (env.useBearerToken) {
        try {
            const token = await getAuthTokenForService(tokenEndpoint || 'default');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        } catch (error) {
            console.warn('[Auth] Failed to get bearer token, proceeding without authentication');
        }
    }

    return headers;
}

/**
 * Get auth token using custom credentials (from form data, etc.)
 * Useful when credentials are provided by the user rather than from env
 */
export async function getAuthTokenWithCredentials(
    tokenEndpoint: string,
    email: string,
    password: string,
    serviceName: string = 'Service'
): Promise<string> {
    return fetchAuthTokenFromEndpointWithCredentials(tokenEndpoint, serviceName, email, password);
}
