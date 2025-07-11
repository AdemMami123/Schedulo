// This file is only for types - actual email sending happens in API routes
// If you're seeing errors about 'child_process', make sure you're not importing this file in a client component
// Instead import from '@/lib/emailService.client' in client components
import { User, AvailableSlot } from '@/types';

// Error message for client-side imports
const CLIENT_ERROR_MESSAGE = 
  'Email services cannot be used on the client side. ' +
  'Use API routes for sending emails or import email types from @/lib/emailService.client';

// Export types
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: any;
  previewUrl?: string;
}

// For client components - this will throw an error if imported directly
export const sendEmail = async (): Promise<EmailResult> => {
  throw new Error(CLIENT_ERROR_MESSAGE);
};

export const sendBookingConfirmationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot,
  status?: string
): Promise<EmailResult> => {
  throw new Error(CLIENT_ERROR_MESSAGE);
};

export const sendHostNotificationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot,
  status?: string
): Promise<EmailResult> => {
  throw new Error(CLIENT_ERROR_MESSAGE);
};

export const sendBookingStatusUpdateEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  booking: { startTime: Date; endTime: Date; duration: number; status: string },
): Promise<EmailResult> => {
  throw new Error(CLIENT_ERROR_MESSAGE);
};
