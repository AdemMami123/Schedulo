'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, WeeklyAvailability } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Switch } from '@/components/ui/Switch';
import { 
  ClockIcon, 
  CalendarIcon, 
  PlusIcon, 
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  monday: { enabled: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
  tuesday: { enabled: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
  wednesday: { enabled: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
  thursday: { enabled: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
  friday: { enabled: true, timeSlots: [{ start: '09:00', end: '17:00' }] },
  saturday: { enabled: false, timeSlots: [] },
  sunday: { enabled: false, timeSlots: [] },
};

export function AvailabilitySettings() {
  const { userProfile } = useAuth();
  const { addNotification } = useNotifications();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [availability, setAvailability] = useState<WeeklyAvailability>(DEFAULT_AVAILABILITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!userProfile) return;

    try {
      const profileDoc = await getDoc(doc(db, 'userProfiles', userProfile.id));
      
      if (profileDoc.exists()) {
        const profileData = profileDoc.data() as UserProfile;
        setProfile(profileData);
        setAvailability(profileData.weeklyAvailability || DEFAULT_AVAILABILITY);
        setTimezone(profileData.timezone || 'UTC');
        setDefaultDuration(profileData.defaultMeetingDuration || 30);
        setBufferBefore(profileData.bufferTimeBefore || 0);
        setBufferAfter(profileData.bufferTimeAfter || 0);
      } else {
        // Create default profile
        const defaultProfile: Partial<UserProfile> = {
          userId: userProfile.id,
          timezone: userProfile.timezone || 'UTC',
          defaultMeetingDuration: 30,
          bufferTimeBefore: 0,
          bufferTimeAfter: 0,
          weeklyAvailability: DEFAULT_AVAILABILITY,
          publicBookingEnabled: true,
          bookingPageTitle: `Book a meeting with ${userProfile.displayName}`,
          bookingPageDescription: 'Select a time that works for you.',
          googleCalendarConnected: false,
        };

        await setDoc(doc(db, 'userProfiles', userProfile.id), {
          ...defaultProfile,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setProfile(defaultProfile as UserProfile);
        setAvailability(DEFAULT_AVAILABILITY);
        setTimezone(defaultProfile.timezone || 'UTC');
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

  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const handleDayToggle = (day: keyof WeeklyAvailability, enabled: boolean) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled,
        timeSlots: enabled && prev[day].timeSlots.length === 0
          ? [{ start: '09:00', end: '17:00' }]
          : prev[day].timeSlots
      }
    }));
  };

  const handleTimeSlotChange = (day: keyof WeeklyAvailability, index: number, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const addTimeSlot = (day: keyof WeeklyAvailability) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: [
          ...prev[day].timeSlots,
          { start: '09:00', end: '17:00' }
        ]
      }
    }));
  };

  const removeTimeSlot = (day: keyof WeeklyAvailability, index: number) => {
    setAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        timeSlots: prev[day].timeSlots.filter((_, i) => i !== index)
      }
    }));
  };

  const validateTimeSlot = (start: string, end: string): boolean => {
    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);
    return endTime > startTime;
  };

  const handleSave = async () => {
    if (!userProfile) return;      // Validate all time slots
      for (const day of DAYS_OF_WEEK) {
        const dayAvailability = availability[day];
        if (dayAvailability.enabled) {
          for (const slot of dayAvailability.timeSlots) {
            if (!validateTimeSlot(slot.start, slot.end)) {
              setSaveStatus('error');
              addNotification({
                type: 'error',
                title: 'Invalid Time Slot',
                message: `Invalid time slot for ${capitalizeFirst(day)}: End time must be after start time.`,
                duration: 0, // No floating toast
                persistent: true,
              });
              return;
            }
          }
        }
      }

    setSaving(true);
    setSaveStatus('idle');

    try {
      console.log('Saving availability for user:', userProfile.id);
      console.log('Availability data:', availability);
      console.log('Profile data:', { timezone, defaultDuration, bufferBefore, bufferAfter });

      // Create the complete profile data structure
      const profileData = {
        id: userProfile.id,
        userId: userProfile.id,
        timezone,
        defaultMeetingDuration: defaultDuration,
        bufferTimeBefore: bufferBefore,
        bufferTimeAfter: bufferAfter,
        weeklyAvailability: availability,
        publicBookingEnabled: profile?.publicBookingEnabled ?? true,
        bookingPageTitle: profile?.bookingPageTitle ?? `Book a meeting with ${userProfile.displayName}`,
        bookingPageDescription: profile?.bookingPageDescription ?? 'Select a time that works for you.',
        googleCalendarConnected: profile?.googleCalendarConnected ?? false,
        updatedAt: serverTimestamp(),
        ...(profile?.createdAt ? {} : { createdAt: serverTimestamp() }),
      };

      console.log('Complete profile data to save:', profileData);

      // Save to userProfiles collection
      await setDoc(doc(db, 'userProfiles', userProfile.id), profileData, { merge: true });
      
      console.log('Successfully saved to Firebase');

      // Update local state
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
        message: 'Your availability settings have been saved successfully!',
        duration: 2000, // Hide after 2 seconds
        persistent: true,
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving availability:', error);
      console.error('Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        userProfileId: userProfile.id,
      });
      setSaveStatus('error');
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save availability settings. Please try again.',
        duration: 0, // No floating toast for errors, only in bell
        persistent: true,
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Availability Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Configure your weekly availability and booking preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200",
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
              <CheckCircleIcon className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <div className={cn(
          "flex items-center space-x-2 p-4 rounded-xl",
          saveStatus === 'success' 
            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
        )}>
          {saveStatus === 'success' ? (
            <CheckCircleIcon className="h-5 w-5" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5" />
          )}
          <span>
            {saveStatus === 'success' 
              ? "Availability settings saved successfully!"
              : "Failed to save settings. Please try again."
            }
          </span>
        </div>
      )}

      {/* General Settings */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ClockIcon className="h-6 w-6 text-blue-500" />
            <span>General Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Default Meeting Duration
              </label>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Buffer Time Before
              </label>
              <select
                value={bufferBefore}
                onChange={(e) => setBufferBefore(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Buffer Time After
              </label>
              <select
                value={bufferAfter}
                onChange={(e) => setBufferAfter(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Availability */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-purple-500" />
            <span>Weekly Availability</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {DAYS_OF_WEEK.map((day) => {
              const dayAvailability = availability[day];
              
              return (
                <div key={day} className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {capitalizeFirst(day)}
                    </h3>
                    <Switch
                      checked={dayAvailability.enabled}
                      onChange={(enabled) => handleDayToggle(day, enabled)}
                    >
                      <span className="sr-only">Enable {day}</span>
                    </Switch>
                  </div>

                  {dayAvailability.enabled && (
                    <div className="space-y-4">
                      {dayAvailability.timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => handleTimeSlotChange(day, index, 'start', e.target.value)}
                              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                            <span className="text-slate-500 dark:text-slate-400 font-medium">to</span>
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => handleTimeSlotChange(day, index, 'end', e.target.value)}
                              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            />
                          </div>
                          
                          {dayAvailability.timeSlots.length > 1 && (
                            <button
                              onClick={() => removeTimeSlot(day, index)}
                              className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button
                        onClick={() => addTimeSlot(day)}
                        className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>Add time slot</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
