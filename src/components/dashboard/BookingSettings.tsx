'use client';

import { Cog6ToothIcon, BellIcon, ShareIcon } from '@heroicons/react/24/outline';

export function BookingSettings() {
  return (
    <div className="space-y-8">
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mb-6">
          <Cog6ToothIcon className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Booking Settings
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
          Configure your booking preferences and customize your booking page. This feature is coming soon!
        </p>
        <div className="mt-8 flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <BellIcon className="h-4 w-4" />
            <span>Notifications</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
            <ShareIcon className="h-4 w-4" />
            <span>Public Page</span>
          </div>
        </div>
      </div>
    </div>
  );
}
