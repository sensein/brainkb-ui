import { env } from '@/src/config/env';
import { TokenResponse } from '@/src/types/api';

/**
 * Token endpoint types
 */
export type TokenEndpointType = 'ml' | 'query' | 'user-management' | 'default';

// -----------------------------------------------------------------------------
// Session-based backend JWT for user-management calls.
// The logged-in user's JWT is issued by usermanagement_service after OAuth and
// lives in the NextAuth session. Pulling it from there (instead of minting a
// fresh service-account token) means every call carries the caller's identity,
// which the backend needs for role-based and per-user page access checks.
// -----------------------------------------------------------------------------
async function getSessionBackendToken(): Promise<string | null> {
    try {
        if (typeof window !== 'undefined') {
            // Client-side: read via NextAuth's client helper.
            const { getSession } = await import('next-auth/react');
            const session = await getSession();
            return (session as any)?.backendToken ?? null;
        }
        // Server-side: use getServerSession with our authOptions.
        const [{ getServerSession }, { authOptions }] = await Promise.all([
            import('next-auth/next'),
            import('@/lib/auth'),
        ]);
        const session = await getServerSession(authOptions as any);
        return (session as any)?.backendToken ?? null;
    } catch (err) {
        console.warn('[Auth] Failed to read backend JWT from session:', err);
        return null;
    }
}


/**
 * Exchange the logged-in user's session JWT (issued by usermanagement after OAuth)
 * for a short-lived, audience-scoped access token for a service. SSO only — there
 * is NO service-account (JWT_USER/JWT_PASSWORD) fallback; a missing or invalid
 * session is a clean authentication error, so calls carry the caller's identity.
 */
async function fetchServiceTokenViaSession(
    audience: 'ml_service' | 'query_service',
    serviceName: string,
): Promise<string> {
    const sessionToken = await getSessionBackendToken();
    if (!sessionToken) {
        throw new Error(`${serviceName} service requires a signed-in session — please sign in.`);
    }
    const base = env.userManagementApiBase.replace(/\/+$/, '');
    const res = await fetch(`${base}/api/auth/session-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ audience }),
        cache: 'no-store',
    });
    if (!res.ok) {
        throw new Error(`${serviceName} session-exchange failed (${res.status}) — please sign in again.`);
    }
    const data: TokenResponse = await res.json();
    return data.access_token;
}

/**
 * Fetch auth token for ML service (session-exchange, SSO).
 */
async function fetchMLAuthToken(): Promise<string> {
    return fetchServiceTokenViaSession('ml_service', 'ML');
}

/**
 * Fetch auth token for Query service (session-exchange, SSO).
 */
async function fetchQueryAuthToken(): Promise<string> {
    return fetchServiceTokenViaSession('query_service', 'Query');
}

/**
 * Fetch auth token for User Management service — the logged-in user's own session
 * JWT (issued by the backend after OAuth). No service-account fallback: these
 * endpoints enforce role-based and per-user access, which needs the caller's
 * identity, so an anonymous call is a clean auth error.
 */
async function fetchUserManagementAuthToken(): Promise<string> {
    const sessionToken = await getSessionBackendToken();
    if (!sessionToken) {
        throw new Error('User Management requires a signed-in session — please sign in.');
    }
    return sessionToken;
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
 * When called from client-side, uses API route to proxy token requests (avoids CORS)
 * When called from server-side, fetches token directly
 */
export async function withAuthHeaders(tokenEndpoint?: TokenEndpointType): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (env.useBearerToken) {
        try {
            const endpointType = tokenEndpoint || 'default';
            console.log('[withAuthHeaders] Fetching token for endpoint type:', endpointType);
            
            let token: string | null = null;
            
            // Check if we're running on the client-side
            if (typeof window !== 'undefined') {
                // For user-management, prefer the logged-in user's session JWT.
                // This is the only token that carries their profile_id + roles,
                // which the backend needs for page access and admin checks.
                if (endpointType === 'user-management') {
                    token = await getSessionBackendToken();
                }

                // Fall back (or for ml/query/default): use the proxy route so
                // the browser doesn't hit the token endpoint directly.
                if (!token) {
                    try {
                        const response = await fetch('/api/auth/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ tokenEndpointType: endpointType }),
                            cache: 'no-store',
                        });

                        if (response.ok) {
                            const data = await response.json();
                            token = data.token || null;
                        } else {
                            console.warn('[withAuthHeaders] Token API route returned error:', response.status);
                        }
                    } catch (error) {
                        console.warn('[withAuthHeaders] Failed to fetch token via API route:', error);
                    }
                }
            } else {
                // Server-side: fetch token directly
                token = await getAuthTokenForService(endpointType);
            }
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('[withAuthHeaders] Token successfully obtained for', endpointType);
            } else {
                console.warn('[withAuthHeaders] No token returned for endpoint type:', endpointType);
            }
        } catch (error) {
            console.warn('[Auth] Failed to get bearer token, proceeding without authentication', error);
        }
    } else {
        console.log('[withAuthHeaders] Bearer token disabled (env.useBearerToken is false)');
    }

    return headers;
}
