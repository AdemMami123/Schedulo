'use client';

import { useRef, useState, useEffect } from 'react';
import { BellIcon, CheckIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Transition } from '@headlessui/react';
import { useNotifications } from '@/contexts/NotificationContext';

const iconMap = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const colorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

export function NotificationBell() {
  const { notifications, removeNotification, clearNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [animateCount, setAnimateCount] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (notifications.length > unreadCount) {
      setAnimateCount(true);
      setTimeout(() => setAnimateCount(false), 1000);
    }
    setUnreadCount(notifications.length);
  }, [notifications.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleClearAll = () => {
    clearNotifications();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full transition duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notifications"
      >
        <BellIcon className={`h-6 w-6 ${notifications.length > 0 ? 'text-blue-500 dark:text-blue-400' : ''}`} />
        {unreadCount > 0 && (
          <span 
            className={`absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full bg-gradient-to-r from-blue-500 to-blue-600 border border-white dark:border-gray-800 ${animateCount ? 'animate-ping-short' : ''}`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <div className="absolute right-0 mt-2 w-96 max-w-[90vw] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 border border-gray-200 dark:border-gray-700">
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition duration-200"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="max-h-[70vh] overflow-y-auto py-1 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                <BellIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">No notifications yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You'll see updates here when they arrive</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex p-3 border-l-4 ${
                  notification.type === 'success' ? 'border-green-500' :
                  notification.type === 'error' ? 'border-red-500' :
                  notification.type === 'warning' ? 'border-yellow-500' :
                  'border-blue-500'
                } hover:bg-gray-50 dark:hover:bg-gray-700/50 relative transition-colors`}
              >
                <div className="flex-shrink-0 mr-3">
                  {(() => {
                    const Icon = iconMap[notification.type];
                    return <Icon className={`h-5 w-5 ${colorMap[notification.type]}`} />;
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notification.title}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      {formatTime(notification.timestamp)}
                    </span>
                  </div>
                  {notification.message && (
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                      {notification.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Remove notification"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}
        </div>
      </Transition>

      <style jsx global>{`
        .animate-ping-short {
          animation: ping 1s cubic-bezier(0, 0, 0.2, 1);
        }

        @keyframes ping {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.5);
          }
          100% {
            transform: scale(1);
          }
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background-color: rgba(229, 231, 235, 0.5);
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.7);
          border-radius: 2px;
        }

        .dark .scrollbar-thin::-webkit-scrollbar-track {
          background-color: rgba(55, 65, 81, 0.5);
        }

        .dark .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(107, 114, 128, 0.7);
        }
      `}</style>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const now = new Date().getTime();
  const diff = now - timestamp;
  
  // Less than a minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  
  // Format as date
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
}
