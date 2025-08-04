// Test script to verify Google Meet integration
// This file can be run manually to test the Google Meet functionality

import { googleCalendarService } from '@/lib/googleCalendar';

export async function testGoogleMeetIntegration() {
  console.log('🧪 Testing Google Meet Integration...');
  
  try {
    // Initialize the service
    await googleCalendarService.initialize();
    console.log('✅ Google Calendar service initialized');
    
    // Create a test event with Google Meet
    const testEvent = {
      summary: 'Test Meeting with Google Meet',
      description: 'This is a test meeting to verify Google Meet integration',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), // Tomorrow + 30 min
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      attendees: [
        {
          email: 'test@example.com',
          displayName: 'Test User'
        }
      ]
    };
    
    // Create event with Google Meet link
    const result = await googleCalendarService.createEvent(testEvent, 'primary', true);
    
    if (result?.eventId) {
      console.log('✅ Calendar event created:', result.eventId);
      
      if (result.googleMeetLink) {
        console.log('✅ Google Meet link generated:', result.googleMeetLink);
        return {
          success: true,
          eventId: result.eventId,
          googleMeetLink: result.googleMeetLink
        };
      } else {
        console.log('⚠️ Calendar event created but no Google Meet link');
        return {
          success: false,
          error: 'No Google Meet link generated'
        };
      }
    } else {
      console.log('❌ Failed to create calendar event');
      return {
        success: false,
        error: 'Failed to create calendar event'
      };
    }
  } catch (error) {
    console.error('❌ Google Meet integration test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Usage example:
// testGoogleMeetIntegration().then(result => console.log('Test result:', result));
