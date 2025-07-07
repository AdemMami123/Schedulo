import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { User, AvailableSlot } from '@/types';
import { formatDateTime } from './utils';

// Initialize Resend if API key is available
const resendApiKey = process.env.NEXT_PUBLIC_RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Create a test account using Ethereal for local development
// For production, configure with real SMTP credentials
const createTransporter = async () => {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    // Production configuration with real SMTP settings
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Development configuration using Ethereal
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: any;
}

export type { EmailResult };

export const sendEmail = async ({ to, subject, html, from }: SendEmailOptions): Promise<EmailResult> => {
  try {
    // Default from address
    const fromAddress = from || 'notifications@schedulo.app';
    
    // Try Resend first if available
    if (resend) {
      try {
        const data = await resend.emails.send({
          from: fromAddress,
          to: [to],
          subject,
          html,
        });
        
        console.log('Email sent via Resend:', data);
        return { success: true, messageId: data.data?.id || 'sent' };
      } catch (resendError) {
        console.error('Resend error, falling back to Nodemailer:', resendError);
        // Fall back to Nodemailer
      }
    }
    
    // Use Nodemailer as a fallback
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
    
    console.log('Email sent via Nodemailer:', info.messageId);
    
    // If using Ethereal, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Nodemailer Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
};

export const sendBookingConfirmationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot
) => {
  const subject = `Booking Confirmation: Meeting with ${host.displayName}`;
  
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmation</h1>
        </div>
        <div class="content">
          <p>Hello ${guest.name},</p>
          <p>Your meeting with <strong>${host.displayName}</strong> has been confirmed!</p>
          
          <div class="details">
            <p><strong>Date & Time:</strong> ${formatDateTime(selectedSlot.start)}</p>
            <p><strong>Duration:</strong> ${selectedSlot.duration} minutes</p>
            ${guest.notes ? `<p><strong>Your Notes:</strong> ${guest.notes}</p>` : ''}
          </div>
          
          <p>Please add this meeting to your calendar. If you need to reschedule or cancel, please contact ${host.displayName} directly.</p>
          
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
  selectedSlot: AvailableSlot
) => {
  const subject = `New Booking: ${guest.name} has scheduled a meeting with you`;
  
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Meeting Scheduled</h1>
        </div>
        <div class="content">
          <p>Hello ${host.displayName},</p>
          <p><strong>${guest.name}</strong> has booked a meeting with you.</p>
          
          <div class="details">
            <p><strong>Date & Time:</strong> ${formatDateTime(selectedSlot.start)}</p>
            <p><strong>Duration:</strong> ${selectedSlot.duration} minutes</p>
            <p><strong>Guest Email:</strong> ${guest.email}</p>
            ${guest.notes ? `<p><strong>Guest Notes:</strong> ${guest.notes}</p>` : ''}
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
