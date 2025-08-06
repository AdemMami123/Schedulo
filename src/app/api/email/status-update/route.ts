import { NextRequest, NextResponse } from 'next/server';
import { sendBookingStatusUpdateEmail, EmailResult } from '@/app/api/email/emailService.server';

// Simple in-memory store for rate limiting
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
    const { host, guest, booking } = data;

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

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking information is required' },
        { status: 400 }
      );
    }

    if (!booking.startTime || !booking.endTime || !booking.duration || !booking.status) {
      return NextResponse.json(
        { error: 'Booking must include startTime, endTime, duration, and status' },
        { status: 400 }
      );
    }

    // Convert dates if they are strings
    if (typeof booking.startTime === 'string') {
      booking.startTime = new Date(booking.startTime);
    }
    
    if (typeof booking.endTime === 'string') {
      booking.endTime = new Date(booking.endTime);
    }

    // Validate dates
    if (isNaN(booking.startTime.getTime()) || isNaN(booking.endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format in booking information' },
        { status: 400 }
      );
    }

    // Send status update email to the guest
    const emailResult: EmailResult = await sendBookingStatusUpdateEmail(host, guest, booking);

    // Build response
    const response = { 
      success: emailResult.success,
      details: {
        guest: {
          email: guest.email,
          sent: emailResult.success,
          messageId: emailResult.messageId || null,
          error: emailResult.error ? String(emailResult.error) : null
        }
      }
    };

    // Return appropriate status code
    if (response.success) {
      return NextResponse.json(response);
    } else {
      return NextResponse.json(
        { 
          error: 'Failed to send status update email',
          details: response.details
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in status update email API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
};
