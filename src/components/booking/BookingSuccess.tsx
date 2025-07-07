'use client';

import { CheckCircleIcon, CalendarDaysIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import { formatDateTime } from '@/lib/utils';
import { User, AvailableSlot } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface BookingSuccessProps {
  user: User;
  selectedSlot: AvailableSlot;
  guestEmail: string;
  emailSent?: boolean;
  onBackToBooking: () => void;
}

export function BookingSuccess({ user, selectedSlot, guestEmail, emailSent = true, onBackToBooking }: BookingSuccessProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card variant="elevated" className="text-center">
          <CardContent className="p-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <CheckCircleIcon className="w-16 h-16 text-green-500" />
                <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Booking Request Submitted!
            </h1>
            
            <div className="flex items-center justify-center mb-3">
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                Pending Approval
              </span>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your meeting request with {user.displayName} is pending confirmation.
              You'll receive an email when your booking is confirmed.
            </p>

            <Card variant="bordered" className="bg-gray-50 dark:bg-gray-800/50 mb-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <CalendarDaysIcon className="w-5 h-5 text-blue-500 mr-3" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedSlot.start)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Duration: {selectedSlot.duration} minutes
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="bordered" className={`${emailSent ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} mb-6`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-center">
                  <EnvelopeIcon className={`w-5 h-5 ${emailSent ? 'text-blue-500' : 'text-amber-500'} mr-3`} />
                  <span className={`text-sm ${emailSent ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {emailSent 
                      ? `A confirmation email has been sent to ${guestEmail}`
                      : `We're processing your confirmation email to ${guestEmail}`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
              <p>
                {user.displayName} will review your booking request shortly.
                You'll receive a confirmation email when your booking is approved.
                If you need to make any changes, please contact {user.displayName} directly.
              </p>
            </div>

            <Button
              onClick={onBackToBooking}
              className="px-8 py-3 text-base"
            >
              Book Another Meeting
            </Button>
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
