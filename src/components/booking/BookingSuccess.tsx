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
  onBackToBooking: () => void;
}

export function BookingSuccess({ user, selectedSlot, guestEmail, onBackToBooking }: BookingSuccessProps) {
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
              Booking Confirmed!
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your meeting with {user.displayName} has been successfully scheduled.
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

            <Card variant="bordered" className="bg-blue-50 dark:bg-blue-900/20 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-center">
                  <EnvelopeIcon className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    A confirmation email has been sent to {guestEmail}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-gray-600 dark:text-gray-400 mb-8">
              <p>
                Please check your email for the meeting details and calendar invitation.
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
