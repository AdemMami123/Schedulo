'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface GoogleCalendarConnectProps {
  userProfile: any;
  onConnect: () => Promise<void>;
  loading: boolean;
}

export function GoogleCalendarConnect({ userProfile, onConnect, loading }: GoogleCalendarConnectProps) {
  const [browserIssue, setBrowserIssue] = useState(false);
  const [manualUrl, setManualUrl] = useState<string>('');

  const handleConnect = async () => {
    try {
      await onConnect();
    } catch (error) {
      console.error('Connection failed:', error);
      
      // Check if it's a blocking issue
      if (error instanceof Error && 
          (error.message.includes('blocked') || 
           error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
           error.message.includes('Failed to fetch'))) {
        setBrowserIssue(true);
        
        // Generate manual URL for fallback
        try {
          const response = await fetch('/api/auth/google-calendar', {
            headers: { 'x-user-id': userProfile?.uid || '' }
          });
          const data = await response.json();
          if (data.url) {
            setManualUrl(data.url);
          }
        } catch (urlError) {
          console.error('Failed to get manual URL:', urlError);
        }
      }
    }
  };

  const openManualConnection = () => {
    if (manualUrl) {
      // Try multiple methods
      try {
        window.location.href = manualUrl;
      } catch (error) {
        try {
          window.open(manualUrl, '_blank', 'noopener,noreferrer');
        } catch (popupError) {
          // Final fallback - copy to clipboard
          navigator.clipboard?.writeText(manualUrl).then(() => {
            alert('OAuth URL copied to clipboard. Please paste it in a new tab.');
          });
        }
      }
    }
  };

  if (browserIssue) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Connection Blocked
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Your browser or ad blocker is preventing the Google Calendar connection.
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Please try:
              </p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-400 list-disc list-inside space-y-1">
                <li>Disable ad blockers for this site</li>
                <li>Allow popups for this domain</li>
                <li>Use the manual connection below</li>
              </ul>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button
                onClick={handleConnect}
                size="sm"
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Try Again
              </Button>
              {manualUrl && (
                <Button
                  onClick={openManualConnection}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Manual Connection
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={loading}
      className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
    >
      <CalendarDaysIcon className="h-5 w-5" />
      <span>{loading ? 'Connecting...' : 'Connect Google Calendar'}</span>
    </Button>
  );
}
