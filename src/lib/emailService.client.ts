// This file is only for client-side email service types and stubs
// Actual email sending happens in API routes
import { User, AvailableSlot } from '@/types';

// Types for email service
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

// These functions are implemented server-side in src/app/api/email/emailService.server.ts
// The client code should call API routes instead of using these directly

export const sendBookingConfirmationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot,
  status?: string
): Promise<EmailResult> => {
  throw new Error('This function should not be called client-side. Use API routes instead.');
};

export const sendHostNotificationEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  selectedSlot: AvailableSlot,
  status?: string
): Promise<EmailResult> => {
  throw new Error('This function should not be called client-side. Use API routes instead.');
};

export const sendBookingStatusUpdateEmail = async (
  host: User,
  guest: { name: string; email: string; notes?: string },
  booking: { startTime: Date; endTime: Date; duration: number; status: string },
): Promise<EmailResult> => {
  throw new Error('This function should not be called client-side. Use API routes instead.');
};
