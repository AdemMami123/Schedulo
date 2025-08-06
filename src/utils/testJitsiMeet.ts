/**
 * Test file for Jitsi Meet Integration
 * Run this in a console or create a simple test page to verify the integration works
 */

import { jitsiMeetService } from '@/lib/jitsiMeet';

export async function testJitsiMeetIntegration() {
  console.log('🧪 Testing Jitsi Meet Integration...');
  
  try {
    // Test 1: Generate a meeting room
    const testBooking = {
      id: 'test-booking-123',
      guestName: 'John Doe',
      startTime: new Date('2025-08-07T10:00:00Z'),
      userId: 'host-user-456',
    };

    console.log('📝 Test booking data:', testBooking);
    
    const jitsiRoom = jitsiMeetService.generateMeetingRoom(testBooking);
    console.log('✅ Jitsi room generated:', jitsiRoom);
    
    // Test 2: Validate the generated URL
    const isValidUrl = jitsiMeetService.validateMeetingUrl(jitsiRoom.meetingUrl);
    console.log('🔗 URL validation result:', isValidUrl);
    
    // Test 3: Extract room name from URL
    const extractedRoomName = jitsiMeetService.extractRoomName(jitsiRoom.meetingUrl);
    console.log('📋 Extracted room name:', extractedRoomName);
    
    // Test 4: Generate direct join URLs
    const hostJoinUrl = jitsiMeetService.generateDirectJoinUrl(
      jitsiRoom.meetingUrl, 
      'Host User', 
      true
    );
    const guestJoinUrl = jitsiMeetService.generateDirectJoinUrl(
      jitsiRoom.meetingUrl, 
      'John Doe', 
      false
    );
    
    console.log('🎯 Host join URL:', hostJoinUrl);
    console.log('👤 Guest join URL:', guestJoinUrl);
    
    // Test 5: Test different booking scenarios
    const scenarios = [
      {
        name: 'Morning Meeting',
        booking: {
          id: 'morning-meeting',
          guestName: 'Alice Smith',
          startTime: new Date('2025-08-07T09:00:00Z'),
          userId: 'host-user-456',
        }
      },
      {
        name: 'Afternoon Session',
        booking: {
          id: 'afternoon-session',
          guestName: 'Bob Johnson',
          startTime: new Date('2025-08-07T14:30:00Z'),
          userId: 'host-user-789',
        }
      }
    ];
    
    console.log('🔄 Testing multiple scenarios...');
    scenarios.forEach((scenario, index) => {
      const room = jitsiMeetService.generateMeetingRoom(scenario.booking);
      console.log(`${index + 1}. ${scenario.name}:`, {
        roomName: room.roomName,
        url: room.meetingUrl,
        hasPassword: !!room.password
      });
    });
    
    return {
      success: true,
      testResults: {
        roomGeneration: !!jitsiRoom.meetingUrl,
        urlValidation: isValidUrl,
        roomNameExtraction: extractedRoomName === jitsiRoom.roomName,
        directJoinUrls: {
          host: hostJoinUrl,
          guest: guestJoinUrl
        }
      },
      sampleRoom: jitsiRoom
    };
    
  } catch (error) {
    console.error('❌ Jitsi Meet integration test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}

// Example usage:
// testJitsiMeetIntegration().then(result => console.log('Test result:', result));

// Manual test examples you can run in browser console:
export const manualTestExamples = {
  // Test generating a room
  generateRoom: () => {
    const booking = {
      id: 'manual-test-' + Date.now(),
      guestName: 'Test User',
      startTime: new Date(Date.now() + 3600000), // 1 hour from now
      userId: 'test-host-user'
    };
    return jitsiMeetService.generateMeetingRoom(booking);
  },
  
  // Test URL validation
  validateUrl: (url: string) => {
    return jitsiMeetService.validateMeetingUrl(url);
  },
  
  // Test direct join URL generation
  generateJoinUrl: (meetingUrl: string, displayName: string, isHost: boolean = false) => {
    return jitsiMeetService.generateDirectJoinUrl(meetingUrl, displayName, isHost);
  }
};

// Export for testing in development
if (typeof window !== 'undefined') {
  (window as any).testJitsiMeet = {
    runTest: testJitsiMeetIntegration,
    examples: manualTestExamples,
    service: jitsiMeetService
  };
  
  console.log('🔧 Jitsi Meet testing tools available at window.testJitsiMeet');
}
