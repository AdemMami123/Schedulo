import { NextRequest, NextResponse } from 'next/server';

// Define Google OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// Define necessary scopes for Calendar API
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

export async function GET(req: NextRequest) {
  try {
    // Get the current user ID from the request headers
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Store the user ID in state for verification in callback
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    // Build the redirect URI - ensure it matches exactly what's configured in Google Console
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`;
    
    console.log('Using redirect URI:', redirectUri);
    console.log('Base URL from env:', process.env.NEXTAUTH_URL);

    // Build OAuth URL (simplified without PKCE for now)
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID!);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);

    console.log('Generated OAuth URL for user:', userId);
    console.log('Full OAuth URL:', authUrl.toString());

    // Return the auth URL
    return NextResponse.json({ 
      url: authUrl.toString()
    });
  } catch (error) {
    console.error('Google Calendar auth error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google authentication' }, { status: 500 });
  }
}

// Helper function for generating random strings
function generateRandomString(length: number) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
