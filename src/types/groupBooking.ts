// Remove unused import - we define our own GroupBookingStatus enum

export interface GroupBooking {
  id: string;
  groupId: string;
  organizerId: string; // User who organized the meeting
  organizerEmail?: string; // Organizer's email
  organizerName?: string; // Organizer's name
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes (minimum 15, maximum 480)
  timezone: string;
  status: GroupBookingStatus;
  attendees: GroupAttendee[];
  meetingType: MeetingType;
  assignedMember?: string; // For round-robin meetings
  location?: string;
  meetingLink?: string; // For virtual meetings
  agenda?: string;
  // Jitsi Meet integration fields
  jitsiMeetUrl?: string;
  jitsiRoomName?: string;
  jitsiPassword?: string;
  createdAt: Date;
  updatedAt: Date;
  googleCalendarEventId?: string;
  reminderSent?: boolean;
}

export interface GroupAttendee {
  email: string;
  name: string;
  status: AttendeeStatus;
  responseTime?: Date;
  notes?: string;
}

export enum GroupBookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export enum AttendeeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}

export interface GroupMeetingRequest {
  groupId: string;
  organizerEmail: string;
  organizerName: string;
  title: string;
  description?: string;
  preferredDate: Date;
  duration: number; // in minutes (minimum 15, maximum 480)
  meetingType: MeetingType;
  location?: string;
  meetingLink?: string;
  agenda?: string;
  requiredAttendees?: string[]; // Emails of required attendees
  optionalAttendees?: string[]; // Emails of optional attendees
}

export interface GroupAvailabilitySlot {
  start: Date;
  end: Date;
  availableMembers: string[]; // Member emails
  totalMembers: number;
  day: DayOfWeek;
  confidence: AvailabilityConfidence; // Based on how many members are available
}

// Add proper type definitions for better type safety
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type AvailabilityConfidence = 'high' | 'medium' | 'low';
export type MeetingType = 'collective' | 'round-robin';
export type OrganizationType = 'company' | 'society' | 'club' | 'team' | 'other';
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'other';
export type DigestFrequency = 'immediate' | 'daily' | 'weekly' | 'never';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type MonthlyPattern = 'date' | 'day';
export type ConflictType = 'member_unavailable' | 'time_conflict' | 'resource_conflict';
export type BookingEventType = 'booking_created' | 'booking_updated' | 'booking_cancelled' | 'response_received';

// Event data types for type safety
export interface GroupBookingEventData {
  booking?: Partial<GroupBooking>;
  attendee?: Partial<GroupAttendee>;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface MeetingInvitation {
  id: string;
  bookingId: string;
  attendeeEmail: string;
  token: string; // Unique token for responding
  expiresAt: Date;
  createdAt: Date;
}

export interface MeetingResponse {
  invitationId: string;
  attendeeEmail: string;
  status: AttendeeStatus;
  notes?: string;
  responseTime: Date;
}

// For organizations and societies
export interface OrganizationSettings {
  id: string;
  groupId: string;
  organizationName: string;
  organizationType: OrganizationType;
  defaultMeetingDuration: number;
  requireApproval: boolean; // Whether meetings need admin approval
  allowExternalGuests: boolean;
  defaultLocation?: string;
  defaultMeetingLink?: string;
  emailTemplate?: {
    subject?: string;
    header?: string;
    footer?: string;
  };
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  adminEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingTemplate {
  id: string;
  groupId: string;
  name: string;
  title: string;
  description?: string;
  duration: number;
  agenda?: string;
  defaultLocation?: string;
  defaultMeetingLink?: string;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Additional utility types for better type safety
export interface GroupMeetingSlot {
  id: string;
  groupId: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  assignedMember?: string; // For round-robin
  availableMembers: string[]; // For collective
  isBooked: boolean;
  bookingId?: string;
}

export interface GroupSchedulePreference {
  groupId: string;
  preferredDays: DayOfWeek[];
  preferredTimeRanges: {
    start: string; // HH:MM
    end: string; // HH:MM
  }[];
  minimumNotice: number; // hours
  maximumAdvanceBooking: number; // days
  allowWeekends: boolean;
  timezone: string;
}

export interface MeetingConflict {
  type: ConflictType;
  message: string;
  affectedMembers?: string[];
  suggestedAlternatives?: GroupAvailabilitySlot[];
}

export interface GroupMeetingAnalytics {
  groupId: string;
  totalMeetings: number;
  averageDuration: number;
  memberParticipation: {
    [memberEmail: string]: {
      meetingsAttended: number;
      meetingsOrganized: number;
      averageResponseTime: number; // hours
      responseRate: number; // percentage
    };
  };
  popularTimeSlots: {
    timeSlot: string;
    frequency: number;
  }[];
  meetingFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// Event types for real-time updates
export interface GroupBookingEvent {
  type: BookingEventType;
  bookingId: string;
  groupId: string;
  timestamp: Date;
  data: GroupBookingEventData;
}

// Notification preferences
export interface GroupNotificationSettings {
  groupId: string;
  memberEmail: string;
  emailNotifications: {
    newMeetingInvitations: boolean;
    meetingReminders: boolean;
    meetingCancellations: boolean;
    responseUpdates: boolean;
  };
  reminderTiming: {
    beforeMeeting: number[]; // minutes before meeting [15, 60, 1440]
  };
  digestFrequency: DigestFrequency;
}

// Integration types
export interface CalendarIntegration {
  groupId: string;
  memberEmail: string;
  provider: CalendarProvider;
  accessToken?: string;
  refreshToken?: string;
  calendarId?: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
}

export interface MeetingRecurrence {
  type: RecurrenceType;
  interval: number; // every N days/weeks/months
  endDate?: Date;
  occurrences?: number;
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  monthlyPattern?: MonthlyPattern; // repeat on same date or same day of month
}

// Utility types for validation and constraints
export interface ValidationConstraints {
  minDuration: 15; // minutes
  maxDuration: 480; // minutes (8 hours)
  maxAdvanceBooking: 365; // days
  minNoticeHours: 1; // hours
  maxAttendeesPerMeeting: 100;
  tokenExpirationDays: 7;
}

// Helper types for better type safety
export type EmailAddress = string; // Could be branded type in the future
export type TimeString = string; // HH:MM format
export type DateString = string; // ISO date string
export type UUID = string; // UUID format

// Status union types for easier checking
export type BookingStatusType = keyof typeof GroupBookingStatus;
export type AttendeeStatusType = keyof typeof AttendeeStatus;

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface BookingValidationResult extends ValidationResult {
  conflicts?: MeetingConflict[];
  suggestions?: GroupAvailabilitySlot[];
}

// All interfaces and types are already exported above with 'export' keyword
// Enums are also already exported, so no need for additional export block
