import { NextRequest, NextResponse } from 'next/server';
import { sendReminderEmail, EmailResult } from '@/app/api/email/emailService.server';

interface ReminderEmailRequest {
  booking: {
    id: string;
    guestName: string;
    guestEmail: string;
    startTime: string;
    endTime: string;
    duration: number;
    guestNotes?: string;
  };
  host: {
    displayName: string;
    email: string;
  };
  reminderMessage?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ReminderEmailRequest = await request.json();
    
    if (!body.booking || !body.host) {
      return NextResponse.json(
        { error: 'Missing required fields: booking and host are required' },
        { status: 400 }
      );
    }

    console.log('Sending reminder email for booking:', body.booking.id);

    // Send reminder email to guest
    const emailResult: EmailResult = await sendReminderEmail({
      host: body.host,
      guest: {
        name: body.booking.guestName,
        email: body.booking.guestEmail,
        notes: body.booking.guestNotes || ''
      },
      booking: {
        startTime: new Date(body.booking.startTime),
        endTime: new Date(body.booking.endTime),
        duration: body.booking.duration
      },
      customMessage: body.reminderMessage
    });

    if (emailResult.success) {
      console.log('Reminder email sent successfully:', emailResult.messageId);
      return NextResponse.json({
        success: true,
        messageId: emailResult.messageId,
        message: 'Reminder email sent successfully'
      });
    } else {
      console.error('Failed to send reminder email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send reminder email', details: emailResult.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in reminder email API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
