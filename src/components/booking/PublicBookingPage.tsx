'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { googleCalendarService } from '@/lib/googleCalendar';
import { User, UserProfile, AvailableSlot } from '@/types';
import { generateTimeSlots, formatDate, formatTime } from '@/lib/utils';
import { CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { BookingForm } from './BookingForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface PublicBookingPageProps {
  username: string;
}

export function PublicBookingPage({ username }: PublicBookingPageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, [username]);

  useEffect(() => {
    if (selectedDate && profile) {
      generateAvailableSlots();
    }
  }, [selectedDate, profile]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Find user by username
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '==', username.toLowerCase())
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        setError('User not found');
        return;
      }

      const userData = usersSnapshot.docs[0].data() as User;
      setUser({ ...userData, id: usersSnapshot.docs[0].id });

      // Load user profile
      const profileDoc = await getDoc(doc(db, 'userProfiles', usersSnapshot.docs[0].id));
      
      if (!profileDoc.exists()) {
        setError('Profile not found');
        return;
      }

      const profileData = profileDoc.data() as UserProfile;
      
      if (!profileData.publicBookingEnabled) {
        setError('Public booking is not enabled for this user');
        return;
      }

      setProfile(profileData);
      
      // Set default selected date to today
      setSelectedDate(new Date());
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = async () => {
    if (!selectedDate || !profile) return;

    try {
      const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayAvailability = profile.weeklyAvailability[dayOfWeek as keyof typeof profile.weeklyAvailability];

      if (!dayAvailability.enabled || dayAvailability.timeSlots.length === 0) {
        setAvailableSlots([]);
        return;
      }

      const slots: AvailableSlot[] = [];
      
      for (const timeSlot of dayAvailability.timeSlots) {
        const slotTimes = generateTimeSlots(
          timeSlot.start,
          timeSlot.end,
          profile.defaultMeetingDuration,
          profile.bufferTimeBefore + profile.bufferTimeAfter
        );

        for (const timeString of slotTimes) {
          const [hours, minutes] = timeString.split(':').map(Number);
          const slotStart = new Date(selectedDate);
          slotStart.setHours(hours, minutes, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + profile.defaultMeetingDuration);

          // Don't show past slots
          if (slotStart <= new Date()) {
            continue;
          }

          // Check for conflicts with existing bookings
          const existingBookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', user?.id),
            where('startTime', '<=', slotEnd),
            where('endTime', '>', slotStart),
            where('status', '==', 'confirmed')
          );

          const existingBookings = await getDocs(existingBookingsQuery);
          if (!existingBookings.empty) {
            continue; // Skip this slot if there's a conflict
          }

          // Check Google Calendar conflicts if connected
          if (profile.googleCalendarConnected) {
            try {
              const isAvailable = await googleCalendarService.checkAvailability(
                slotStart,
                slotEnd
              );
              if (!isAvailable) {
                continue; // Skip this slot if there's a calendar conflict
              }
            } catch (error) {
              console.error('Error checking Google Calendar availability:', error);
              // Continue with the slot if we can't check calendar
            }
          }

          slots.push({
            start: slotStart,
            end: slotEnd,
            duration: profile.defaultMeetingDuration,
          });
        }
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Error generating available slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setShowBookingForm(true);
  };

  const handleBookingComplete = () => {
    setShowBookingForm(false);
    setSelectedSlot(null);
    generateAvailableSlots(); // Refresh available slots
  };

  const getNextAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Oops!</h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (showBookingForm && selectedSlot && user && profile) {
    return (
      <BookingForm
        user={user}
        profile={profile}
        selectedSlot={selectedSlot}
        onComplete={handleBookingComplete}
        onCancel={() => setShowBookingForm(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="compact" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center space-x-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-16 h-16 rounded-full ring-2 ring-gray-200 dark:ring-gray-600"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile?.bookingPageTitle || `Book a meeting with ${user?.displayName}`}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {profile?.bookingPageDescription || 'Select a time that works for you.'}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  <span>{profile?.defaultMeetingDuration} minutes</span>
                </div>
                <div className="flex items-center">
                  <CalendarDaysIcon className="w-4 h-4 mr-1" />
                  <span>{profile?.timezone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Date Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select a Date</h3>
            <div className="grid grid-cols-2 gap-2">
              {getNextAvailableDates().map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    selectedDate?.toDateString() === date.toDateString()
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(date)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Available Times
              {selectedDate && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  for {formatDate(selectedDate)}
                </span>
              )}
            </h3>
            
            {!selectedDate ? (
              <p className="text-gray-500 text-sm">Please select a date first</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-gray-500 text-sm">No available times for this date</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.start.toISOString()}
                    onClick={() => handleSlotSelect(slot)}
                    className="p-3 text-center rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {formatTime(slot.start)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {slot.duration} min
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by <span className="font-medium text-blue-600">Schedulo</span></p>
        </div>
      </div>
    </div>
  );
}
