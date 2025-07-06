import { auth } from '@/lib/firebase';

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

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private accessToken: string | null = null;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Get the access token from Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        this.accessToken = token;
      }
    } catch (error) {
      console.error('Error initializing Google Calendar service:', error);
    }
  }

  public async getAccessToken(): Promise<string | null> {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    try {
      // Check if user has Google Calendar access
      const providerData = currentUser.providerData.find(
        provider => provider.providerId === 'google.com'
      );
      
      if (!providerData) return null;

      // Get fresh token
      const token = await currentUser.getIdToken(true);
      this.accessToken = token;
      return token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  public async createEvent(event: CalendarEvent, calendarId: string = 'primary'): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            sendNotifications: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const createdEvent = await response.json();
      return createdEvent.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }
  }

  public async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...event,
            sendNotifications: true,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return false;
    }
  }

  public async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return false;
    }
  }

  public async getEvents(
    calendarId: string = 'primary',
    timeMin?: string,
    timeMax?: string
  ): Promise<CalendarEvent[]> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const params = new URLSearchParams({
        singleEvents: 'true',
        orderBy: 'startTime',
        ...(timeMin && { timeMin }),
        ...(timeMax && { timeMax }),
      });

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  public async checkAvailability(
    startTime: Date,
    endTime: Date,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      const events = await this.getEvents(
        calendarId,
        startTime.toISOString(),
        endTime.toISOString()
      );

      // Check if there are any conflicting events
      return events.length === 0;
    } catch (error) {
      console.error('Error checking availability:', error);
      return true; // Default to available if we can't check
    }
  }

  public async getCalendarList(): Promise<Array<{ id: string; summary: string }>> {
    try {
      const token = await this.getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.items?.map((item: any) => ({
        id: item.id,
        summary: item.summary,
      })) || [];
    } catch (error) {
      console.error('Error fetching calendar list:', error);
      return [];
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
