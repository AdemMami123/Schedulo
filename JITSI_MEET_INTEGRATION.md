# Jitsi Meet Integration

This document explains how Jitsi Meet has been integrated into the smart scheduling app to replace Google Meet functionality.

## Overview

The app now uses **Jitsi Meet** instead of Google Meet for video conferencing. Jitsi Meet is an open-source video conferencing solution that requires no account setup and works directly in the browser.

## Key Features

- **No Account Required**: Users can join meetings without creating accounts
- **Browser-Based**: Works directly in web browsers without additional software
- **Automatic Link Generation**: Video call links are automatically created for all bookings
- **Persistent URLs**: Meeting URLs are deterministic and remain the same for rescheduled meetings
- **Password Protection**: Optional password protection for sensitive meetings (currently disabled)

## How It Works

### 1. Booking Creation
When a booking is created:
- A unique Jitsi Meet room is automatically generated
- The room name includes booking details for easy identification
- The meeting URL is stored in the booking data
- Email notifications include the video call link

### 2. Booking Confirmation
When a host confirms a pending booking:
- The existing Jitsi Meet link remains active
- Email notifications are sent with the video call information
- Google Calendar events (if connected) include the meeting link
- A "Join Video Call" button appears in the booking details

### 3. Meeting Access
Users can join meetings by:
- Clicking the "Join Video Call" button in the booking dashboard
- Using the link from email notifications
- Copying the link and sharing it with others

## Technical Implementation

### Core Service
- **Location**: `src/lib/jitsiMeet.ts`
- **Main Class**: `JitsiMeetService`
- **Instance**: `jitsiMeetService` (singleton)

### Key Functions
```typescript
// Generate a meeting room for a booking
generateMeetingRoom(booking) -> JitsiMeetRoom

// Validate a Jitsi Meet URL
validateMeetingUrl(url) -> boolean

// Create direct join URLs with pre-filled names
generateDirectJoinUrl(url, displayName, isHost) -> string
```

### Database Fields
New fields added to the `Booking` interface:
- `jitsiMeetUrl?: string` - The meeting URL
- `jitsiRoomName?: string` - The room identifier
- `jitsiPassword?: string` - Optional room password

### Integration Points

#### 1. Booking Form (`src/components/booking/BookingForm.tsx`)
- Generates Jitsi Meet link when creating new bookings
- Updates booking document with meeting details
- Includes video call info in confirmation emails

#### 2. Booking History (`src/components/dashboard/BookingHistory.tsx`)
- Shows "Join Video Call" button for confirmed bookings
- Generates meeting links when confirming pending bookings
- Includes video call URL when copying booking details

#### 3. Email Service (`src/app/api/email/emailService.server.ts`)
- Updated email templates to include video call sections
- Shows prominent "Join Video Call" buttons in confirmation emails
- Includes meeting links in both guest and status update emails

#### 4. Email Routes
- **Confirmation**: `src/app/api/email/confirmation/route.ts`
- **Status Update**: `src/app/api/email/status-update/route.ts`

## Configuration

The Jitsi Meet service can be configured in `src/lib/jitsiMeet.ts`:

```typescript
const jitsiMeetService = new JitsiMeetService({
  domain: 'meet.jit.si',           // Jitsi server domain
  roomPrefix: 'schedulo',          // Prefix for room names
  enableRecording: false,          // Enable recording (requires auth)
  enableTranscription: false,      // Enable transcription
  requirePassword: false,          // Require room passwords
});
```

## Room Naming Convention

Jitsi Meet rooms are named using this pattern:
```
{roomPrefix}-{date}-{time}-{userHash}-{bookingHash}
```

Example: `schedulo-2025-08-07-1000-a1b2-c3d4e5`

Where:
- `schedulo` = room prefix
- `2025-08-07` = booking date
- `1000` = booking time (10:00 AM)
- `a1b2` = hash of user ID
- `c3d4e5` = hash of booking ID

## Testing

Use the test utility to verify the integration:

```typescript
import { testJitsiMeetIntegration } from '@/utils/testJitsiMeet';

// Run comprehensive test
testJitsiMeetIntegration().then(result => {
  console.log('Test results:', result);
});

// Or use browser console
window.testJitsiMeet.runTest();
```

## Email Templates

### Guest Confirmation Email
- Shows meeting details with video call link
- Includes prominent "Join Video Call" button
- Provides tips for first-time users

### Status Update Email
- Displays video call information for confirmed bookings
- Includes direct join link in booking details

### Google Calendar Integration
- Video call links are included in calendar event descriptions
- Calendar events show meeting URL in the event details

## User Experience

### For Guests
1. Book a meeting through the scheduling page
2. Receive confirmation email with video call link
3. Get reminder email before the meeting (if enabled)
4. Click "Join Video Call" to enter the meeting room

### For Hosts
1. Receive booking notification with meeting details
2. Confirm booking (generates/keeps video call link)
3. Access meeting through dashboard "Join Video Call" button
4. Share meeting link with additional participants if needed

## Advantages Over Google Meet

1. **No Authentication Required**: Works without Google accounts
2. **Open Source**: No vendor lock-in or API limitations
3. **Privacy Focused**: Self-hosted option available
4. **Simpler Integration**: No complex OAuth flows
5. **Deterministic URLs**: Predictable meeting room names
6. **Browser Compatible**: Works across all modern browsers

## Future Enhancements

Potential improvements:
- Custom Jitsi Meet server deployment
- Meeting recording integration
- Waiting room functionality
- Meeting moderation features
- Integration with calendar reminders
- Mobile app deep linking

## Migration Notes

If migrating from Google Meet:
1. Existing bookings without Jitsi Meet URLs will not have video call buttons
2. New bookings and booking confirmations will automatically include Jitsi Meet links
3. Google Calendar integration still works for calendar events
4. Email templates have been updated to show video call information

## Troubleshooting

### Common Issues

1. **Video Call Button Not Showing**
   - Check if booking status is "confirmed"
   - Verify booking has `jitsiMeetUrl` field in database

2. **Meeting Link Not Working**
   - Ensure URL starts with `https://meet.jit.si/`
   - Check browser permissions for camera/microphone

3. **Email Not Including Video Call Info**
   - Verify email service is passing `jitsiMeetUrl` parameter
   - Check email template rendering in browser

### Debug Mode

Enable debug logging by checking browser console for:
- `Jitsi Meet room generated:` messages
- `Video Call Link Created` notifications
- Email service debug output
