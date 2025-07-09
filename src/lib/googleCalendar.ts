import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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
  private refreshToken: string | null = null;
  private tokenExpiryTime: number = 0;
  private refreshInProgress: boolean = false;
  private userId: string | null = null;

  private constructor() {}

  public static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  // Create a new instance for a specific user (useful for public booking pages)
  public static createForUser(userId: string): GoogleCalendarService {
    const instance = new GoogleCalendarService();
    instance.userId = userId;
    return instance;
  }

  private logCalendarAction(action: string, details?: any): void {
    console.log(`[Google Calendar] ${action}`, details ? details : '');
  }

  public async initialize(userId?: string): Promise<void> {
    try {
      // If userId is provided, use it (for public booking page checks)
      if (userId) {
        this.userId = userId;
      } else {
        // Otherwise, use the current authenticated user
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          this.logCalendarAction('No user logged in');
          throw new GoogleCalendarError('No user logged in', 401);
        }
        
        this.userId = currentUser.uid;
      }
      
      // Load tokens from Firestore
      await this.loadTokensFromFirestore();
      this.logCalendarAction('Initialized');
    } catch (error) {
      console.error('Error initializing Google Calendar service:', error);
      throw new GoogleCalendarError('Failed to initialize Google Calendar service', 500, error);
    }
  }

  // Convenience method to initialize with a specific user ID for server-side operations
  public async initializeForUser(userId: string): Promise<void> {
    return this.initialize(userId);
  }
  
  private async loadTokensFromFirestore(): Promise<void> {
    if (!this.userId) {
      throw new GoogleCalendarError('User ID not set', 401);
    }
    
    try {
      const userProfileRef = doc(db, 'userProfiles', this.userId);
      const userProfileSnapshot = await getDoc(userProfileRef);
      
      if (!userProfileSnapshot.exists()) {
        throw new GoogleCalendarError('User profile not found', 404);
      }
      
      const userData = userProfileSnapshot.data();
      
      // Check if Google Calendar is connected
      if (!userData.googleCalendarConnected || !userData.googleCalendar) {
        throw new GoogleCalendarError('Google Calendar not connected', 403);
      }
      
      const { accessToken, refreshToken, expiryTime } = userData.googleCalendar;
      
      if (!accessToken || !refreshToken) {
        throw new GoogleCalendarError('Missing OAuth tokens', 403);
      }
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.tokenExpiryTime = expiryTime || 0;
      
      // If token is expired or close to expiry, refresh it
      if (Date.now() >= this.tokenExpiryTime - 300000) { // 5 min buffer
        await this.refreshAccessToken();
      }
    } catch (error) {
      console.error('Error loading tokens from Firestore:', error);
      throw error;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.refreshInProgress) {
      this.logCalendarAction('Token refresh already in progress');
      return;
    }
    
    if (!this.refreshToken || !this.userId) {
      throw new GoogleCalendarError('No refresh token or user ID available', 401);
    }
    
    try {
      this.refreshInProgress = true;
      
      const response = await fetch('/api/auth/google-calendar/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          refreshToken: this.refreshToken,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token refresh error:', errorData);
        throw new GoogleCalendarError(
          `Failed to refresh token: ${response.statusText}`,
          response.status,
          errorData
        );
      }
      
      const { accessToken, expiryTime } = await response.json();
      
      // Update tokens in memory
      this.accessToken = accessToken;
      this.tokenExpiryTime = expiryTime;
      
      this.logCalendarAction('Access token refreshed');
    } catch (error) {
      console.error('Error refreshing access token:', error);
      
      // Clear tokens on error
      this.accessToken = null;
      this.refreshToken = null;
      
      throw new GoogleCalendarError('Failed to refresh access token', 401, error);
    } finally {
      this.refreshInProgress = false;
    }
  }

  public async getAccessToken(): Promise<string> {
    try {
      // If token expired or close to expiry, refresh it
      if (!this.accessToken || Date.now() >= this.tokenExpiryTime - 300000) { // 5 min buffer
        await this.loadTokensFromFirestore();
      }
      
      if (!this.accessToken) {
        throw new GoogleCalendarError('Failed to get access token', 401);
      }
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  public async createEvent(event: CalendarEvent, calendarId: string = 'primary'): Promise<string | null> {
    try {
      console.log('GoogleCalendarService: Creating calendar event', { summary: event.summary });
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
        console.error('Google Calendar API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
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

  public async checkAvailabilityForUser(
    userId: string,
    startTime: Date,
    endTime: Date,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      this.logCalendarAction('Checking availability for user', { userId, startTime, endTime });
      
      // Check if the user has Google Calendar connected
      const userProfileRef = doc(db, 'userProfiles', userId);
      const userProfileSnapshot = await getDoc(userProfileRef);
      
      if (!userProfileSnapshot.exists()) {
        this.logCalendarAction('User profile not found for availability check');
        return true; // Default to available if no profile
      }
      
      const userData = userProfileSnapshot.data();
      
      // If Google Calendar is not connected, return available
      if (!userData.googleCalendarConnected || !userData.googleCalendar) {
        this.logCalendarAction('Google Calendar not connected for user');
        return true;
      }
      
      // Initialize with the specific user ID
      await this.initialize(userId);
      
      const events = await this.getEvents(
        calendarId,
        startTime.toISOString(),
        endTime.toISOString()
      );

      // Check if there are any conflicting events
      const isAvailable = events.length === 0;
      this.logCalendarAction('Availability check completed for user', { userId, isAvailable });
      return isAvailable;
    } catch (error) {
      console.error('Error checking availability for user:', error);
      return true; // Default to available if we can't check
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance();
