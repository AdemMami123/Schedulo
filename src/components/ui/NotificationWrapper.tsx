'use client';

import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationContainer } from './Notification';

/**
 * NotificationWrapper - Provides toast notifications throughout the application
 * This component should be included once at the root layout
 */
export function NotificationWrapper() {
  const { toastNotifications, removeNotification } = useNotifications();

  return (
    <NotificationContainer
      notifications={toastNotifications}
      onRemove={removeNotification}
    />
  );
}
