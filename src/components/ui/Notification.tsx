'use client';

import { Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

const bgColorMap = {
  success: 'bg-green-50 dark:bg-green-900/20',
  error: 'bg-red-50 dark:bg-red-900/20',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20',
  info: 'bg-blue-50 dark:bg-blue-900/20',
};

const borderColorMap = {
  success: 'border-green-300 dark:border-green-600',
  error: 'border-red-300 dark:border-red-600',
  warning: 'border-yellow-300 dark:border-yellow-600',
  info: 'border-blue-300 dark:border-blue-600',
};

const progressColorMap = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
};

function NotificationItem({ notification, onRemove }: NotificationProps) {
  const [show, setShow] = useState(true);
  const Icon = iconMap[notification.type];

  const handleRemove = () => {
    setShow(false);
    setTimeout(() => onRemove(notification.id), 300);
  };

  // Progress bar animation duration
  const duration = notification.duration || 5000;

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-200"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div 
        className={`max-w-sm w-full shadow-lg rounded-lg pointer-events-auto overflow-hidden backdrop-blur-sm border ${borderColorMap[notification.type]} transform transition-all hover:scale-[1.02] hover:shadow-xl`}
      >
        <div className={`${bgColorMap[notification.type]} p-4 relative`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100 dark:bg-green-800 animate-pulse-slow' : 
                notification.type === 'error' ? 'bg-red-100 dark:bg-red-800' : 
                notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-800' : 
                'bg-blue-100 dark:bg-blue-800'
              }`}>
                <Icon className={`h-5 w-5 ${colorMap[notification.type]}`} aria-hidden="true" />
              </div>
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {notification.title}
              </p>
              {notification.message && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {notification.message}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="rounded-full p-1.5 inline-flex text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                onClick={handleRemove}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full">
            <div 
              className={`h-full ${progressColorMap[notification.type]} animate-shrink`}
              style={{
                animationDuration: `${duration}ms`,
              }}
            />
          </div>
        </div>
      </div>
    </Transition>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationContainer({ notifications, onRemove }: NotificationContainerProps) {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 z-50"
    >
      <div className="w-full flex flex-col items-center space-y-3 sm:items-end">
        {notifications.map((notification, index) => (
          <div 
            key={notification.id}
            className="w-full sm:max-w-sm md:max-w-md notification-item"
            style={{
              animationDelay: `${index * 150}ms`,
            }}
          >
            <NotificationItem
              notification={notification}
              onRemove={onRemove}
            />
          </div>
        ))}
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        .notification-item {
          opacity: 0;
          animation: fadeInSlide 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        @keyframes fadeInSlide {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.95); 
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1); 
          }
        }
        
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        
        .animate-shrink {
          width: 100%;
          animation-name: shrink;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

// Hook for managing notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    const duration = notification.duration || 5000;
    setTimeout(() => {
      removeNotification(id);
    }, duration);

    return id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    removeNotification,
  };
}
