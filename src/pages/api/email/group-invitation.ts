import { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail } from '@/app/api/email/emailService.server';

interface GroupInvitationRequest {
  organizer: {
    name: string;
    email: string;
  };
  attendee: {
    name: string;
    email: string;
  };
  meeting: {
    id: string;
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    meetingLink?: string;
    duration: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('📧 Group invitation API called with method:', req.method);
  
  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📧 Group invitation API request body:', req.body);
    const { organizer, attendee, meeting }: GroupInvitationRequest = req.body;

    console.log('📧 Received group invitation request:', { 
      organizerName: organizer?.name,
      attendeeEmail: attendee?.email, 
      meetingTitle: meeting?.title
    });

    if (!organizer || !attendee || !meeting) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: organizer, attendee, and meeting are required' });
    }

    // Format dates
    const startDate = new Date(meeting.startTime);
    const endDate = new Date(meeting.endTime);
    const dateStr = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = `${startDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    // Create email HTML content using the same style as simple bookings
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Group Meeting Invitation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .meeting-details { background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; margin-bottom: 10px; }
          .detail-label { font-weight: 600; min-width: 100px; color: #4a5568; }
          .detail-value { color: #2d3748; }
          .footer { background-color: #edf2f7; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
          .calendar-note { background-color: #e6fffa; border-left: 4px solid #38b2ac; padding: 15px; margin: 20px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Group Meeting Invitation</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">You're invited to join a group meeting</p>
          </div>
          
          <div class="content">
            <p>Hello ${attendee.name},</p>
            
            <p><strong>${organizer.name}</strong> has invited you to a group meeting:</p>
            
            <div class="meeting-details">
              <h3 style="margin-top: 0; color: #2d3748;">${meeting.title}</h3>
              
              ${meeting.description ? `<p style="color: #4a5568; margin-bottom: 20px;">${meeting.description}</p>` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📅 Date:</span>
                <span class="detail-value">${dateStr}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">🕐 Time:</span>
                <span class="detail-value">${timeStr}</span>
              </div>
              
              <div class="detail-row">
                <span class="detail-label">⏱️ Duration:</span>
                <span class="detail-value">${meeting.duration} minutes</span>
              </div>
              
              ${meeting.location ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Location:</span>
                  <span class="detail-value">${meeting.location}</span>
                </div>
              ` : ''}
              
              ${meeting.meetingLink ? `
                <div class="detail-row">
                  <span class="detail-label">🔗 Join Link:</span>
                  <span class="detail-value"><a href="${meeting.meetingLink}" style="color: #667eea;">${meeting.meetingLink}</a></span>
                </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">👤 Organizer:</span>
                <span class="detail-value">${organizer.name} (${organizer.email})</span>
              </div>
            </div>

            <div class="calendar-note">
              <strong>📅 Calendar Reminder:</strong> Please add this meeting to your calendar. 
              If you need to reschedule or cancel, please contact ${organizer.name} directly.
            </div>
            
            <p style="text-align: center; color: #718096; font-size: 14px;">
              Please contact ${organizer.name} at ${organizer.email} if you have any questions.
            </p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent by the Smart Scheduling System</p>
            <p>Powered by Schedulo</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Use the proven email service from simple bookings
    console.log('📤 Sending email using proven email service...');
    const emailResult = await sendEmail({
      to: attendee.email,
      subject: `Group Meeting Invitation: ${meeting.title}`,
      html: htmlContent,
      from: `"${organizer.name}" <${process.env.SMTP_USER || 'notifications@schedulo.app'}>`
    });

    if (emailResult.success) {
      console.log(`✅ Group invitation email sent successfully to ${attendee.email}`);
      console.log('📧 Email result:', emailResult);
      
      res.status(200).json({ 
        success: true, 
        message: 'Group meeting invitation sent successfully',
        messageId: emailResult.messageId,
        previewUrl: emailResult.previewUrl // For development testing
      });
    } else {
      console.error(`❌ Failed to send group invitation email to ${attendee.email}:`, emailResult.error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to send group meeting invitation',
        details: emailResult.error
      });
    }

  } catch (error) {
    console.error('❌ Group invitation API error:', error);
    res.status(500).json({ 
      error: 'Failed to send group meeting invitation',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
