import { NextRequest, NextResponse } from 'next/server';
import { withAuthHeaders } from '@/src/utils/api/auth';

interface UserProfile {
  email: string;
  orcid_id: string;
  [key: string]: any;
}


async function getUser(
  getEndpoint: string,
  params: URLSearchParams,
  headers: Record<string, string>
): Promise<UserProfile | null> {
  const response = await fetch(`${getEndpoint}?${params}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) return null;

  return response.json();
}

async function updateUser(
  updateEndpoint: string,
  params: URLSearchParams,
  userData: UserProfile,
  headers: Record<string, string>
): Promise<Response> {
  return fetch(updateEndpoint, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
}

async function createUser(
  createEndpoint: string,
  userData: UserProfile,
  headers: Record<string, string>
): Promise<Response> {
  return fetch(createEndpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
}

export async function GET(request: NextRequest) {
  try {
    const { NEXT_PUBLIC_GET_ENDPOINT_USER_PROFILE_USER_MANAGEMENT_SERVICE: getEndpoint } = process.env;

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
    const headers = await withAuthHeaders('user-management');
    const existingProfile = await getUser(getEndpoint, params, headers);

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: existingProfile });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData: UserProfile = await request.json();
    const { email, orcid_id } = userData;

    const {
      NEXT_PUBLIC_CREATE_USER_PROFILE_ENDPOINT_USER_MANAGEMENT_SERVICE: createEndpoint,
      NEXT_PUBLIC_GET_ENDPOINT_USER_PROFILE_USER_MANAGEMENT_SERVICE: getEndpoint,
      NEXT_PUBLIC_UPDATE_ENDPOINT_USER_PROFILE_USER_MANAGEMENT_SERVICE: updateEndpoint,
    } = process.env;

    if (!createEndpoint || !getEndpoint || !updateEndpoint) {
      return NextResponse.json(
        { error: 'Profile service endpoints not configured' },
        { status: 500 }
      );
    }

    const params = new URLSearchParams({ email, orcid_id });
    const headers = await withAuthHeaders();

    // Step 1: Check if user exists
    const existingProfile = await getUser(getEndpoint, params, headers);
    // safe check just in case
    if (existingProfile?.email === email || existingProfile?.orcid_id === orcid_id) {
      // Step 2: Update existing profile
      const updateResponse = await updateUser(updateEndpoint, params, userData, await withAuthHeaders('user-management'));

      if (!updateResponse.ok) {
        const errorData = await updateResponse.text();
        return NextResponse.json(
          { error: 'Failed to update profile', details: errorData },
          { status: updateResponse.status }
        );
      }

      return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    }

    // Step 3: Create new profile
    const createResponse = await createUser(createEndpoint, userData, await withAuthHeaders('user-management'));

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      return NextResponse.json(
        { error: 'Failed to create profile', details: errorData },
        { status: createResponse.status }
      );
    }

    return NextResponse.json({ success: true, message: 'Profile created successfully' });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
