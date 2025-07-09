import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { host, guest, booking } = data;
    
    if (!host || !guest || !booking) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get status-specific content
    let subject = '';
    let message = '';
    
    switch (booking.status) {
      case 'confirmed':
        subject = `Booking Confirmed: Your appointment with ${host.displayName}`;
        message = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #059669; margin: 0;">Your booking has been confirmed!</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Hello ${guest.name},</p>
              <div style="background-color: #DCFCE7; color: #166534; padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; border: 1px solid #22C55E;">
                CONFIRMED
              </div>
              <p>${host.displayName} has confirmed your booking for:</p>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Date:</strong> ${new Date(booking.startTime).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(booking.startTime).toLocaleTimeString()} - ${new Date(booking.endTime).toLocaleTimeString()}</p>
                <p><strong>Duration:</strong> ${booking.duration} minutes</p>
              </div>
              <p>We're looking forward to meeting with you!</p>
              <p>If you need to cancel or reschedule, please contact ${host.displayName} directly.</p>
              <p>Thank you for using Schedulo!</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
              <p>Powered by Schedulo</p>
            </div>
          </div>
        `;
        break;
      
      case 'cancelled':
        subject = `Booking Cancelled: Your appointment with ${host.displayName}`;
        message = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #dc2626; margin: 0;">Your booking has been cancelled</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Hello ${guest.name},</p>
              <div style="background-color: #FEE2E2; color: #991B1B; padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; border: 1px solid #EF4444;">
                CANCELLED
              </div>
              <p>We're sorry to inform you that your booking with ${host.displayName} for ${new Date(booking.startTime).toLocaleDateString()} at ${new Date(booking.startTime).toLocaleTimeString()} has been cancelled.</p>
              <p>If you would like to schedule another appointment, please visit the booking page again.</p>
              <p>Thank you for using Schedulo!</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
              <p>Powered by Schedulo</p>
            </div>
          </div>
        `;
        break;
      
      case 'completed':
        subject = `Booking Completed: Your appointment with ${host.displayName}`;
        message = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #1e40af; margin: 0;">Your booking has been completed</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Hello ${guest.name},</p>
              <div style="background-color: #DBEAFE; color: #1E40AF; padding: 8px 15px; border-radius: 4px; display: inline-block; margin-bottom: 15px; font-weight: bold; border: 1px solid #3B82F6;">
                COMPLETED
              </div>
              <p>Thank you for meeting with ${host.displayName} on ${new Date(booking.startTime).toLocaleDateString()}.</p>
              <p>We hope everything went well with your meeting!</p>
              <p>If you would like to schedule another appointment, please visit the booking page again.</p>
              <p>Thank you for using Schedulo!</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
              <p>Powered by Schedulo</p>
            </div>
          </div>
        `;
        break;
      
      default:
        subject = `Booking Update: Your appointment with ${host.displayName}`;
        message = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #374151; margin: 0;">Your booking status has been updated</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Hello ${guest.name},</p>
              <p>The status of your booking with ${host.displayName} for ${new Date(booking.startTime).toLocaleDateString()} at ${new Date(booking.startTime).toLocaleTimeString()} has been updated to: ${booking.status}.</p>
              <p>Thank you for using Schedulo!</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">
              <p>Powered by Schedulo</p>
            </div>
          </div>
        `;
    }
    
    // Send email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: guest.email,
      subject,
      html: message,
    };
    
    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending status update email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
