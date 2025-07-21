'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface AvailabilitySetupPromptProps {
  userEmails: string[];
  onClose?: () => void;
}

export default function AvailabilitySetupPrompt({ userEmails, onClose }: AvailabilitySetupPromptProps) {
  const router = useRouter();

  const handleSetupAvailability = () => {
    // Navigate to dashboard and set the view to availability
    router.push('/dashboard');
    // Note: We'll need to implement view switching in the dashboard
  };

  return (
    <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
          <CalendarDaysIcon className="h-6 w-6" />
          <span>Setup Required: Member Availability</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Group members need to set up their availability
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              To view group availability, all members must first configure their weekly schedules.
            </p>
            
            <div className="space-y-3">
              <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                Members who need to set up availability:
              </h4>
              <div className="space-y-2">
                {userEmails.map((email) => (
                  <div key={email} className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">
                        {email.split('@')[0]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {email}
                      </p>
                    </div>
                    <div className="text-orange-500">
                      <ClockIcon className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
          <h4 className="font-medium text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span>How to set up availability:</span>
          </h4>
          <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex items-start space-x-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
              <span>Go to Dashboard → Availability Settings</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
              <span>Configure your weekly schedule by enabling days and setting time slots</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
              <span>Save your settings to make them available for group scheduling</span>
            </li>
          </ol>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-600">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-700"
          >
            Close
          </Button>
          <Button
            onClick={handleSetupAvailability}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CalendarDaysIcon className="h-4 w-4 mr-2" />
            Set Up My Availability
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
