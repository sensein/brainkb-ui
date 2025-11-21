import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { env } from '../../../config/env';
import { TokenResponse } from '../../../types/api';

async function getAuthToken(): Promise<string> {
  const jwtUser = env.jwtUser;
  const jwtPassword = env.jwtPassword;
  const tokenEndpoint = env.tokenEndpointMLService;

  if (!jwtUser || !jwtPassword || !tokenEndpoint) {
    throw new Error('JWT credentials not configured');
  }

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: jwtUser,
        password: jwtPassword
      })
    });

    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }

    const tokenData: TokenResponse = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Failed to get JWT token:', error);
    throw new Error('Authentication failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, endpoint } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'No data provided' },
        { status: 400 }
      );
    }

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint not provided' },
        { status: 400 }
      );
    }

    // Get authentication token
    let authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const token = await getAuthToken();
      authHeaders['Authorization'] = `Bearer ${token}`;
      console.log('[save-structured-resource] Authentication token obtained successfully');
    } catch (error) {
      console.warn('[save-structured-resource] Failed to get bearer token, proceeding without authentication');
    }
    
    console.log('[save-structured-resource] Forwarding request to endpoint:', endpoint);
    // Forward the request to the ML service
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('ML service error:', errorData);
      return NextResponse.json(
        { error: 'Failed to save data with ML service' },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Invalidate Resources cache tags after successful save
    try {
        // Invalidate common tags that cover all Resources caches
        revalidateTag('resource-all');
        revalidateTag('resource-lists');
        revalidateTag('resource-entities');
        console.log('[save-structured-resource] Resources cache invalidated successfully');
    } catch (cacheError) {
        console.error('[save-structured-resource] Error invalidating cache:', cacheError);
        // Don't fail the request if cache invalidation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Data saved successfully',
      data: result
    });

  } catch (error) {

    console.error('Error saving data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 