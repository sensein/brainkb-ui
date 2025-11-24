import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAuthHeaders } from '../../../utils/api/auth';

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

    // Get authentication headers
    const authHeaders = await withAuthHeaders('ml');
    console.info('[save-structured-resource] Authentication headers obtained');
    
    console.info('[save-structured-resource] Forwarding request to endpoint:', endpoint);
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
        console.info('[save-structured-resource] Resources cache invalidated successfully');
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