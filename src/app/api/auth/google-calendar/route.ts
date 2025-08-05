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
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.NEXTAUTH_URL) {
      console.error('Missing required environment variables');
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Missing OAuth configuration'
      }, { status: 500 });
    }

    // Enhanced state with additional security measures
    const state = Buffer.from(JSON.stringify({ 
      userId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    })).toString('base64');

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`;
    
    console.log('OAuth Configuration:', {
      userId,
      redirectUri,
      baseUrl: process.env.NEXTAUTH_URL,
      clientIdPresent: !!process.env.GOOGLE_CLIENT_ID,
      scopes: SCOPES
    });

    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
    authUrl.searchParams.append('state', state);
    
    // Add additional parameters to prevent blocking
    authUrl.searchParams.append('include_granted_scopes', 'true');
    authUrl.searchParams.append('enable_granular_consent', 'true');

    const finalUrl = authUrl.toString();
    console.log('Generated OAuth URL:', finalUrl);

    return NextResponse.json({ 
      url: finalUrl,
      state,
      redirectUri,
      scopes: SCOPES
    });
  } catch (error) {
    console.error('Google Calendar auth error:', error);
    return NextResponse.json({ 
      error: 'Failed to initiate Google authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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
