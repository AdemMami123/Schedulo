'use client';

import { ClockIcon, CalendarIcon, UserGroupIcon } from '@heroicons/react/24/outline';

export function BookingHistory() {
  return (
    <div className="space-y-8">
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mb-6">
          <ClockIcon className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Booking History
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          View and manage all your past and upcoming bookings. This feature is coming soon!
        </p>
        <div className="mt-8 flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <CalendarIcon className="h-4 w-4" />
            <span>Past Bookings</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <UserGroupIcon className="h-4 w-4" />
            <span>Upcoming Meetings</span>
          </div>
        </div>
      </div>
    </div>
  );
}
