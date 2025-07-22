import { NextRequest, NextResponse } from 'next/server';
import { runGoogleCalendarTests } from '@/utils/testGoogleCalendar';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Running Google Calendar tests for user:', userId);
    
    const testResults = await runGoogleCalendarTests(userId);
    
    return NextResponse.json({
      success: true,
      results: testResults,
    });
  } catch (error) {
    console.error('Error running Google Calendar tests:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to run Google Calendar tests',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
