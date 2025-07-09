export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  timezone: string;
  username?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  timezone: string;
  defaultMeetingDuration: number; // in minutes
  bufferTimeBefore: number; // in minutes
  bufferTimeAfter: number; // in minutes
  weeklyAvailability: WeeklyAvailability;
  publicBookingEnabled: boolean;
  bookingPageTitle: string;
  bookingPageDescription: string;
  autoConfirmBookings?: boolean;
  googleCalendarConnected: boolean;
  googleCalendarId?: string;
  googleCalendar?: {
    connected: boolean;
    accessToken: string;
    refreshToken: string;
    expiryTime: number;
    scope: string;
    connectedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

export interface DayAvailability {
  enabled: boolean;
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface Booking {
  id: string;
  userId: string; // The user who owns the calendar
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
  status: BookingStatus;
  timezone: string;
  googleCalendarEventId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export interface AvailableSlot {
  start: Date;
  end: Date;
  duration: number;
}

export interface BlackoutDate {
  id: string;
  userId: string;
  date: Date;
  title: string;
  description?: string;
  createdAt: Date;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  status: string;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  persistent?: boolean;
}
