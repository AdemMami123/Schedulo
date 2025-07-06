import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { googleCalendarService } from '@/lib/googleCalendar';

export interface CalendarIntegration {
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  checkAvailability: (startTime: Date, endTime: Date) => Promise<boolean>;
}

export function useGoogleCalendar(): CalendarIntegration {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      const token = await googleCalendarService.getAccessToken();
      setIsConnected(!!token);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      setIsConnected(false);
    }
  };

  const connect = async () => {
    setIsConnecting(true);
    try {
      await googleCalendarService.initialize();
      const token = await googleCalendarService.getAccessToken();
      setIsConnected(!!token);
      
      if (!token) {
        throw new Error('Unable to get access token');
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      // In a real implementation, you would revoke the token here
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      throw error;
    }
  };

  const checkAvailability = async (startTime: Date, endTime: Date): Promise<boolean> => {
    if (!isConnected) return true;
    
    try {
      return await googleCalendarService.checkAvailability(startTime, endTime);
    } catch (error) {
      console.error('Error checking availability:', error);
      return true; // Default to available if we can't check
    }
  };

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    checkAvailability,
  };
}
