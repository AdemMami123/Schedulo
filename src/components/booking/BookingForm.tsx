'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { googleCalendarService } from '@/lib/googleCalendar';
import { User, UserProfile, AvailableSlot, BookingStatus } from '@/types';
import { formatDateTime, isValidEmail } from '@/lib/utils';
import { ArrowLeftIcon, CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { BookingSuccess } from './BookingSuccess';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';

interface BookingFormProps {
  user: User;
  profile: UserProfile;
  selectedSlot: AvailableSlot;
  onComplete: () => void;
  onCancel: () => void;
}

export function BookingForm({ user, profile, selectedSlot, onComplete, onCancel }: BookingFormProps) {
  const { user: currentUser } = useAuth(); // Get the current authenticated user
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    emailSent: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [bookingComplete, setBookingComplete] = useState(false);

  // Auto-populate email and name when component mounts or currentUser changes
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        email: currentUser.email || '',
        name: currentUser.displayName || ''
      }));
    }
  }, [currentUser]);

  // Check if user is authenticated
  const isAuthenticated = !!currentUser;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Notes field is optional - no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Create the booking - check if auto-confirmation is enabled
      const bookingStatus = profile.autoConfirmBookings ? BookingStatus.CONFIRMED : BookingStatus.PENDING;
      
      // Debug logging
      console.log('=== BookingForm Debug ===');
      console.log('Current user (making booking):', {
        uid: currentUser?.uid,
        email: currentUser?.email,
        displayName: currentUser?.displayName
      });
      console.log('Host (calendar owner):', {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      });
      console.log('Guest details:', {
        name: formData.name.trim(),
        email: formData.email.trim()
      });
      
      // IMPORTANT: userId should be the calendar owner's ID (the host)
      // user.id is the ID of the person whose calendar we're booking
      const bookingData = {
        userId: user.id, // This should be the host's ID (calendar owner)
        guestName: formData.name.trim(),
        guestEmail: formData.email.trim(),
        guestNotes: formData.notes.trim() || undefined, // Only include notes if they exist
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        duration: selectedSlot.duration,
        status: bookingStatus,
        timezone: profile.timezone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('Booking data being saved:', bookingData);
      console.log('Booking logic check:', {
        hostId: user.id,
        guestEmail: formData.email.trim(),
        currentUserUid: currentUser?.uid,
        isGuestSameAsHost: user.id === currentUser?.uid,
        shouldShowConfirmButtons: 'Only host should see these buttons',
        bookingWillBeSavedWith: {
          userId: user.id,
          guestEmail: formData.email.trim()
        }
      });

      // CRITICAL: Add validation to prevent user from booking with themselves
      if (user.id === currentUser?.uid) {
        alert('You cannot book with yourself. This booking page is for others to book with you.');
        setLoading(false);
        return;
      }

      // Additional validation: Check if guest email matches host email
      if (formData.email.trim().toLowerCase() === user.email.toLowerCase()) {
        alert('You cannot book with yourself using your own email. This booking page is for others to book with you.');
        setLoading(false);
        return;
      }

      // Add to Firestore
      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);

      // If auto-confirm is enabled and status is CONFIRMED, create Google Calendar event immediately
      if (bookingStatus === BookingStatus.CONFIRMED && profile.googleCalendarConnected) {
        try {
          console.log('Creating Google Calendar event for auto-confirmed booking');
          await googleCalendarService.initializeForUser(user.id);
          
          const calendarEvent = {
            summary: `Meeting with ${formData.name}`,
            description: `Meeting booked through Schedulo.\n\nGuest: ${formData.name}\nEmail: ${formData.email}${formData.notes.trim() ? `\nNotes: ${formData.notes.trim()}` : ''}`,
            start: {
              dateTime: selectedSlot.start.toISOString(),
              timeZone: profile.timezone,
            },
            end: {
              dateTime: selectedSlot.end.toISOString(),
              timeZone: profile.timezone,
            },
            attendees: [
              {
                email: formData.email,
                displayName: formData.name,
              },
            ],
          };

          const eventId = await googleCalendarService.createEvent(calendarEvent);
          if (eventId) {
            console.log('Google Calendar event created:', eventId);
            // Update the booking with the calendar event ID
            await updateDoc(bookingRef, { googleCalendarEventId: eventId });
          }
        } catch (calendarError) {
          console.error('Error creating Google Calendar event:', calendarError);
          // Don't fail the booking if calendar creation fails
        }
      }

      // Send confirmation email
      let emailSentSuccessfully = false;
      
      try {
        const emailResponse = await fetch('/api/email/confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: user,
            guest: {
              name: formData.name,
              email: formData.email,
              notes: formData.notes.trim() || undefined, // Only include notes if they exist
            },
            selectedSlot,
            status: bookingStatus === BookingStatus.CONFIRMED ? 'confirmed' : 'pending' // Pass the correct status
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send confirmation email:', await emailResponse.text());
          // Don't fail the booking if email sending fails
        } else {
          const responseData = await emailResponse.json();
          // Check if either guest or host email was sent
          emailSentSuccessfully = responseData.success || 
                                  (responseData.details && 
                                   (responseData.details.guest?.sent || responseData.details.host?.sent));
          console.log('Confirmation email sent successfully:', responseData);
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the booking if email sending fails
      }

      // Store whether the email was sent in state
      setFormData(prev => ({ 
        ...prev, 
        emailSent: emailSentSuccessfully 
      }));
      
      setBookingComplete(true);
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBackToBooking = () => {
    setBookingComplete(false);
    onComplete();
  };

  if (bookingComplete) {
    return (
      <BookingSuccess
        user={user}
        selectedSlot={selectedSlot}
        guestEmail={formData.email}
        emailSent={formData.emailSent}
        onBackToBooking={handleBackToBooking}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <Card variant="elevated" className="p-0">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="p-2 shrink-0"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 min-w-0 flex-1">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-600 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg truncate">Book with {user.displayName}</CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                      <span className="truncate">{formatDateTime(selectedSlot.start)}</span>
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 shrink-0" />
                      <span>{selectedSlot.duration} minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Your Name *
                  {isAuthenticated && currentUser?.displayName && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-normal">
                      (Pre-filled from your account)
                    </span>
                  )}
                </label>
                <Input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder={isAuthenticated ? "Your name (you can edit this)" : "Enter your full name"}
                  disabled={loading}
                  className="text-base sm:text-sm" // Prevent zoom on iOS
                />
                {isAuthenticated && currentUser?.displayName && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This name is from your account but you can edit it if needed.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Email Address *
                  {isAuthenticated && currentUser?.email && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-normal">
                      (Auto-filled from your account)
                    </span>
                  )}
                </label>
                <Input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  placeholder={isAuthenticated ? "Your email from logged-in account" : "Enter your email address"}
                  disabled={loading}
                  readOnly={isAuthenticated && !!currentUser?.email} // Make read-only if user is authenticated
                  className={`text-base sm:text-sm ${isAuthenticated && currentUser?.email ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed' : ''}`}
                />
                {isAuthenticated && currentUser?.email && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This email is from your logged-in account and cannot be changed.
                  </p>
                )}
                {!isAuthenticated && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Please enter the email address where you'd like to receive booking confirmations.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Additional Notes 
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-base sm:text-sm resize-none"
                  placeholder="Any additional information, agenda items, or special requests... (optional)"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Feel free to leave this blank if you don't have anything specific to add.
                </p>
              </div>

              <Card variant="bordered" className="bg-gray-50 dark:bg-gray-800/50">
                <CardContent className="p-3 sm:p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Meeting Details</h3>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Date & Time:</strong> <span className="break-words">{formatDateTime(selectedSlot.start)}</span></p>
                    <p><strong>Duration:</strong> {selectedSlot.duration} minutes</p>
                    <p><strong>Timezone:</strong> {profile.timezone}</p>
                    <p><strong>With:</strong> <span className="break-words">{user.displayName}</span></p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1 min-h-[44px]" // Ensure good touch target on mobile
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[44px]" // Ensure good touch target on mobile
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by <span className="font-medium text-blue-600 dark:text-blue-400">Schedulo</span></p>
        </div>
      </div>
    </div>
  );
}
