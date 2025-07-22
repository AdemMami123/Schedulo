/**
 * Test utility for Google Calendar integration
 * This file helps test the Google Calendar service functionality
 */

import { googleCalendarService } from '@/lib/googleCalendar';

export interface CalendarTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test Google Calendar connection for a user
 */
export async function testGoogleCalendarConnection(userId: string): Promise<CalendarTestResult> {
  try {
    console.log('Testing Google Calendar connection for user:', userId);
    
    // Initialize the service
    await googleCalendarService.initializeForUser(userId);
    
    // Try to get access token
    const token = await googleCalendarService.getAccessToken();
    
    if (!token) {
      return {
        success: false,
        message: 'No access token available. Google Calendar may not be connected.',
      };
    }
    
    // Try to fetch calendar events (just a simple test)
    const events = await googleCalendarService.getEvents('primary');
    
    return {
      success: true,
      message: 'Google Calendar connection successful',
      details: {
        hasToken: !!token,
        eventsCount: events.length,
      },
    };
  } catch (error) {
    console.error('Google Calendar test failed:', error);
    
    let message = 'Google Calendar test failed';
    if (error instanceof Error) {
      if (error.message.includes('unauthorized') || error.message.includes('401')) {
        message = 'Google Calendar access token expired or invalid';
      } else if (error.message.includes('forbidden') || error.message.includes('403')) {
        message = 'Insufficient permissions for Google Calendar';
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        message = 'Google Calendar not found or user profile missing';
      } else {
        message = `Google Calendar error: ${error.message}`;
      }
    }
    
    return {
      success: false,
      message,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test creating a calendar event
 */
export async function testCreateCalendarEvent(userId: string): Promise<CalendarTestResult> {
  try {
    console.log('Testing calendar event creation for user:', userId);
    
    await googleCalendarService.initializeForUser(userId);
    
    const testEvent = {
      summary: 'Test Event - Schedulo',
      description: 'This is a test event created by Schedulo to verify calendar integration.',
      start: {
        dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 1.5 hours from now
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
    
    const eventId = await googleCalendarService.createEvent(testEvent);
    
    if (eventId) {
      // Clean up - delete the test event
      try {
        await googleCalendarService.deleteEvent(eventId);
        console.log('Test event cleaned up successfully');
      } catch (cleanupError) {
        console.warn('Could not clean up test event:', cleanupError);
      }
      
      return {
        success: true,
        message: 'Calendar event creation test successful',
        details: { eventId },
      };
    } else {
      return {
        success: false,
        message: 'Calendar event creation returned no event ID',
      };
    }
  } catch (error) {
    console.error('Calendar event creation test failed:', error);
    
    return {
      success: false,
      message: `Calendar event creation failed: ${error instanceof Error ? error.message : String(error)}`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all Google Calendar tests
 */
export async function runGoogleCalendarTests(userId: string): Promise<{
  connectionTest: CalendarTestResult;
  eventCreationTest: CalendarTestResult;
}> {
  console.log('Running Google Calendar tests for user:', userId);
  
  const connectionTest = await testGoogleCalendarConnection(userId);
  let eventCreationTest: CalendarTestResult;
  
  if (connectionTest.success) {
    eventCreationTest = await testCreateCalendarEvent(userId);
  } else {
    eventCreationTest = {
      success: false,
      message: 'Skipped event creation test due to connection failure',
    };
  }
  
  return {
    connectionTest,
    eventCreationTest,
  };
}
