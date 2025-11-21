import { unstable_cache } from 'next/cache';
import { env } from '@/src/config/env';
import { TOKEN_CACHE_DURATION } from '@/src/config/constants';
import { TokenResponse } from '@/src/types/api';

async function fetchAuthToken(): Promise<string> {
    const jwtUser = env.jwtUser;
    const jwtPassword = env.jwtPassword;
    const tokenEndpoint = env.tokenEndpointMLService;

    if (!tokenEndpoint || !jwtUser || !jwtPassword) {
        throw new Error('JWT authentication credentials not configured');
    }

    try {
        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: jwtUser,
                password: jwtPassword,
            }),
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Token request failed: ${response.status}`);
        }

        const tokenData: TokenResponse = await response.json();
        return tokenData.access_token;
    } catch (error) {
        console.error('[Auth] Failed to get JWT token:', error);
        throw new Error('Authentication failed');
    }
}

// Cached version of getAuthToken
const getCachedAuthToken = unstable_cache(
    async () => fetchAuthToken(),
    ['shared-auth-token'],
    {
        revalidate: TOKEN_CACHE_DURATION,
        tags: ['shared-auth-token']
    }
);

export async function getAuthToken(): Promise<string> {
    try {
        return await getCachedAuthToken();
    } catch (error) {
        console.error('[Auth] Failed to get cached auth token:', error);
        return fetchAuthToken();
    }
}

export async function withAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    if (env.useBearerToken) {
        try {
            const token = await getAuthToken();
            headers['Authorization'] = `Bearer ${token}`;
        } catch (error) {
            console.warn('[Auth] Failed to get bearer token, proceeding without authentication');
        }
    }

    return headers;
}

