import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  try {
    const { userId, refreshToken } = await req.json();

    if (!userId || !refreshToken) {
      return NextResponse.json(
        { error: 'User ID and refresh token are required' }, 
        { status: 400 }
      );
    }

    // Refresh the access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Token refresh error:', errorData);
      
      // If refresh fails, mark calendar as disconnected
      try {
        const userProfileRef = doc(db, 'userProfiles', userId);
        await updateDoc(userProfileRef, {
          'googleCalendar.connected': false,
          'googleCalendarConnected': false,
          updatedAt: new Date(),
        });
      } catch (updateError) {
        console.error('Error updating disconnected state:', updateError);
      }
      
      return NextResponse.json(
        { error: 'Failed to refresh token', details: errorData },
        { status: response.status }
      );
    }

    const tokens = await response.json();
    const { access_token, expires_in } = tokens;

    // Calculate token expiry time
    const expiryTime = Date.now() + (expires_in * 1000);

    // Update tokens in Firestore
    const userProfileRef = doc(db, 'userProfiles', userId);
    await updateDoc(userProfileRef, {
      'googleCalendar.accessToken': access_token,
      'googleCalendar.expiryTime': expiryTime,
      'googleCalendar.connected': true,
      updatedAt: new Date(),
    });

    console.log('Access token refreshed successfully for user:', userId);

    return NextResponse.json({
      accessToken: access_token,
      expiryTime: expiryTime,
    });
  } catch (error) {
    console.error('Unexpected error in token refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
