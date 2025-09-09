'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/Switch';
import { 
  Cog6ToothIcon, 
  BellIcon, 
  ShareIcon,
  ClockIcon,
  CalendarDaysIcon,
  LinkIcon,
  EyeIcon,
  PaintBrushIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  GlobeAltIcon,
  UserGroupIcon,
  ChatBubbleLeftEllipsisIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'British Time (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Berlin', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const BUFFER_OPTIONS = [
  { value: 0, label: 'No buffer' },
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
];

export function BookingSettings() {
  const { userProfile } = useAuth();
  const { addNotification } = useNotifications();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  // Form state
  const [settings, setSettings] = useState({
    publicBookingEnabled: true,
    bookingPageTitle: '',
    bookingPageDescription: '',
    timezone: 'UTC',
    defaultMeetingDuration: 30,
    bufferTimeBefore: 0,
    bufferTimeAfter: 0,
    autoConfirmBookings: false,
    requireGuestInfo: true,
    allowCancellation: true,
    cancellationNotice: 24, // hours
    maxAdvanceBooking: 30, // days
    minAdvanceBooking: 2, // hours
    enableReminders: true,
    reminderTime: 24, // hours before
    customMessage: '',
    customReminderMessage: '',
    showAvailability: true,
    collectPhoneNumber: false,
    requireApproval: false,
  });

  const loadProfile = useCallback(async () => {
    if (!userProfile) return;

    try {
      const profileDoc = await getDoc(doc(db, 'userProfiles', userProfile.id));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as UserProfile;
        setProfile(profileData);
        setSettings({
          publicBookingEnabled: profileData.publicBookingEnabled ?? true,
          bookingPageTitle: profileData.bookingPageTitle || `Book a meeting with ${userProfile.displayName}`,
          bookingPageDescription: profileData.bookingPageDescription || 'Select a time that works for you.',
          timezone: profileData.timezone || 'UTC',
          defaultMeetingDuration: profileData.defaultMeetingDuration || 30,
          bufferTimeBefore: profileData.bufferTimeBefore || 0,
          bufferTimeAfter: profileData.bufferTimeAfter || 0,
          autoConfirmBookings: profileData.autoConfirmBookings ?? false,
          requireGuestInfo: true,
          allowCancellation: true,
          cancellationNotice: 24,
          maxAdvanceBooking: 30,
          minAdvanceBooking: 2,
          enableReminders: profileData.enableReminders ?? true,
          reminderTime: profileData.reminderTime || 24,
          customMessage: '',
          customReminderMessage: profileData.customReminderMessage || '',
          showAvailability: true,
          collectPhoneNumber: false,
          requireApproval: false,
        });
      } else {
        // Set default values
        setSettings(prev => ({
          ...prev,
          bookingPageTitle: `Book a meeting with ${userProfile.displayName}`,
          timezone: userProfile.timezone || 'UTC',
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      loadProfile();
    }
  }, [userProfile, loadProfile]);

  // Check URL parameters for Google Calendar connection status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      const error = params.get('calendar_error');
      const details = params.get('details');
      
      if (status === 'calendar_connected') {
        addNotification({
          type: 'success',
          title: 'Google Calendar Connected',
          message: 'Your Google Calendar has been successfully connected.',
          duration: 5000,
          persistent: true,
        });
        
        // Clear the status param from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Refresh profile data
        loadProfile();
      } else if (error) {
        let errorMessage = 'Failed to connect Google Calendar. Please try again.';
        
        // Provide more specific error messages
        switch (error) {
          case 'access_denied':
            errorMessage = 'Access was denied. Please grant the necessary permissions to connect your Google Calendar.';
            break;
          case 'token_exchange_failed':
            errorMessage = 'Token exchange failed. Please check your Google OAuth configuration or try again.';
            break;
          case 'missing_tokens':
            errorMessage = 'Missing authentication tokens. Please try connecting again.';
            break;
          case 'user_not_found':
            errorMessage = 'User profile not found. Please refresh the page and try again.';
            break;
          case 'unexpected_error':
            errorMessage = 'An unexpected error occurred. Please check the console for details.';
            if (details) {
              console.error('Google Calendar connection error details:', details);
              try {
                const parsedDetails = JSON.parse(decodeURIComponent(details));
                console.error('Parsed error details:', parsedDetails);
                errorMessage += ` Error: ${parsedDetails.message || 'Unknown error'}`;
              } catch (parseError) {
                console.error('Could not parse error details:', parseError);
              }
            }
            break;
          case 'missing_parameters':
            errorMessage = 'Missing required OAuth parameters. Please try the connection again.';
            break;
          case 'invalid_state':
            errorMessage = 'Invalid OAuth state. Please try connecting again.';
            break;
          default:
            errorMessage = `Connection failed: ${error.replace(/_/g, ' ')}`;
        }
        
        addNotification({
          type: 'error',
          title: 'Google Calendar Connection Failed',
          message: errorMessage,
          duration: 8000,
          persistent: true,
        });
        
        // Clear the error param from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [addNotification, loadProfile]);
  
  const handleSave = async () => {
    if (!userProfile) return;

    setSaving(true);
    setSaveStatus('idle');

    try {
      const profileData = {
        id: userProfile.id,
        userId: userProfile.id,
        timezone: settings.timezone,
        defaultMeetingDuration: settings.defaultMeetingDuration,
        bufferTimeBefore: settings.bufferTimeBefore,
        bufferTimeAfter: settings.bufferTimeAfter,
        publicBookingEnabled: settings.publicBookingEnabled,
        bookingPageTitle: settings.bookingPageTitle,
        bookingPageDescription: settings.bookingPageDescription,
        autoConfirmBookings: settings.autoConfirmBookings,
        enableReminders: settings.enableReminders,
        reminderTime: settings.reminderTime,
        customReminderMessage: settings.customReminderMessage,
        googleCalendarConnected: profile?.googleCalendarConnected ?? false,
        weeklyAvailability: profile?.weeklyAvailability || {},
        updatedAt: serverTimestamp(),
        ...(profile?.createdAt ? {} : { createdAt: serverTimestamp() }),
      };

      await setDoc(doc(db, 'userProfiles', userProfile.id), profileData, { merge: true });
      
      setProfile(prev => ({
        ...prev,
        ...profileData,
        createdAt: prev?.createdAt || new Date(),
        updatedAt: new Date(),
      } as UserProfile));
      
      setSaveStatus('success');
      addNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your booking settings have been saved successfully!',
        duration: 2000, // Hide after 2 seconds
        persistent: true,
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving booking settings:', error);
      setSaveStatus('error');
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save booking settings. Please try again.',
        duration: 0, // No floating toast for errors, only in bell
        persistent: true,
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const copyBookingLink = async () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `${window.location.origin}/schedule/${userProfile.username}`;
    
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      addNotification({
        type: 'success',
        title: 'Link Copied',
        message: 'Booking link copied to clipboard!',
        duration: 2000,
        persistent: false, // Don't keep copy notifications in bell
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy booking link. Please try again.',
        duration: 0, // No floating toast for errors, only in bell
        persistent: true,
      });
    }
  };

  const previewBookingPage = () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `${window.location.origin}/schedule/${userProfile.username}`;
    window.open(bookingUrl, '_blank');
  };

  const handleGoogleCalendarToggle = async () => {
    if (!userProfile) return;

    const newState = !profile?.googleCalendarConnected;

    setSaving(true);
    setSaveStatus('idle');

    try {
      await updateDoc(doc(db, 'userProfiles', userProfile.id), {
        googleCalendarConnected: newState,
        updatedAt: serverTimestamp(),
      });

      setProfile(prev => ({
        ...prev,
        googleCalendarConnected: newState,
        updatedAt: new Date(),
      } as UserProfile));

      setSaveStatus('success');
      addNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your Google Calendar connection settings have been saved successfully!',
        duration: 2000, // Hide after 2 seconds
        persistent: true,
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving Google Calendar settings:', error);
      setSaveStatus('error');
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save Google Calendar settings. Please try again.',
        duration: 0, // No floating toast for errors, only in bell
        persistent: true,
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Function to initiate Google Calendar connection
  const handleConnectGoogleCalendar = async () => {
    try {
      setConnectingCalendar(true);
      
      if (!userProfile?.id) {
        throw new Error('User not authenticated');
      }

      console.log('Initiating Google Calendar connection...');
      
      const response = await fetch('/api/auth/google-calendar', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userProfile.id,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get authorization URL');
      }
      
      const { url } = await response.json();
      
      if (!url) {
        throw new Error('No authorization URL received');
      }

      console.log('Redirecting to Google OAuth...');
      
      // Add a small delay and try different redirect methods
      setTimeout(() => {
        try {
          // Method 1: Direct window.location
          window.location.href = url;
        } catch (error) {
          console.warn('Direct redirect failed, trying window.open...');
          
          // Method 2: Window.open as fallback
          const popup = window.open(url, '_self');
          if (!popup) {
            throw new Error('Popup blocked - please allow popups for this site');
          }
        }
      }, 100);

    } catch (error) {
      console.error('Google Calendar connection error:', error);
      
      // Provide specific error messages for common issues
      let errorMessage = 'Failed to connect to Google Calendar.';
      
      if (error instanceof Error) {
        if (error.message.includes('blocked') || error.message.includes('popup')) {
          errorMessage = 'Connection blocked by browser or ad blocker. Please disable ad blockers and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      addNotification({
        type: 'error',
        title: 'Google Calendar Connection Failed',
        message: errorMessage,
        duration: 8000,
        persistent: true,
      });
    } finally {
      setConnectingCalendar(false);
    }
  };
  
  const handleDisconnectGoogleCalendar = async () => {
    try {
      setConnectingCalendar(true);
      
      if (!userProfile) {
        throw new Error('User profile not found');
      }
      
      // Update the user profile to disconnect Google Calendar
      const profileRef = doc(db, 'userProfiles', userProfile.id);
      await updateDoc(profileRef, {
        googleCalendarConnected: false,
        'googleCalendar.connected': false,
        updatedAt: new Date(),
      });
      
      addNotification({
        type: 'success',
        title: 'Google Calendar Disconnected',
        message: 'Your Google Calendar has been disconnected.',
        duration: 5000,
        persistent: true,
      });
      
      // Refresh profile data
      loadProfile();
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      addNotification({
        type: 'error',
        title: 'Disconnection Failed',
        message: error instanceof Error ? error.message : 'Failed to disconnect Google Calendar',
        duration: 5000,
        persistent: true,
      });
    } finally {
      setConnectingCalendar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Booking Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 text-sm sm:text-base">
            Configure your booking preferences and customize your booking page
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-200 min-h-[44px] touch-target text-sm sm:text-base",
            saving
              ? "bg-slate-400 text-white cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:shadow-lg hover:scale-105"
          )}
        >
          {saving ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className={cn(
          "flex items-center gap-2 p-3 sm:p-4 rounded-xl text-sm sm:text-base",
          saveStatus === 'success' 
            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
        )}>
          {saveStatus === 'success' ? (
            <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          )}
          <span>
            {saveStatus === 'success' 
              ? "Booking settings saved successfully!"
              : "Failed to save booking settings. Please try again."}
          </span>
        </div>
      )}

      {/* Username & Profile Setup */}
      <Card className="border-0 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserGroupIcon className="h-5 w-5 text-green-500" />
            <span>Your Booking Profile</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {!userProfile?.username && (
              <div className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200 text-sm sm:text-base">
                      Username Required
                    </h4>
                    <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      You need to set a username to enable public booking. This will be your unique booking URL.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Your Username
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center flex-1 border border-slate-300 dark:border-slate-600 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <span className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-r border-slate-300 dark:border-slate-600 rounded-l-lg break-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'}/schedule/
                  </span>
                  <input
                    type="text"
                    value={userProfile?.username || ''}
                    disabled
                    className="flex-1 px-2 sm:px-3 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-r-lg focus:outline-none text-sm min-w-0"
                    placeholder="your-username"
                  />
                </div>
                {userProfile?.username && (
                  <div className="flex items-center justify-center sm:justify-start text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="h-5 w-5" />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {userProfile?.username 
                  ? "Your username was automatically generated when you signed up. Contact support if you need to change it."
                  : "Your username will be automatically generated when you complete your profile setup."
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public Booking Page */}
      <Card className="border-0 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GlobeAltIcon className="h-5 w-5 text-blue-500" />
            <span>Public Booking Page</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                Enable Public Booking
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Allow guests to book meetings with you through your public booking page
              </p>
            </div>
            <Switch
              checked={settings.publicBookingEnabled}
              onChange={(checked) => setSettings(prev => ({ ...prev, publicBookingEnabled: checked }))}
            />
          </div>

          {settings.publicBookingEnabled && userProfile?.username && (
            <div className="space-y-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-white text-sm sm:text-base">Your Booking Link</h4>
                  <code className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 break-all">
                    {window.location.origin}/schedule/{userProfile.username}
                  </code>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={copyBookingLink}
                    className="flex items-center justify-center p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors touch-target min-h-[44px] min-w-[44px]"
                    title="Copy booking link"
                  >
                    {copied ? (
                      <span className="text-green-500 text-xs sm:text-sm">✓ Copied!</span>
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={previewBookingPage}
                    className="flex items-center justify-center p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors touch-target min-h-[44px] min-w-[44px]"
                    title="Preview booking page"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Booking Page Title
              </label>
              <input
                type="text"
                value={settings.bookingPageTitle}
                onChange={(e) => setSettings(prev => ({ ...prev, bookingPageTitle: e.target.value }))}
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area"
                placeholder="Book a meeting with..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Booking Page Description
              </label>
              <textarea
                value={settings.bookingPageDescription}
                onChange={(e) => setSettings(prev => ({ ...prev, bookingPageDescription: e.target.value }))}
                rows={3}
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area resize-vertical"
                placeholder="Select a time that works for you..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Defaults */}
      <Card className="border-0 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClockIcon className="h-5 w-5 text-purple-500" />
            <span>Meeting Defaults</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Default Meeting Duration
              </label>
              <select
                value={settings.defaultMeetingDuration}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultMeetingDuration: parseInt(e.target.value) }))}
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area"
              >
                {DURATION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Buffer Time Before
              </label>
              <select
                value={settings.bufferTimeBefore}
                onChange={(e) => setSettings(prev => ({ ...prev, bufferTimeBefore: parseInt(e.target.value) }))}
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area"
              >
                {BUFFER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Buffer Time After
              </label>
              <select
                value={settings.bufferTimeAfter}
                onChange={(e) => setSettings(prev => ({ ...prev, bufferTimeAfter: parseInt(e.target.value) }))}
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area"
              >
                {BUFFER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Policies */}
      <Card className="border-0 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5 text-green-500" />
            <span>Booking Policies</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                  Auto-confirm Bookings
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Automatically confirm new bookings without manual approval
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={settings.autoConfirmBookings}
                  onChange={(checked) => setSettings(prev => ({ ...prev, autoConfirmBookings: checked }))}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                  Require Guest Information
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Require guests to provide their name and email
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={settings.requireGuestInfo}
                  onChange={(checked) => setSettings(prev => ({ ...prev, requireGuestInfo: checked }))}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                  Allow Cancellations
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Allow guests to cancel their bookings
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={settings.allowCancellation}
                  onChange={(checked) => setSettings(prev => ({ ...prev, allowCancellation: checked }))}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                  Collect Phone Numbers
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Require guests to provide their phone number
                </p>
              </div>
              <div className="flex-shrink-0">
                <Switch
                  checked={settings.collectPhoneNumber}
                  onChange={(checked) => setSettings(prev => ({ ...prev, collectPhoneNumber: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-0 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellIcon className="h-5 w-5 text-orange-500" />
            <span>Notifications & Reminders</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                Enable Reminders
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Send reminder emails before meetings
              </p>
            </div>
            <div className="flex-shrink-0">
              <Switch
                checked={settings.enableReminders}
                onChange={(checked) => setSettings(prev => ({ ...prev, enableReminders: checked }))}
              />
            </div>
          </div>

          {settings.enableReminders && (
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Send Reminder
                </label>
                <select
                  value={settings.reminderTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: parseInt(e.target.value) }))}
                  className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area"
                >
                  <option value={1}>1 hour before</option>
                  <option value={24}>24 hours before</option>
                  <option value={48}>48 hours before</option>
                  <option value={72}>3 days before</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Custom Reminder Message
                </label>
                <textarea
                  value={settings.customReminderMessage}
                  onChange={(e) => setSettings(prev => ({ ...prev, customReminderMessage: e.target.value }))}
                  rows={3}
                  className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area resize-vertical"
                  placeholder="Looking forward to our meeting..."
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Optional custom message to include in reminder emails
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Custom Message for Confirmations
            </label>
            <textarea
              value={settings.customMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, customMessage: e.target.value }))}
              rows={3}
              className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-base mobile-safe-area resize-vertical"
              placeholder="Looking forward to our meeting..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      <Card className="border-0 bg-white dark:bg-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-red-500" />
            <span>Google Calendar Integration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-medium text-slate-900 dark:text-white">
                Connect to Google Calendar
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Sync your bookings with Google Calendar
              </p>
            </div>
            <div className="flex-shrink-0">
              <Switch
                checked={profile?.googleCalendarConnected || false}
                onChange={handleGoogleCalendarToggle}
              />
            </div>
          </div>

          {profile?.googleCalendarConnected && (
            <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200 text-sm sm:text-base">
                    Google Calendar Connected
                  </h4>
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 mt-1">
                    Your Google Calendar is connected. Bookings will be synced automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Google Calendar Email
              </label>
              <input
                type="email"
                value={profile?.googleCalendar?.connectedAt ? 'Connected' : ''}
                disabled
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base mobile-safe-area"
                placeholder="Calendar connected"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Calendar Sync Frequency
              </label>
              <select
                value={15}
                disabled
                className="w-full px-3 sm:px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base mobile-safe-area"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {!profile?.googleCalendarConnected ? (
              <button
                onClick={handleConnectGoogleCalendar}
                disabled={connectingCalendar}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2",
                  connectingCalendar
                    ? "bg-slate-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:scale-105"
                )}
              >
                {connectingCalendar ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <LinkIcon className="h-5 w-5" />
                    <span>Connect Google Calendar</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDisconnectGoogleCalendar}
                disabled={connectingCalendar}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2",
                  connectingCalendar
                    ? "bg-slate-400 text-white cursor-not-allowed"
                    : "bg-red-100 text-red-700 hover:bg-red-200"
                )}
              >
                {connectingCalendar ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Cog6ToothIcon className="h-5 w-5" />
                    <span>Disconnect Google Calendar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      {settings.publicBookingEnabled && (
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Ready to Share!
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your booking page is configured and ready to receive bookings
                  </p>
                </div>
              </div>
              <button
                onClick={previewBookingPage}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:shadow-md transition-all duration-200 min-h-[44px] touch-target text-sm sm:text-base"
              >
                <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Preview Page</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
