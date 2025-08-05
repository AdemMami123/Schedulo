import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  console.log('=== GOOGLE CALENDAR CALLBACK START ===');
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));
  
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    console.log('Google Calendar callback received:', { 
      code: code ? 'present' : 'missing', 
      state: state ? 'present' : 'missing', 
      error,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error from Google:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=${encodeURIComponent(error)}`
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=missing_parameters`
      );
    }

    // Parse the state to get user ID
    let userId: string;
    try {
      console.log('Raw state parameter:', state);
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
      console.log('Decoded state:', decodedState);
      userId = decodedState.userId;
      console.log('Extracted user ID from state:', userId);
    } catch (parseError) {
      console.error('Error parsing state:', parseError);
      console.error('State value was:', state);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=invalid_state&details=${encodeURIComponent(JSON.stringify({ state, error: parseError instanceof Error ? parseError.message : String(parseError) }))}`
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
    console.log('Environment variables check:', {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'present' : 'missing',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing'
    });
    
    console.log('=== STARTING TOKEN EXCHANGE ===');
    const tokenRequestBody = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    
    console.log('Token request body (without secrets):', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      code: code.substring(0, 10) + '...', // Log partial code for debugging
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody,
    });

    console.log('Token response status:', tokenResponse.status);
    console.log('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorData
      });
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=token_exchange_failed&details=${encodeURIComponent(JSON.stringify(errorData))}`
      );
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      tokenType: tokens.token_type
    });

    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      console.error('Missing tokens in response:', { access_token: !!access_token, refresh_token: !!refresh_token });
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=missing_tokens`
      );
    }

    // Calculate token expiry time
    const expiryTime = Date.now() + (expires_in * 1000);
    console.log('Token expiry time calculated:', new Date(expiryTime).toISOString());

    // Verify the user profile exists
    console.log('=== CHECKING USER PROFILE ===');
    const userProfileRef = doc(db, 'userProfiles', userId);
    const userProfileSnapshot = await getDoc(userProfileRef);

    console.log('User profile check result:', {
      exists: userProfileSnapshot.exists(),
      userId: userId
    });

    if (!userProfileSnapshot.exists()) {
      console.error('User profile not found:', userId);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=user_not_found`
      );
    }

    // Update the user's profile with the Google Calendar tokens
    console.log('=== UPDATING USER PROFILE ===');
    const updateData = {
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
    };
    
    console.log('Update data (without tokens):', {
      googleCalendarConnected: true,
      'googleCalendar.connected': true,
      'googleCalendar.expiryTime': new Date(expiryTime).toISOString(),
      'googleCalendar.scope': tokens.scope || 'https://www.googleapis.com/auth/calendar',
      updatedAt: new Date().toISOString(),
    });

    await updateDoc(userProfileRef, updateData);

    console.log('Google Calendar connected successfully for user:', userId);
    console.log('=== GOOGLE CALENDAR CALLBACK SUCCESS ===');

    // Redirect back to the settings page with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?status=calendar_connected`
    );
  } catch (error) {
    console.error('=== UNEXPECTED ERROR IN GOOGLE CALENDAR CALLBACK ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Log more details about the error
    const errorDetails = {
      type: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString(),
      url: req.url,
    };
    
    console.error('Detailed error information:', errorDetails);
    
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=unexpected_error&details=${encodeURIComponent(JSON.stringify(errorDetails))}`
    );
  }
}
