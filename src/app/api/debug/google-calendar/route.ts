import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    console.log('Testing Google Calendar integration for user:', userId);

    // Check environment variables
    const envCheck = {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      NEXTAUTH_URL_value: process.env.NEXTAUTH_URL,
      GOOGLE_CLIENT_ID_value: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
    };

    console.log('Environment variables check:', envCheck);

    // Check user profile
    const userProfileRef = doc(db, 'userProfiles', userId);
    const userProfileSnapshot = await getDoc(userProfileRef);
    
    const profileCheck = {
      exists: userProfileSnapshot.exists(),
      data: userProfileSnapshot.exists() ? {
        googleCalendarConnected: userProfileSnapshot.data()?.googleCalendarConnected,
        hasGoogleCalendar: !!userProfileSnapshot.data()?.googleCalendar,
        connectedAt: userProfileSnapshot.data()?.googleCalendar?.connectedAt,
      } : null
    };

    console.log('Profile check:', profileCheck);

    // Test OAuth URL generation
    const state = Buffer.from(JSON.stringify({ 
      userId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7)
    })).toString('base64');

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`;
    
    const testOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    testOAuthUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID!);
    testOAuthUrl.searchParams.append('redirect_uri', redirectUri);
    testOAuthUrl.searchParams.append('response_type', 'code');
    testOAuthUrl.searchParams.append('scope', 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    testOAuthUrl.searchParams.append('access_type', 'offline');
    testOAuthUrl.searchParams.append('prompt', 'consent');
    testOAuthUrl.searchParams.append('state', state);

    return NextResponse.json({
      success: true,
      environment: envCheck,
      profile: profileCheck,
      oauthUrl: testOAuthUrl.toString(),
      redirectUri,
      state,
      decodedState: JSON.parse(Buffer.from(state, 'base64').toString('utf-8')),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
