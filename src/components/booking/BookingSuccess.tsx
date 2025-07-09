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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <Card variant="elevated" className="text-center">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="relative">
                <CheckCircleIcon className="w-12 h-12 sm:w-16 sm:h-16 text-green-500" />
                <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Booking Request Submitted!
            </h1>
            
            <div className="flex items-center justify-center mb-3">
              <span className="px-3 py-1 text-xs sm:text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                Pending Approval
              </span>
            </div>
            
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 px-2 sm:px-0">
              Your meeting request with {user.displayName} is pending confirmation.
              You'll receive an email when your booking is confirmed.
            </p>

            <Card variant="bordered" className="bg-gray-50 dark:bg-gray-800/50 mb-4 sm:mb-6">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-center">
                    <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2 sm:mr-3 shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-white text-sm sm:text-base break-words">
                      {formatDateTime(selectedSlot.start)}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      Duration: {selectedSlot.duration} minutes
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="bordered" className={`${emailSent ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-amber-50 dark:bg-amber-900/20'} mb-4 sm:mb-6`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start sm:items-center justify-center">
                  <EnvelopeIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${emailSent ? 'text-blue-500' : 'text-amber-500'} mr-2 sm:mr-3 shrink-0 mt-0.5 sm:mt-0`} />
                  <span className={`text-xs sm:text-sm ${emailSent ? 'text-blue-700 dark:text-blue-300' : 'text-amber-700 dark:text-amber-300'} break-words`}>
                    {emailSent 
                      ? `A confirmation email has been sent to ${guestEmail}`
                      : `We're processing your confirmation email to ${guestEmail}`}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 px-2 sm:px-0">
              <p>
                {user.displayName} will review your booking request and either confirm or decline it.
                Only {user.displayName} can approve booking requests since it's their calendar.
                You'll receive a confirmation email when your booking status is updated.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="px-6 sm:px-8 py-3 text-sm sm:text-base min-h-[44px]"
              >
                Go to Home
              </Button>
              <Button
                onClick={onBackToBooking}
                className="px-6 sm:px-8 py-3 text-sm sm:text-base min-h-[44px]"
              >
                Book Another Meeting
              </Button>
            </div>
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
