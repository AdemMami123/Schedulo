import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=missing_parameters`
      );
    }

    // Parse the state to get user ID
    let userId: string;
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      userId = decodedState.userId;
    } catch (parseError) {
      console.error('Error parsing state:', parseError);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=invalid_state`
      );
    }

    if (!userId) {
      console.error('No user ID found in state');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=no_user_id`
      );
    }

    // Exchange the authorization code for tokens
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`;
    console.log('Using redirect URI for token exchange:', redirectUri);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response');
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=missing_tokens`
      );
    }

    // Calculate token expiry time
    const expiryTime = Date.now() + (expires_in * 1000);

    // Verify the user profile exists
    const userProfileRef = doc(db, 'userProfiles', userId);
    const userProfileSnapshot = await getDoc(userProfileRef);

    if (!userProfileSnapshot.exists()) {
      console.error('User profile not found:', userId);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=user_not_found`
      );
    }

    // Update the user's profile with the Google Calendar tokens
    await updateDoc(userProfileRef, {
      googleCalendarConnected: true,
      googleCalendar: {
        connected: true,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiryTime: expiryTime,
        scope: tokens.scope || 'https://www.googleapis.com/auth/calendar',
        connectedAt: new Date(),
      },
      updatedAt: new Date(),
    });

    console.log('Google Calendar connected successfully for user:', userId);

    // Redirect back to the settings page with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_success=true`
    );
  } catch (error) {
    console.error('Unexpected error in Google Calendar callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=unexpected_error`
    );
  }
}
