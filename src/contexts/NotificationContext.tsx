'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  persistent?: boolean; // Whether to keep in bell dropdown
}

interface NotificationContextType {
  notifications: Notification[];
  toastNotifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification = { 
      ...notification, 
      id, 
      timestamp: Date.now(),
      persistent: notification.persistent !== false // Default to persistent unless explicitly set to false
    };
    
    // Add to persistent notifications (for bell dropdown)
    setNotifications(prev => [...prev, newNotification]);
    
    // Also add to toast notifications for temporary display
    if (notification.duration !== 0) { // duration of 0 means no toast
      setToastNotifications(prev => [...prev, newNotification]);
      
      // Auto-remove from toast after duration
      const duration = notification.duration || 5000;
      setTimeout(() => {
        setToastNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setToastNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      toastNotifications,
      addNotification,
      removeNotification,
      clearNotifications,
      clearAllNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
