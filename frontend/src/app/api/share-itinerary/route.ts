import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipientEmail, packageId, agentId } = body;

    if (!recipientEmail || !packageId) {
      return NextResponse.json(
        { error: 'Email and Package ID are required' },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // We need to pass the access token if sharing requires auth, 
    // but typically sharing an itinerary might be public.
    // If auth is required, we get the token from cookies.
    const cookieStore = cookies();
    const token = cookieStore.get('access_token')?.value;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl}/api/v1/packages/${packageId}/share`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: recipientEmail }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to share itinerary' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share itinerary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
