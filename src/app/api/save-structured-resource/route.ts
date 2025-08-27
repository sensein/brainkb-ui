import { NextRequest, NextResponse } from 'next/server';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getAuthToken(): Promise<string> {
  const jwtUser = process.env.NEXT_PUBLIC_JWT_USER;
  const jwtPassword = process.env.NEXT_PUBLIC_JWT_PASSWORD;
  const tokenEndpoint = process.env.NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE;

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
    } catch (error) {
      console.warn('Failed to get bearer token, proceeding without authentication');
    }

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