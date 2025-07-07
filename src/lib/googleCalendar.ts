import { auth } from '@/lib/firebase';
import { useNotifications } from '@/contexts/NotificationContext';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

// Improved error handling for Google Calendar API errors
class GoogleCalendarError extends Error {
  public readonly code: number;
  public readonly details?: any;
  
  constructor(message: string, code: number = 500, details?: any) {
    super(message);
    this.name = 'GoogleCalendarError';
    this.code = code;
    this.details = details;
  }
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;
  private refreshInProgress: boolean = false;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  private logCalendarAction(action: string, details?: any): void {
    console.log(`[Google Calendar] ${action}`, details ? details : '');
  }

  public async initialize(): Promise<void> {
    try {
      await this.refreshAccessToken();
      this.logCalendarAction('Initialized');
    } catch (error) {
      console.error('Error initializing Google Calendar service:', error);
      throw new GoogleCalendarError('Failed to initialize Google Calendar service', 500, error);
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshInProgress) {
      this.logCalendarAction('Token refresh already in progress');
      return;
    }
    
    try {
      this.refreshInProgress = true;
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        this.logCalendarAction('No user logged in');
        this.accessToken = null;
        return;
      }

      // Check if user has Google Calendar access
      const providerData = currentUser.providerData.find(
        provider => provider.providerId === 'google.com'
      );
      
      if (!providerData) {
        this.logCalendarAction('User not authenticated with Google');
        throw new GoogleCalendarError('User not authenticated with Google', 401);
      }

      // Force token refresh to get a fresh token
      const token = await currentUser.getIdToken(true);
      
      // Set token and its expiry time (Google tokens typically last 1 hour)
      this.accessToken = token;
      this.tokenExpiryTime = Date.now() + 3540 * 1000; // 59 minutes (buffer of 1 min)
      this.logCalendarAction('Access token refreshed');
    } catch (error) {
      console.error('Error refreshing access token:', error);
      this.accessToken = null;
      throw new GoogleCalendarError('Failed to refresh access token', 401, error);
    } finally {
      this.refreshInProgress = false;
    }
  }

  public async getAccessToken(): Promise<string> {
    // If token expired or close to expiry, refresh it
    if (!this.accessToken || Date.now() >= this.tokenExpiryTime - 300000) { // 5 min buffer
      await this.refreshAccessToken();
    }
    
    if (!this.accessToken) {
      throw new GoogleCalendarError('Failed to get access token', 401);
    }
    
    return this.accessToken;
  }

  public async createEvent(event: CalendarEvent, calendarId: string = 'primary'): Promise<string | null> {
    try {
      this.logCalendarAction('Creating calendar event', { summary: event.summary });
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            sendUpdates: 'all', // Send emails to attendees
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GoogleCalendarError(
          `Failed to create event: ${response.statusText}`, 
          response.status, 
          errorData
        );
      }

      const createdEvent = await response.json();
      this.logCalendarAction('Event created successfully', { id: createdEvent.id });
      return createdEvent.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      
      // Check if it's an authorization error and try to refresh token
      if (error instanceof GoogleCalendarError && error.code === 401) {
        this.accessToken = null; // Force token refresh on next attempt
      }
      
      throw error;
    }
  }

  public async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      this.logCalendarAction('Updating calendar event', { eventId });
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            sendUpdates: 'all',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GoogleCalendarError(
          `Failed to update event: ${response.statusText}`, 
          response.status, 
          errorData
        );
      }

      this.logCalendarAction('Event updated successfully', { eventId });
      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      
      // Check if it's an authorization error and try to refresh token
      if (error instanceof GoogleCalendarError && error.code === 401) {
        this.accessToken = null; // Force token refresh on next attempt
      }
      
      throw error;
    }
  }

  public async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<boolean> {
    try {
      this.logCalendarAction('Deleting calendar event', { eventId });
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GoogleCalendarError(
          `Failed to delete event: ${response.statusText}`, 
          response.status, 
          errorData
        );
      }

      this.logCalendarAction('Event deleted successfully', { eventId });
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      
      // Check if it's an authorization error and try to refresh token
      if (error instanceof GoogleCalendarError && error.code === 401) {
        this.accessToken = null; // Force token refresh on next attempt
      }
      
      throw error;
    }
  }

  public async getEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string
  ): Promise<CalendarEvent[]> {
    try {
      this.logCalendarAction('Fetching calendar events', { calendarId, timeMin, timeMax });
      const token = await this.getAccessToken();

      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        ...(timeMin && { timeMin }),
        ...(timeMax && { timeMax }),
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GoogleCalendarError(
          `Failed to fetch events: ${response.statusText}`, 
          response.status, 
          errorData
        );
      }

      const data = await response.json();
      this.logCalendarAction('Fetched events successfully', { count: data.items.length });
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }

  public async checkAvailability(
    startTime: Date,
    endTime: Date,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      this.logCalendarAction('Checking availability', { startTime, endTime });
      const events = await this.getEvents(
        calendarId,
        startTime.toISOString(),
        endTime.toISOString()
      );

      // Check if there are any conflicting events
      const isAvailable = events.length === 0;
      this.logCalendarAction('Availability check completed', { isAvailable });
      return isAvailable;
    } catch (error) {
      console.error('Error checking availability:', error);
      return true; // Default to available if we can't check
    }
  }

  public async getCalendarList(): Promise<Array<{ id: string; summary: string }>> {
    try {
      this.logCalendarAction('Fetching calendar list');
      const token = await this.getAccessToken();

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new GoogleCalendarError(
          `Failed to fetch calendar list: ${response.statusText}`, 
          response.status, 
          errorData
        );
      }

      const data = await response.json();
      const calendars = data.items?.map((item: any) => ({
        id: item.id,
        summary: item.summary,
      })) || [];
      this.logCalendarAction('Fetched calendar list successfully', { count: calendars.length });
      return calendars;
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      throw error;
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
