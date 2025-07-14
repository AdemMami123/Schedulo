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
      const userWithId = { ...userData, id: usersSnapshot.docs[0].id };
      setUser(userWithId);

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
      
      // Find the next available date with configured availability
      const defaultDate = findNextAvailableDate(profileData);
      
      console.log('Setting default date to:', defaultDate);
      console.log('Date has availability config:', dateHasAvailabilityConfig(defaultDate, profileData));
      setSelectedDate(defaultDate);
      
      // Force generate slots after setting both profile and date
      // We need to do this because the useEffect might not trigger properly
      // when both state variables are set in quick succession
      setTimeout(() => {
        if (profileData && defaultDate && userWithId) {
          console.log('Force generating slots for default date');
          generateAvailableSlotsWithParams(profileData, defaultDate, userWithId);
        }
      }, 100);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const generateAvailableSlots = async () => {
    if (!selectedDate || !profile || !user) return;
    await generateAvailableSlotsWithParams(profile, selectedDate, user);
  };

  // Check if a specific date has availability configured (not actual slots, just day config)
  const dateHasAvailabilityConfig = (date: Date, profileData: UserProfile) => {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const dayAvailability = profileData.weeklyAvailability[dayOfWeek as keyof typeof profileData.weeklyAvailability];
    return dayAvailability && dayAvailability.enabled && dayAvailability.timeSlots.length > 0;
  };

  // Find the next available date with configured availability
  const findNextAvailableDate = (profileData: UserProfile) => {
    const today = new Date();
    
    // Check next 14 days
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      // Skip past dates
      if (i === 0) {
        const currentHour = today.getHours();
        // If it's late in the day (after 5 PM), skip today
        if (currentHour >= 17) {
          continue;
        }
      }
      
      if (dateHasAvailabilityConfig(checkDate, profileData)) {
        return checkDate;
      }
    }
    
    // Fallback to tomorrow if no availability found
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  };

  const generateAvailableSlotsWithParams = async (profileData: UserProfile, date: Date, userData?: User) => {
    console.log('=== Generating slots ===');
    console.log('Date:', date);
    console.log('Profile data:', profileData);
    console.log('User data:', userData);
    console.log('Current time:', new Date());
    
    // Use the passed userData or fallback to the state user
    const currentUser = userData || user;
    
    if (!currentUser?.id) {
      console.error('No user data available for slot generation');
      setAvailableSlots([]);
      return;
    }
    
    try {
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      console.log('Day of week:', dayOfWeek);
      
      const dayAvailability = profileData.weeklyAvailability[dayOfWeek as keyof typeof profileData.weeklyAvailability];
      console.log('Day availability:', dayAvailability);

      if (!dayAvailability || !dayAvailability.enabled || dayAvailability.timeSlots.length === 0) {
        console.log('No availability configured for this day');
        setAvailableSlots([]);
        return;
      }

      const slots: AvailableSlot[] = [];
      
      for (const timeSlot of dayAvailability.timeSlots) {
        console.log('Processing time slot:', timeSlot);
        
        const slotTimes = generateTimeSlots(
          timeSlot.start,
          timeSlot.end,
          profileData.defaultMeetingDuration,
          profileData.bufferTimeBefore + profileData.bufferTimeAfter
        );
        
        console.log('Generated slot times:', slotTimes);

        for (const timeString of slotTimes) {
          const [hours, minutes] = timeString.split(':').map(Number);
          const slotStart = new Date(date);
          slotStart.setHours(hours, minutes, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + profileData.defaultMeetingDuration);

          // Don't show past slots - add buffer time for booking
          const now = new Date();
          const minBookingTime = new Date(now.getTime() + (15 * 60 * 1000)); // 15 minutes from now
          if (slotStart <= minBookingTime) {
            console.log('Skipping past slot:', slotStart, 'vs min time:', minBookingTime);
            continue;
          }

          // Check for conflicts with existing bookings
          const existingBookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', currentUser.id),
            where('startTime', '<=', slotEnd),
            where('endTime', '>', slotStart),
            where('status', '==', 'confirmed')
          );

          const existingBookings = await getDocs(existingBookingsQuery);
          if (!existingBookings.empty) {
            console.log('Skipping conflicting slot:', slotStart);
            continue; // Skip this slot if there's a conflict
          }

          // Check Google Calendar conflicts if connected
          if (profileData.googleCalendarConnected && currentUser.id) {
            try {
              // Use the new method that doesn't require current user authentication
              const isAvailable = await googleCalendarService.checkAvailabilityForUser(
                currentUser.id,
                slotStart,
                slotEnd
              );
              if (!isAvailable) {
                console.log('Skipping Google Calendar conflicting slot:', slotStart);
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
            duration: profileData.defaultMeetingDuration,
          });
        }
      }

      console.log('Generated slots count:', slots.length);
      console.log('Generated slots:', slots);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-blue-100 dark:border-blue-900/50 p-12 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/40 to-purple-100/40 dark:from-blue-900/20 dark:to-purple-900/20 opacity-70"></div>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 rounded-xl blur-md opacity-20 animate-pulse"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mb-6 relative">
              <LoadingSpinner size="lg" className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2 text-center">Loading Schedule</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center">Please wait while we fetch availability...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-100 dark:border-red-900/50 p-12 max-w-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-100/40 to-pink-100/40 dark:from-red-900/20 dark:to-pink-900/20 opacity-70"></div>
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Oops!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <a href="/" className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </a>
          </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-indigo-900/20 dark:to-purple-900/20 transition-all duration-300">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="compact" />
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-12">
        {/* Enhanced Header with gradient and subtle animation - Mobile Responsive */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-900/50 backdrop-blur-sm mb-6 sm:mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/40 to-purple-100/40 dark:from-blue-900/20 dark:to-purple-900/20 opacity-70"></div>
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-500"></div>
          
          <div className="relative p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 booking-header-content">
            {user?.photoURL ? (
              <div className="relative booking-header-photo">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-80 blur"></div>
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full ring-4 ring-white dark:ring-gray-800 object-cover"
                />
              </div>
            ) : (
              <div className="relative booking-header-photo">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-80 blur"></div>
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{user?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                </div>
              </div>
            )}
            
            <div className="flex-1 booking-header-info text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                {profile?.bookingPageTitle || `Book a meeting with ${user?.displayName}`}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-base sm:text-lg max-w-2xl">
                {profile?.bookingPageDescription || 'Select a time that works for you.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mt-4 justify-center sm:justify-start booking-header-info">
                <div className="flex items-center px-3 sm:px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                  <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400 mr-2" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{profile?.defaultMeetingDuration} minutes</span>
                </div>
                <div className="flex items-center px-3 sm:px-4 py-2 bg-purple-50 dark:bg-purple-900/30 rounded-full">
                  <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400 mr-2" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{profile?.timezone}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Enhanced Date Selection - Mobile Responsive */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900/50 overflow-hidden backdrop-blur-sm">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <h3 className="text-base sm:text-lg font-semibold">Select a Date</h3>
                <p className="text-xs sm:text-sm text-blue-100">Choose the day for your meeting</p>
              </div>
              
              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-1 gap-2 max-h-[50vh] lg:max-h-[calc(100vh-350px)] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-blue-100 pr-1">
                  {getNextAvailableDates().map((date, index) => {
                    // Check if today
                    const isToday = new Date().toDateString() === date.toDateString();
                    // Check if selected
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    // Check if this day has real availability configured
                    const hasAvailabilityConfig = profile ? dateHasAvailabilityConfig(date, profile) : false;
                    
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`p-3 sm:p-4 flex items-center justify-between rounded-lg transition-all duration-300 ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-[1.02]'
                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-100 dark:border-gray-700'
                        }`}
                        style={{ 
                          animationDelay: `${index * 30}ms`,
                          animation: 'fadeIn 0.4s ease-out forwards'
                        }}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <span className={`font-bold text-base ${
                              isSelected
                                ? 'text-white' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            {isToday && !isSelected && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-md">Today</span>
                            )}
                            {hasAvailabilityConfig && !isSelected && !isToday && (
                              <span className="ml-2 h-2 w-2 rounded-full bg-green-400"></span>
                            )}
                          </div>
                          <span className={`text-sm ${
                            isSelected
                              ? 'text-blue-100' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {formatDate(date)}
                          </span>
                        </div>
                        
                        {isSelected && (
                          <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Time Selection - Mobile Responsive */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-purple-100 dark:border-purple-900/50 overflow-hidden backdrop-blur-sm h-full">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <h3 className="text-base sm:text-lg font-semibold">
                  Available Times
                  {selectedDate && (
                    <span className="ml-2 font-normal text-purple-100 text-xs sm:text-sm block sm:inline">
                      for {formatDate(selectedDate)}
                    </span>
                  )}
                </h3>
                <p className="text-xs sm:text-sm text-purple-100">Select your preferred time slot</p>
              </div>
              
              <div className="p-4 sm:p-6">
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDaysIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">Please select a date from the calendar</p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClockIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No available time slots for this date</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Please select another date</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={slot.start.toISOString()}
                        onClick={() => handleSlotSelect(slot)}
                        className="group relative p-3 sm:p-4 text-center rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-300 hover:shadow-md"
                        style={{ 
                          animationDelay: `${index * 50}ms`,
                          animation: 'fadeIn 0.5s ease-out forwards'
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600 opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300"></div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                          {formatTime(slot.start)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 mt-1 transition-colors">
                          {slot.duration} minutes
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer - Mobile Responsive */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="inline-block px-4 sm:px-6 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              Powered by <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">Schedulo</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
