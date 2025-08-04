import { googleCalendarService } from '@/lib/googleCalendar';

/**
 * Debug utility to test Google Meet link generation
 */
export async function debugGoogleMeetGeneration(userId: string) {
  console.log('🔍 DEBUG: Testing Google Meet link generation...');
  
  try {
    // Initialize the service
    console.log('Initializing Google Calendar service for user:', userId);
    await googleCalendarService.initializeForUser(userId);
    
    // Test event data
    const testEvent = {
      summary: 'DEBUG: Test Google Meet Event',
      description: 'Testing Google Meet link generation - DELETE THIS EVENT',
      start: {
        dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };
    
    console.log('Creating test event with Google Meet link...');
    console.log('Event data:', testEvent);
    
    // Create event WITH Google Meet link
    const result = await googleCalendarService.createEvent(testEvent, 'primary', true);
    
    console.log('📊 RESULT:', result);
    
    if (result?.googleMeetLink) {
      console.log('✅ SUCCESS: Google Meet link generated successfully!');
      console.log('🔗 Google Meet Link:', result.googleMeetLink);
      console.log('📅 Event ID:', result.eventId);
      
      // Clean up - delete the test event
      if (result.eventId) {
        console.log('🧹 Cleaning up test event...');
        await googleCalendarService.deleteEvent(result.eventId);
        console.log('✅ Test event deleted');
      }
      
      return {
        success: true,
        googleMeetLink: result.googleMeetLink,
        eventId: result.eventId
      };
    } else {
      console.log('❌ FAILURE: No Google Meet link generated');
      console.log('Full result object:', result);
      
      // Still clean up if event was created
      if (result?.eventId) {
        console.log('🧹 Cleaning up test event...');
        await googleCalendarService.deleteEvent(result.eventId);
        console.log('✅ Test event deleted');
      }
      
      return {
        success: false,
        error: 'No Google Meet link generated',
        result
      };
    }
  } catch (error) {
    console.error('❌ ERROR during Google Meet test:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('unauthorized') || error.message.includes('401')) {
        errorMessage = 'Google Calendar access token expired or invalid. Please reconnect Google Calendar.';
      } else if (error.message.includes('forbidden') || error.message.includes('403')) {
        errorMessage = 'Insufficient permissions. Please check Google Calendar API permissions.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      details: error
    };
  }
}

/**
 * Test function specifically for BookingForm scenario
 */
export async function testBookingFlowGoogleMeet(userId: string, guestEmail: string) {
  console.log('🔍 DEBUG: Testing complete booking flow with Google Meet...');
  
  try {
    // Initialize the service
    await googleCalendarService.initializeForUser(userId);
    
    // Simulate a booking scenario
    const bookingEvent = {
      summary: 'DEBUG: Test Booking with Google Meet',
      description: `Debug booking flow test.\n\nGuest: Test User\nEmail: ${guestEmail}\nNotes: This is a test booking`,
      start: {
        dateTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(Date.now() + 90000000).toISOString(), // Tomorrow + 1 hour
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: [
        {
          email: guestEmail,
          displayName: 'Test User',
        },
      ],
    };
    
    console.log('Creating booking event with Google Meet...');
    const result = await googleCalendarService.createEvent(bookingEvent, 'primary', true);
    
    console.log('📊 BOOKING FLOW RESULT:', result);
    
    if (result?.googleMeetLink) {
      console.log('✅ SUCCESS: Booking flow Google Meet link generated!');
      console.log('🔗 Google Meet Link:', result.googleMeetLink);
      console.log('📅 Event ID:', result.eventId);
      
      // Test what would be saved to database
      const mockBookingData = {
        googleCalendarEventId: result.eventId,
        googleMeetLink: result.googleMeetLink,
        summary: bookingEvent.summary,
        guestEmail: guestEmail
      };
      
      console.log('📝 Data that would be saved to database:', mockBookingData);
      
      // Test email data
      const mockEmailData = {
        googleMeetLink: result.googleMeetLink,
        host: { displayName: 'Test Host' },
        guest: { name: 'Test User', email: guestEmail },
        booking: {
          startTime: new Date(bookingEvent.start.dateTime),
          endTime: new Date(bookingEvent.end.dateTime),
          duration: 60,
          googleMeetLink: result.googleMeetLink
        }
      };
      
      console.log('📧 Data that would be sent in email:', mockEmailData);
      
      // Clean up
      if (result.eventId) {
        await googleCalendarService.deleteEvent(result.eventId);
        console.log('✅ Test booking event deleted');
      }
      
      return {
        success: true,
        googleMeetLink: result.googleMeetLink,
        eventId: result.eventId,
        mockData: {
          database: mockBookingData,
          email: mockEmailData
        }
      };
    } else {
      console.log('❌ FAILURE: Booking flow did not generate Google Meet link');
      
      // Clean up
      if (result?.eventId) {
        await googleCalendarService.deleteEvent(result.eventId);
      }
      
      return {
        success: false,
        error: 'No Google Meet link generated in booking flow'
      };
    }
  } catch (error) {
    console.error('❌ ERROR during booking flow test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

// Example usage in browser console:
// import { debugGoogleMeetGeneration, testBookingFlowGoogleMeet } from '@/utils/testGoogleMeetDebug';
// debugGoogleMeetGeneration('your-user-id');
// testBookingFlowGoogleMeet('your-user-id', 'test@example.com');
