'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Overview } from './Overview';
import { AvailabilitySettings } from './AvailabilitySettings';
import { BookingSettings } from './BookingSettings';
import { BookingHistory } from './BookingHistory';
import { AccountsList } from '@/components/accounts/AccountsList';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { 
  Bars3Icon, 
  MagnifyingGlassIcon,
  SparklesIcon,
  FireIcon,
  ChartBarIcon,
  TrophyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/Card';
import { NotificationContainer } from '@/components/ui/Notification';
import { useNotifications } from '@/contexts/NotificationContext';

export type DashboardView = 'overview' | 'availability' | 'booking-settings' | 'history' | 'accounts';

export function Dashboard() {
  const { userProfile } = useAuth();
  const { notifications, removeNotification } = useNotifications();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'availability':
        return <AvailabilitySettings />;
      case 'booking-settings':
        return <BookingSettings />;
      case 'history':
        return <BookingHistory />;
      case 'accounts':
        return <AccountsList />;
      default:
        return <Overview />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'overview':
        return 'Dashboard Overview';
      case 'availability':
        return 'Availability Settings';
      case 'booking-settings':
        return 'Booking Settings';
      case 'history':
        return 'Booking History';
      case 'accounts':
        return 'All Accounts';
      default:
        return 'Dashboard Overview';
    }
  };

  const getViewDescription = () => {
    switch (currentView) {
      case 'overview':
        return 'Monitor your schedule performance and booking insights';
      case 'availability':
        return 'Set your weekly availability and working hours';
      case 'booking-settings':
        return 'Configure your booking preferences and settings';
      case 'history':
        return 'View and manage your booking history';
      case 'accounts':
        return 'View all user accounts and their booking links';
      default:
        return 'Monitor your schedule performance and booking insights';
    }
  };

  const getViewIcon = () => {
    switch (currentView) {
      case 'overview':
        return <ChartBarIcon className="h-6 w-6" />;
      case 'availability':
        return <SparklesIcon className="h-6 w-6" />;
      case 'booking-settings':
        return <FireIcon className="h-6 w-6" />;
      case 'history':
        return <TrophyIcon className="h-6 w-6" />;
      case 'accounts':
        return <UserGroupIcon className="h-6 w-6" />;
      default:
        return <ChartBarIcon className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-500">
      <div className="flex">
        <Sidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />
        
        <main className="flex-1 lg:ml-64">
          {/* Enhanced Top Header Bar - Mobile Responsive */}
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              {/* Mobile menu button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex items-center justify-center p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 hover:scale-105"
                >
                  <span className="sr-only">Open main menu</span>
                  <Bars3Icon className="h-6 w-6" />
                </button>
              </div>

              {/* Mobile Page Title */}
              <div className="lg:hidden flex-1 mx-4">
                <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                  {getViewTitle()}
                </h1>
              </div>

              {/* Desktop Page Title */}
              <div className="hidden lg:flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  {getViewIcon()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {getViewTitle()}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {getViewDescription()}
                  </p>
                </div>
              </div>

              {/* Right side actions */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Mobile Search Button */}
                <button className="lg:hidden p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>

                {/* Desktop Search */}
                <div className="relative hidden lg:block">
                  <input
                    type="text"
                    placeholder="Search bookings, settings..."
                    className="w-72 pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-all duration-200 backdrop-blur-sm"
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-3" />
                </div>

                {/* Enhanced Notifications */}
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Enhanced Main Content - Mobile Responsive */}
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Enhanced Welcome Section - Mobile Responsive */}
            <div className="relative overflow-hidden">
              <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 backdrop-blur-3xl"></div>
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

                <CardContent className="p-4 sm:p-6 lg:p-8 relative z-10">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                    <div className="space-y-3 sm:space-y-5 flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-blue-100">
                          You're online
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                          Hello, {userProfile?.displayName}! 👋
                        </h2>
                        <p className="text-blue-100 text-sm sm:text-base lg:text-lg font-medium leading-relaxed">
                          Welcome to your personal scheduling HQ — define your availability, share your link, and let others book you effortlessly.
                          <br className="hidden sm:block" />
                          <span className="block sm:inline">It's like Calendly, but smarter. 🧠</span>
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                          <span className="text-blue-100">12 bookings this week</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                          <span className="text-blue-100">3 pending</span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden sm:block lg:block">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 hover:scale-105 transition-transform duration-300">
                        <span className="text-3xl sm:text-4xl lg:text-5xl">📆</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content with enhanced animations */}
            <div className="animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
      
      {/* Notification Container */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
}
