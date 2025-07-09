'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { CalendarDaysIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline';

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="dropdown" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="py-8 sm:py-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white animate-fade-in">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Schedulo
            </span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto animate-fade-in px-4">
            Smart scheduling made simple. Connect your calendar, set your availability, 
            and let others book time with you effortlessly.
          </p>
        </div>

        {/* Features */}
        <div className="py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm animate-slide-in">
              <div className="flex justify-center mb-4">
                <CalendarDaysIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Calendar Integration
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Connect with Google Calendar to sync your existing events and availability
              </p>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm animate-slide-in" style={{ animationDelay: '100ms' }}>
              <div className="flex justify-center mb-4">
                <ClockIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Smart Scheduling
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Set your availability, buffer times, and let the system handle the rest
              </p>
            </div>
            <div className="text-center p-4 sm:p-6 rounded-lg bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm animate-slide-in" style={{ animationDelay: '200ms' }}>
              <div className="flex justify-center mb-4">
                <UsersIcon className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Easy Booking
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                Share your booking link and let others schedule time with you instantly
              </p>
            </div>
          </div>
        </div>

        {/* Sign In Section */}
        <div className="py-12 sm:py-16 flex justify-center px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Get Started
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Sign in with Google to create your scheduling profile
              </p>
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
            
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              By signing in, you agree to our{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 text-center text-gray-500 dark:text-gray-400">
          <p>&copy; 2024 Schedulo. Built with Next.js and Firebase.</p>
        </footer>
      </div>
    </div>
  );
}
