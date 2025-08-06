import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { formatDateTime } from '@/lib/utils';

// Types
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  timezone: string;
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: any;
  previewUrl?: string;
}

// Initialize Resend if API key is available
const resendApiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Debug logging function to help troubleshoot email issues
const logEmailDebug = (message: string, data?: any) => {
  console.log(`[Email Service] ${message}`, data ? data : '');
};

// Create a transporter for Nodemailer
const createTransporter = async () => {
  // Check for Gmail configuration first
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    logEmailDebug(`Using configured SMTP server: ${process.env.SMTP_HOST}`);
    
    // Log the email configuration (without password)
    logEmailDebug('Email configuration', { 
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER
    });
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        // Do not fail on invalid certificates
        rejectUnauthorized: false
      }
    });
  } else {
    // Development configuration using Ethereal
    logEmailDebug('No SMTP configuration found, using Ethereal test account');
    try {
      const testAccount = await nodemailer.createTestAccount();
      logEmailDebug('Created test account', { user: testAccount.user });
      
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        }
      });
    } catch (error) {
      console.error('Failed to create Ethereal test account:', error);
      throw new Error('Failed to create email transporter');
    }
  }
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export const sendEmail = async ({ to, subject, html, from }: SendEmailOptions): Promise<EmailResult> => {
  // Default from address with a friendly name - Use a realistic address for Gmail to avoid spam filtering
  const fromAddress = from || process.env.SMTP_USER || `"Schedulo" <notifications@schedulo.app>`;
  
  logEmailDebug(`Attempting to send email to ${to}`, { subject });
  
  // Try Resend first if available
  if (resend) {
    try {
      logEmailDebug('Using Resend API');
      const data = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html,
      });
      
      return {
        success: true,
        messageId: (data as any)?.id || 'resend-message',
      };
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      // Fall back to SMTP if Resend fails
    }
  }
  
  // Fall back to SMTP via Nodemailer
  try {
    logEmailDebug('Using SMTP via Nodemailer');
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    
    // If using ethereal, provide preview URL
    const testMessageUrl = info.messageId && info.messageId.includes('ethereal') ? 
                      nodemailer.getTestMessageUrl(info) : undefined;
    
    // Convert the possible boolean value to a string or undefined
    const previewUrl = typeof testMessageUrl === 'string' ? testMessageUrl : undefined;
    
    if (previewUrl) {
      logEmailDebug(`Email preview URL: ${previewUrl}`);
    }
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };
  } catch (error) {
    console.error('Failed to send email via SMTP:', error);
    return {
      success: false,
      error
    };
  }
};

export const sendBookingConfirmationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot,
  status?: string, // Add status parameter
  jitsiMeetUrl?: string // Add Jitsi Meet URL parameter
) => {
  // Adjust subject and content based on booking status
  const isPending = status === 'pending';
  const subject = isPending 
    ? `Pending Booking: Meeting with ${host.displayName}` 
    : `Booking Confirmation: Meeting with ${host.displayName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold; }
        .details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .status { padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; }
        .pending { background-color: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
        .confirmed { background-color: #DCFCE7; color: #166534; border: 1px solid #22C55E; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isPending ? 'Booking Request Received' : 'Booking Confirmation'}</h1>
        </div>
        <div class="content">
          <p>Hello ${guest.name},</p>
          
          ${isPending ? 
            `<div class="status pending">PENDING APPROVAL</div>
            <p>Your meeting request with <strong>${host.displayName}</strong> has been submitted and is pending approval.</p>
            <p>You will receive another email once the host confirms or declines your booking request.</p>`
            : 
            `<div class="status confirmed">CONFIRMED</div>
            <p>Your meeting with <strong>${host.displayName}</strong> has been confirmed!</p>`
          }
          
          <div class="details">
            <p><strong>Date & Time:</strong> ${formatDateTime(selectedSlot.start)}</p>
            <p><strong>Duration:</strong> ${selectedSlot.duration} minutes</p>
            ${jitsiMeetUrl ? `<p><strong>Video Call:</strong> <a href="${jitsiMeetUrl}" target="_blank" style="color: #3b82f6;">Join Jitsi Meet</a></p>` : ''}
            ${guest.notes ? `<p><strong>Your Notes:</strong> ${guest.notes}</p>` : ''}
          </div>
          
          ${jitsiMeetUrl && !isPending ? 
            `<div style="background-color: #e0f2fe; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #0288d1;">
              <h3 style="margin: 0 0 10px 0; color: #0277bd;">🎥 Video Call Information</h3>
              <p style="margin: 0 0 10px 0;">Your meeting includes a video call. Click the link below to join:</p>
              <a href="${jitsiMeetUrl}" target="_blank" class="button" style="background-color: #0288d1;">Join Video Call</a>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #555;">
                💡 Tip: Test your camera and microphone before the meeting. No account required to join.
              </p>
            </div>` 
            : ''
          }
          
          ${isPending ? 
            `<p>Please note that this time slot is tentatively reserved pending host approval.</p>` 
            : 
            `<p>Please add this meeting to your calendar. If you need to reschedule or cancel, please contact ${host.displayName} directly.</p>`
          }
          
          <p>Thank you for using Schedulo!</p>
        </div>
        <div class="footer">
          <p>Powered by Schedulo</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: guest.email,
    subject,
    html,
  });
};

export const sendHostNotificationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot,
  status?: string
) => {
  const isPending = status === 'pending' || status === undefined; // Default to pending if not specified
  const subject = `New Booking Request: ${guest.name} has requested a meeting with you`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold; }
        .details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .status { padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; }
        .pending { background-color: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
        .action-needed { background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #F59E0B; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Meeting Request</h1>
        </div>
        <div class="content">
          <p>Hello ${host.displayName},</p>
          
          <div class="status pending">ACTION REQUIRED</div>
          
          <p><strong>${guest.name}</strong> has requested a meeting with you.</p>
          
          <div class="details">
            <p><strong>Date & Time:</strong> ${formatDateTime(selectedSlot.start)}</p>
            <p><strong>Duration:</strong> ${selectedSlot.duration} minutes</p>
            <p><strong>Guest Email:</strong> ${guest.email}</p>
            ${guest.notes ? `<p><strong>Guest Notes:</strong> ${guest.notes}</p>` : ''}
          </div>
          
          <div class="action-needed">
            <p><strong>This booking is pending your approval.</strong></p>
            <p>Please go to your Schedulo dashboard to confirm or decline this booking request.</p>
            <p>The guest will be automatically notified of your decision.</p>
          </div>
          
          <p>You can view and manage all your bookings from your Schedulo dashboard.</p>
        </div>
        <div class="footer">
          <p>Powered by Schedulo</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: host.email,
    subject,
    html,
  });
};

export const sendBookingStatusUpdateEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  booking: { startTime: Date; endTime: Date; duration: number; status: string; jitsiMeetUrl?: string },
) => {
  const isPending = booking.status.toLowerCase() === 'pending';
  const isConfirmed = booking.status.toLowerCase() === 'confirmed';
  const isCancelled = booking.status.toLowerCase() === 'cancelled';
  const isCompleted = booking.status.toLowerCase() === 'completed';
  
  const subject = isPending
    ? `Booking Request Received: Meeting with ${host.displayName}`
    : isConfirmed
      ? `Booking Confirmed: Meeting with ${host.displayName}`
      : isCancelled
        ? `Booking Cancelled: Meeting with ${host.displayName}`
        : isCompleted
          ? `Meeting Completed: Session with ${host.displayName}`
          : `Booking Status Update: Meeting with ${host.displayName}`;
  
  let statusClass = isPending 
    ? 'pending' 
    : isConfirmed 
      ? 'confirmed' 
      : isCancelled 
        ? 'cancelled' 
        : 'completed';
  
  let statusText = isPending 
    ? 'PENDING APPROVAL' 
    : isConfirmed 
      ? 'CONFIRMED' 
      : isCancelled 
        ? 'CANCELLED' 
        : 'COMPLETED';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px; font-weight: bold; }
        .details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .status { padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; }
        .pending { background-color: #FEF3C7; color: #92400E; border: 1px solid #F59E0B; }
        .confirmed { background-color: #DCFCE7; color: #166534; border: 1px solid #22C55E; }
        .cancelled { background-color: #FEE2E2; color: #991B1B; border: 1px solid #EF4444; }
        .completed { background-color: #DBEAFE; color: #1E40AF; border: 1px solid #3B82F6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking ${statusText}</h1>
        </div>
        <div class="content">
          <p>Hello ${guest.name},</p>
          
          <div class="status ${statusClass}">${statusText}</div>
          
          ${isPending ? 
            `<p>Your meeting request with <strong>${host.displayName}</strong> has been received and is pending approval.</p>
            <p>You will receive another email when your booking is confirmed or cancelled by the host.</p>` 
            : 
            isConfirmed ? 
              `<p>Your meeting request with <strong>${host.displayName}</strong> has been confirmed!</p>
              <p>Please add this meeting to your calendar.</p>`
              : 
              isCancelled ?
                `<p>Your meeting request with <strong>${host.displayName}</strong> has been cancelled.</p>
                <p>If you have any questions, please contact ${host.displayName} directly.</p>`
                :
                `<p>Your meeting with <strong>${host.displayName}</strong> has been marked as completed.</p>
                <p>Thank you for attending!</p>`
          }
          
          <div class="details">
            <p><strong>Date & Time:</strong> ${formatDateTime(booking.startTime)}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            ${booking.jitsiMeetUrl ? `<p><strong>Video Call:</strong> <a href="${booking.jitsiMeetUrl}" target="_blank" style="color: #3b82f6;">Join Jitsi Meet</a></p>` : ''}
            ${guest.notes ? `<p><strong>Your Notes:</strong> ${guest.notes}</p>` : ''}
          </div>
          
          ${booking.jitsiMeetUrl && isConfirmed ? 
            `<div style="background-color: #e0f2fe; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #0288d1;">
              <h3 style="margin: 0 0 10px 0; color: #0277bd;">🎥 Video Call Information</h3>
              <p style="margin: 0 0 10px 0;">Your meeting includes a video call. Click the link below to join:</p>
              <a href="${booking.jitsiMeetUrl}" target="_blank" class="button" style="background-color: #0288d1;">Join Video Call</a>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #555;">
                💡 Tip: Test your camera and microphone before the meeting. No account required to join.
              </p>
            </div>` 
            : ''
          }
          
          ${isPending ?
            `<p>Your request will be reviewed soon. No further action is needed from you at this time.</p>` 
            :
            isConfirmed ? 
              `<p>If you need to reschedule or cancel, please contact ${host.displayName} directly.</p>` 
              : 
              isCancelled ?
                `<p>You can schedule a new meeting through Schedulo at any time.</p>`
                :
                `<p>We hope the meeting was productive!</p>`
          }
          
          <p>Thank you for using Schedulo!</p>
        </div>
        <div class="footer">
          <p>Powered by Schedulo</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: guest.email,
    subject,
    html,
  });
};

export const sendReminderEmail = async (
  {
    host,
    guest,
    booking,
    customMessage
  }: {
    host: User;
    guest: { name: string; email: string; notes?: string };
    booking: { startTime: Date; endTime: Date; duration: number };
    customMessage?: string;
  }
): Promise<EmailResult> => {
  const subject = `Reminder: Upcoming meeting with ${host.displayName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .details { background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .reminder-icon { background-color: #FEF3C7; color: #92400E; padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; border: 1px solid #F59E0B; }
        .custom-message { background-color: #E0F2FE; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #0EA5E9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Meeting Reminder</h1>
        </div>
        <div class="content">
          <p>Hello ${guest.name},</p>
          
          <div class="reminder-icon">📅 REMINDER</div>
          
          <p>This is a friendly reminder about your upcoming meeting with <strong>${host.displayName}</strong>.</p>
          
          <div class="details">
            <p><strong>Date & Time:</strong> ${formatDateTime(booking.startTime)}</p>
            <p><strong>Duration:</strong> ${booking.duration} minutes</p>
            ${guest.notes ? `<p><strong>Your Notes:</strong> ${guest.notes}</p>` : ''}
          </div>
          
          ${customMessage ? `
            <div class="custom-message">
              <p><strong>Message from ${host.displayName}:</strong></p>
              <p>${customMessage}</p>
            </div>
          ` : ''}
          
          <p>Please make sure to be available at the scheduled time. If you need to reschedule or cancel, please contact ${host.displayName} as soon as possible.</p>
          
          <p>Thank you for using Schedulo!</p>
        </div>
        <div class="footer">
          <p>Powered by Schedulo</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  return sendEmail({
    to: guest.email,
    subject,
    html,
  });
};
