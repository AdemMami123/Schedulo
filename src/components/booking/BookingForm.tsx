'use client';

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { googleCalendarService } from '@/lib/googleCalendar';
import { User, UserProfile, AvailableSlot, BookingStatus } from '@/types';
import { formatDateTime, isValidEmail } from '@/lib/utils';
import { ArrowLeftIcon, CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { BookingSuccess } from './BookingSuccess';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface BookingFormProps {
  user: User;
  profile: UserProfile;
  selectedSlot: AvailableSlot;
  onComplete: () => void;
  onCancel: () => void;
}

export function BookingForm({ user, profile, selectedSlot, onComplete, onCancel }: BookingFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    notes: '',
    emailSent: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [bookingComplete, setBookingComplete] = useState(false);

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
      // Create the booking as PENDING (requires host confirmation)
      const bookingData = {
        userId: user.id,
        guestName: formData.name.trim(),
        guestEmail: formData.email.trim(),
        guestNotes: formData.notes.trim() || undefined,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        duration: selectedSlot.duration,
        status: BookingStatus.PENDING, // Set to PENDING instead of CONFIRMED
        timezone: profile.timezone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add to Firestore but don't add to calendar yet (will be added when confirmed)
      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);

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
              notes: formData.notes || undefined,
            },
            selectedSlot,
            status: 'pending' // Explicitly pass the status as pending
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card variant="elevated" className="p-0">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="p-2"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-600"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">Book with {user.displayName}</CardTitle>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="w-4 h-4 mr-1" />
                      <span>{formatDateTime(selectedSlot.start)}</span>
                    </div>
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      <span>{selectedSlot.duration} minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Your Name *
                </label>
                <Input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={errors.name}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  placeholder="Enter your email address"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="Any additional information you'd like to share..."
                  disabled={loading}
                />
              </div>

              <Card variant="bordered" className="bg-gray-50 dark:bg-gray-800/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Meeting Details</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Date & Time:</strong> {formatDateTime(selectedSlot.start)}</p>
                    <p><strong>Duration:</strong> {selectedSlot.duration} minutes</p>
                    <p><strong>Timezone:</strong> {profile.timezone}</p>
                    <p><strong>With:</strong> {user.displayName}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by <span className="font-medium text-blue-600 dark:text-blue-400">Schedulo</span></p>
        </div>
      </div>
    </div>
  );
}
