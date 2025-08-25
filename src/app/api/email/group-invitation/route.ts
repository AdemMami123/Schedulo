import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/app/api/email/emailService.server';

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
  
  if (!ipRequestCounts[ip] || now > ipRequestCounts[ip].resetTime) {
    ipRequestCounts[ip] = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
  }
  
  ipRequestCounts[ip].count++;
  
  if (ipRequestCounts[ip].count > RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      message: `Rate limit exceeded. Try again in ${Math.ceil((ipRequestCounts[ip].resetTime - now) / 1000)} seconds.`
    };
  }
  
  return { allowed: true };
};

export async function POST(req: NextRequest) {
  try {
    console.log('📧 Group invitation API called');
    
    // Get client IP for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') ||
               req.cookies.get('user-ip')?.value ||
               'unknown';
    
    // Check rate limit
    const rateLimitCheck = checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateLimitCheck.message },
        { status: 429 }
      );
    }

    const requestBody = await req.json();
    const { organizer, attendee, meeting } = requestBody;

    console.log('📧 Group invitation request:', {
      organizer: organizer?.email,
      attendee: attendee?.email,
      meeting: meeting?.title
    });

    // Validate required fields
    if (!organizer?.email || !organizer?.name || !attendee?.email || !meeting?.title) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: organizer, attendee, and meeting details' },
        { status: 400 }
      );
    }

    // Validate email formats
    if (!isValidEmail(organizer.email) || !isValidEmail(attendee.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Format meeting details for the email
    const startDate = new Date(meeting.startTime);
    const endDate = new Date(meeting.endTime);
    
    const formattedDate = startDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const formattedTime = `${startDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })} - ${endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;

    // Create email content
    const emailSubject = `Group Meeting Invitation: ${meeting.title}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Group Meeting Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; font-size: 28px;">📅 Group Meeting Confirmed</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your group meeting has been scheduled and confirmed</p>
        </div>
        
        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">${meeting.title}</h2>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151; margin-top: 0;">📋 Meeting Details</h3>
            <p><strong>Organizer:</strong> ${organizer.name} (${organizer.email})</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            <p><strong>Duration:</strong> ${meeting.duration} minutes</p>
            ${meeting.description ? `<p><strong>Description:</strong> ${meeting.description}</p>` : ''}
            ${meeting.location ? `<p><strong>Location:</strong> ${meeting.location}</p>` : ''}
          </div>
          
          ${meeting.meetingLink ? `
          <div style="background-color: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #1d4ed8; margin-top: 0;">🎥 Join Video Meeting</h3>
            <p style="margin: 10px 0; color: #1e40af;">Click the link below to join the video meeting at the scheduled time:</p>
            <a href="${meeting.meetingLink}" 
               style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
              Join Meeting Now
            </a>
            <p style="font-size: 12px; color: #6b7280; margin: 10px 0;">
              Meeting Link: <a href="${meeting.meetingLink}" style="color: #3b82f6;">${meeting.meetingLink}</a>
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; margin-bottom: 15px;">This is a group meeting organized through Schedulo</p>
          </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px;">
          <p>This email was sent by Schedulo • Smart Scheduling Made Simple</p>
          <p>If you have any questions, please contact ${organizer.email}</p>
        </div>
      </body>
      </html>
    `;

    // Send the email using the existing email service
    const emailResult = await sendEmail({
      to: attendee.email,
      subject: emailSubject,
      html: emailHtml,
      from: `Schedulo <noreply@schedulo.com>` // You can customize this
    });

    if (emailResult.success) {
      console.log('✅ Group invitation email sent successfully to:', attendee.email);
      return NextResponse.json({
        success: true,
        message: 'Group meeting invitation sent successfully',
        details: {
          to: attendee.email,
          from: organizer.email,
          meeting: meeting.title,
          messageId: emailResult.messageId
        }
      });
    } else {
      console.error('❌ Failed to send group invitation email:', emailResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to send email: ' + emailResult.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Group invitation email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while sending group invitation email' },
      { status: 500 }
    );
  }
}