'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Overview } from './Overview';
import { AvailabilitySettings } from './AvailabilitySettings';
import { Groups } from './Groups';
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
import { useBookingStats } from '@/hooks/useBookingStats';

export type DashboardView = 'overview' | 'availability' | 'groups' | 'booking-settings' | 'history' | 'accounts';

export function Dashboard() {
  const { userProfile } = useAuth();
  const { notifications, toastNotifications, removeNotification } = useNotifications();
  const bookingStats = useBookingStats();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <Overview />;
      case 'availability':
        return <AvailabilitySettings />;
      case 'groups':
        return <Groups />;
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
      case 'groups':
        return <UserGroupIcon className="h-6 w-6" />;
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
    <div className="min-h-screen bg-transparent">
      <div className="flex">
        <Sidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />
        
        <main className="flex-1 lg:ml-64">
          {/* Enhanced Top Header Bar - Mobile Responsive */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-20 shadow-lg">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4">
              {/* Mobile menu button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="btn-modern inline-flex items-center justify-center p-2.5 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:scale-105"
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
                <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
                  {getViewIcon()}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
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
                <button className="lg:hidden p-2 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>

                {/* Desktop Search */}
                <div className="relative hidden lg:block">
                  <input
                    type="text"
                    placeholder="Search bookings, settings..."
                    className="input-modern w-72 pl-11 pr-4 py-3 bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-3.5 top-3.5" />
                </div>

                {/* Enhanced Notifications */}
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Enhanced Main Content - Mobile Responsive */}
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Enhanced Welcome Section - Only show on Overview page */}
            {currentView === 'overview' && (
              <div className="relative overflow-hidden animate-slide-up">
                <Card className="glass-card bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white border-none shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-blue-600/20 backdrop-blur-3xl"></div>
                  <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                  <CardContent className="p-6 sm:p-8 lg:p-10 relative z-10">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
                      <div className="space-y-4 sm:space-y-6 flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-sm font-semibold text-blue-100 bg-white/10 px-3 py-1 rounded-full">
                            You're online
                          </span>
                        </div>

                        <div>
                          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight">
                            Hello, {userProfile?.displayName}! 👋
                          </h2>
                          <p className="text-blue-100 text-base sm:text-lg lg:text-xl font-medium leading-relaxed">
                            Welcome to your professional scheduling hub — define your availability, share your link, and let others book you effortlessly.
                            <br className="hidden sm:block" />
                            <span className="block sm:inline">It's like Calendly, but smarter. 🧠</span>
                          </p>
                        </div>

                        {/* Dynamic Booking Stats */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm">
                          {bookingStats.loading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                              <span className="text-blue-100">Loading stats...</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                                <span className="text-blue-100">
                                  {bookingStats.thisWeekBookings} booking{bookingStats.thisWeekBookings !== 1 ? 's' : ''} this week
                                </span>
                              </div>
                              {bookingStats.pendingBookings > 0 && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                                  <span className="text-blue-100">
                                    {bookingStats.pendingBookings} pending
                                  </span>
                                </div>
                              )}
                              {bookingStats.totalBookings > 0 && (
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 bg-blue-300 rounded-full"></div>
                                  <span className="text-blue-100">
                                    {bookingStats.totalBookings} total booking{bookingStats.totalBookings !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
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
            )}

            {/* Content with enhanced animations */}
            <div className="animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>
      
      {/* Notification Container */}
      <NotificationContainer 
        notifications={toastNotifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
}
