import { NextRequest, NextResponse } from 'next/server';
import { sendBookingConfirmationEmail, sendHostNotificationEmail, sendBookingStatusUpdateEmail, EmailResult } from '@/app/api/email/emailService.server';

// Simple in-memory store for rate limiting
// In production, you would use Redis or another distributed store
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute
const ipRequestCounts: Record<string, { count: number; resetTime: number }> = {};

// Helper function to validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to check rate limits
const checkRateLimit = (ip: string): { allowed: boolean; message?: string } => {
  const now = Date.now();
  
  // Initialize or reset if window has passed
  if (!ipRequestCounts[ip] || now > ipRequestCounts[ip].resetTime) {
    ipRequestCounts[ip] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }
  
  // Increment and check
  ipRequestCounts[ip].count++;
  
  if (ipRequestCounts[ip].count > RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      message: `Rate limit exceeded. Try again in ${Math.ceil((ipRequestCounts[ip].resetTime - now) / 1000)} seconds.`
    };
  }
  
  return { allowed: true };
};

export const POST = async (req: NextRequest) => {
  try {
    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') ||
               req.cookies.get('user-ip')?.value ||
               'unknown';
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.message },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const data = await req.json();
    const { host, guest, selectedSlot, status, jitsiMeetUrl } = data;

    // Detailed validation with specific error messages
    if (!host) {
      return NextResponse.json(
        { error: 'Host information is required' },
        { status: 400 }
      );
    }

    if (!guest) {
      return NextResponse.json(
        { error: 'Guest information is required' },
        { status: 400 }
      );
    }

    if (!guest.email || !isValidEmail(guest.email)) {
      return NextResponse.json(
        { error: 'Valid guest email is required' },
        { status: 400 }
      );
    }

    if (!guest.name || guest.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Guest name is required' },
        { status: 400 }
      );
    }

    if (!selectedSlot) {
      return NextResponse.json(
        { error: 'Selected time slot information is required' },
        { status: 400 }
      );
    }

    if (!selectedSlot.start || !selectedSlot.end || !selectedSlot.duration) {
      return NextResponse.json(
        { error: 'Selected time slot must include start, end, and duration' },
        { status: 400 }
      );
    }

    // Convert dates if they are strings
    if (typeof selectedSlot.start === 'string') {
      selectedSlot.start = new Date(selectedSlot.start);
    }
    
    if (typeof selectedSlot.end === 'string') {
      selectedSlot.end = new Date(selectedSlot.end);
    }

    // Validate dates
    if (isNaN(selectedSlot.start.getTime()) || isNaN(selectedSlot.end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format in selected time slot' },
        { status: 400 }
      );
    }

    // Determine if this is a new booking or a status update
    const isNewBooking = !status || status === 'pending';
    
    let guestEmailResult: EmailResult;
    
    if (isNewBooking) {
      // Send booking confirmation (pending) email to the guest
      guestEmailResult = await sendBookingConfirmationEmail(host, guest, selectedSlot, 'pending', jitsiMeetUrl);
    } else {
      // Send status update email for existing booking
      guestEmailResult = await sendBookingStatusUpdateEmail(
        host, 
        guest, 
        {
          startTime: new Date(selectedSlot.start),
          endTime: new Date(selectedSlot.end),
          duration: selectedSlot.duration,
          status: status,
          jitsiMeetUrl: jitsiMeetUrl
        }
      );
    }

    // Send notification email to the host for new bookings
    let hostEmailResult: EmailResult = { success: false };
    if (isNewBooking && host.email && isValidEmail(host.email)) {
      hostEmailResult = await sendHostNotificationEmail(host, guest, selectedSlot, 'pending');
      if (!hostEmailResult.success) {
        console.error('Failed to send notification email to host:', hostEmailResult.error || 'Unknown error');
      }
    }

    // Build detailed response
    const response = { 
      success: guestEmailResult.success || hostEmailResult.success,
      details: {
        guest: {
          email: guest.email,
          sent: guestEmailResult.success,
          messageId: guestEmailResult.messageId || null,
          error: guestEmailResult.error ? String(guestEmailResult.error) : null
        },
        host: {
          email: host.email || null,
          sent: hostEmailResult.success,
          messageId: hostEmailResult.messageId || null,
          error: hostEmailResult.error ? String(hostEmailResult.error) : null
        }
      }
    };

    // Return appropriate status code
    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to send emails',
          details: response.details
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in email confirmation API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
