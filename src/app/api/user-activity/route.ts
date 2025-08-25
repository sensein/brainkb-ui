import { NextRequest, NextResponse } from 'next/server';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserProfile {
  email: string;
  orcid_id: string;
  [key: string]: any;
}

interface Activity {
  id: number;
  profile_id: number;
  activity_type: string;
  description: string;
  created_at: string;
  meta_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  location?: string | null;
  isp?: string | null;
  as_info?: string | null;
}

async function getAuthToken(): Promise<string> {
  const {
    NEXT_PUBLIC_JWT_USER: jwtUser,
    NEXT_PUBLIC_JWT_PASSWORD: jwtPassword,
    NEXT_PUBLIC_TOKEN_ENDPOINT_USER_MANAGEMENT_SERVICE: tokenEndpoint,
  } = process.env;

  if (!jwtUser || !jwtPassword || !tokenEndpoint) {
    throw new Error('JWT credentials not configured');
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: jwtUser, password: jwtPassword }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

  const tokenData: TokenResponse = await response.json();
  return tokenData.access_token;
}

async function withAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getAuthToken();
    return { Authorization: `Bearer ${token}` };
  } catch (error) {
    console.warn('Failed to get bearer token, proceeding without authentication');
    return {};
  }
}


async function getUserActivity(
  getEndpoint: string,
  params: URLSearchParams,
  headers: Record<string, string>
): Promise<Activity | null> {
  const response = await fetch(`${getEndpoint}?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) return null;

  return response.json();
}




export async function GET(request: NextRequest) {
  try {
    const { NEXT_PUBLIC_GET_ENDPOINT_USER_ACTIVITY_USER_MANAGEMENT_SERVICE: getEndpoint } = process.env;

    if (!getEndpoint) {
      return NextResponse.json(
        { error: 'Profile service endpoint not configured' },
        { status: 500 }
      );
    }


    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') ?? '';
    const orcid_id = searchParams.get('orcid_id') ?? '';

    if (!email && !orcid_id) {
      return NextResponse.json(
        { error: 'Missing required query parameters: email or orcid_id' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({ email, orcid_id });
    const headers = await withAuthHeaders();
    const userActivities = await getUserActivity(getEndpoint, params, headers);

    if (!userActivities) {
      return NextResponse.json(
        { error: 'Activities not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: userActivities });

  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

