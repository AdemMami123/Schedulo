'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reminderService } from '@/lib/reminderService';

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize reminders when user is authenticated
    if (user) {
      console.log('Initializing reminder service...');
      reminderService.initializeReminders().catch(error => {
        console.error('Error initializing reminders:', error);
      });
    }
  }, [user]);

  return <>{children}</>;
}
