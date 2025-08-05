'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  BookmarkIcon, 
  CalendarDaysIcon, 
  ShareIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  SparklesIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface GuideStepProps {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  isCompleted: boolean;
  action?: () => void;
  actionText?: string;
}

const GuideStep = ({ step, title, description, icon: Icon, isCompleted, action, actionText }: GuideStepProps) => (
  <div className="flex items-start space-x-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
    <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
      isCompleted 
        ? 'bg-green-500 text-white' 
        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
    }`}>
      {isCompleted ? (
        <CheckCircleIconSolid className="h-5 w-5" />
      ) : (
        <span className="text-sm font-medium">{step}</span>
      )}
    </div>
    <div className="flex-1">
      <div className="flex items-center space-x-2 mb-2">
        <Icon className="h-5 w-5 text-blue-500" />
        <h3 className="font-medium text-slate-900 dark:text-white">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{description}</p>
      {action && actionText && (
        <button
          onClick={action}
          className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          <span>{actionText}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
);

export function BookingGuide() {
  const { userProfile } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyBookingLink = async () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://schedulo.app'}/schedule/${userProfile.username}`;
    
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const openBookingPage = () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `/schedule/${userProfile.username}`;
    window.location.href = bookingUrl;
  };

  const hasUsername = Boolean(userProfile?.username);
  const hasAvailability = true; // Assume user has set availability
  const hasBookingSettings = true; // Assume user has configured settings

  const steps = [
    {
      step: 1,
      title: 'Set Your Username',
      description: 'Your username creates your unique booking URL that clients will use to book with you.',
      icon: UserGroupIcon,
      isCompleted: hasUsername,
      action: undefined,
      actionText: hasUsername ? undefined : 'Set Username',
    },
    {
      step: 2,
      title: 'Configure Availability',
      description: 'Set your weekly availability so clients know when you\'re free to meet.',
      icon: CalendarDaysIcon,
      isCompleted: hasAvailability,
      action: undefined,
      actionText: 'Set Availability',
    },
    {
      step: 3,
      title: 'Customize Booking Settings',
      description: 'Configure your booking preferences, duration, buffers, and page appearance.',
      icon: BookmarkIcon,
      isCompleted: hasBookingSettings,
      action: undefined,
      actionText: 'Configure Settings',
    },
    {
      step: 4,
      title: 'Share Your Booking Link',
      description: 'Copy your booking URL and share it with clients, or add it to your website and social media.',
      icon: ShareIcon,
      isCompleted: hasUsername,
      action: copyBookingLink,
      actionText: hasUsername ? (copied ? 'Copied!' : 'Copy Link') : 'Complete previous steps',
    },
  ];

  const completedSteps = steps.filter(step => step.isCompleted).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <Card className="border-0 bg-white dark:bg-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-purple-500" />
          <span>Getting Started with Booking</span>
        </CardTitle>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 mb-2">
            <span>Setup Progress</span>
            <span>{completedSteps} of {steps.length} completed</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <GuideStep key={index} {...step} />
        ))}
        
        {completedSteps === steps.length && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
              <CheckCircleIconSolid className="h-5 w-5" />
              <h3 className="font-medium">🎉 You're all set!</h3>
            </div>
            <p className="text-sm text-green-600 dark:text-green-300 mt-2 mb-4">
              Your booking system is ready to go. Clients can now book appointments with you using your booking link.
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={openBookingPage}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
              >
                <EyeIcon className="h-4 w-4" />
                <span>Preview Booking Page</span>
              </button>
              <button
                onClick={copyBookingLink}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                <span>{copied ? 'Copied!' : 'Copy Booking Link'}</span>
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
