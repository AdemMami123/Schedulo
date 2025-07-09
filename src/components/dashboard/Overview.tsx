'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNotifications } from '@/contexts/NotificationContext';
import { BookingGuide } from './BookingGuide';
import { AllUserLinks } from './AllUserLinks';
import {
  CalendarDaysIcon,
  ClockIcon,
  EyeIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  ShareIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  FireIcon,
  BoltIcon,
  HeartIcon,
  CurrencyDollarIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface StatCardProps {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  prefix?: string;
  suffix?: string;
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  action: () => void;
}

interface DashboardStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalRevenue: number;
  avgRating: number;
  profileViews: number;
  weeklyChange: number;
  revenueChange: number;
  viewsChange: number;
}

interface BookingWithDetails extends Booking {
  displayName: string;
  email: string;
  service: string;
  formattedDate: string;
  formattedTime: string;
  durationString: string;
}

export function Overview() {
  const { userProfile } = useAuth();
  const { addNotification } = useNotifications();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    avgRating: 0,
    profileViews: 0,
    weeklyChange: 0,
    revenueChange: 0,
    viewsChange: 0,
  });
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadDashboardData();
    }
  }, [userProfile, selectedPeriod]);

  const loadDashboardData = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      
      // Calculate date range based on selected period
      const now = new Date();
      const periodStart = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          periodStart.setDate(now.getDate() - 7);
          break;
        case 'month':
          periodStart.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch all bookings for the user
      // Use user.uid to ensure consistency with BookingHistory
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id), // userProfile.id should be same as user.uid
        orderBy('createdAt', 'desc')
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const allBookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Booking[];

      // Filter bookings for the selected period
      const periodBookings = allBookings.filter(booking => 
        booking.createdAt >= periodStart
      );

      // Calculate statistics
      const totalBookings = periodBookings.length;
      const confirmedBookings = periodBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
      const pendingBookings = periodBookings.filter(b => b.status === BookingStatus.PENDING).length;
      const cancelledBookings = periodBookings.filter(b => b.status === BookingStatus.CANCELLED).length;
      const completedBookings = periodBookings.filter(b => b.status === BookingStatus.COMPLETED).length;

      // Calculate revenue (assuming $50 per booking - you can adjust this)
      const totalRevenue = completedBookings * 50;

      // Calculate changes compared to previous period
      const previousPeriodStart = new Date(periodStart);
      
      switch (selectedPeriod) {
        case 'week':
          previousPeriodStart.setDate(previousPeriodStart.getDate() - 7);
          break;
        case 'month':
          previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
          break;
        case 'year':
          previousPeriodStart.setFullYear(previousPeriodStart.getFullYear() - 1);
          break;
      }

      const previousPeriodBookings = allBookings.filter(booking => 
        booking.createdAt >= previousPeriodStart && booking.createdAt < periodStart
      );

      const weeklyChange = previousPeriodBookings.length > 0 
        ? ((totalBookings - previousPeriodBookings.length) / previousPeriodBookings.length) * 100
        : totalBookings > 0 ? 100 : 0;

      const previousRevenue = previousPeriodBookings.filter(b => b.status === BookingStatus.COMPLETED).length * 50;
      const revenueChange = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0 ? 100 : 0;

      // Format recent bookings
      const recentBookingsWithDetails: BookingWithDetails[] = allBookings.slice(0, 5).map(booking => ({
        ...booking,
        displayName: booking.guestName,
        email: booking.guestEmail,
        service: 'Consultation', // Default service name
        formattedDate: booking.startTime.toLocaleDateString(),
        formattedTime: booking.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationString: `${booking.duration} min`,
      }));

      setStats({
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        completedBookings,
        totalRevenue,
        avgRating: 4.8, // Static for now - can be calculated from feedback
        profileViews: Math.floor(totalBookings * 3.2) || 42, // Estimated based on bookings or default
        weeklyChange,
        revenueChange,
        viewsChange: weeklyChange * 0.8, // Estimated relationship
      });

      setRecentBookings(recentBookingsWithDetails);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load dashboard data. Please refresh the page.',
        duration: 0, // No floating toast for errors, only in bell
        persistent: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyBookingLink = async () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://schedulo.app'}/schedule/${userProfile.username}`;
    
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      addNotification({
        type: 'success',
        title: 'Link Copied',
        message: 'Booking link copied to clipboard!',
        duration: 2000,
        persistent: false, // Don't keep copy notifications in bell
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy booking link. Please try again.',
        duration: 0, // No floating toast for errors, only in bell
        persistent: true,
      });
    }
  };

  const testNotification = () => {
    addNotification({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification that will persist in the notification bell!',
      duration: 2000, // Hide after 2 seconds
      persistent: true,
    });
  };

  // Demo booking function removed

  const openBookingPage = () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `/schedule/${userProfile.username}`;
    window.open(bookingUrl, '_blank');
  };

  

  const StatCard = ({ title, value, change, icon: Icon, trend, prefix = '', suffix = '' }: StatCardProps) => (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10"></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {prefix}{value.toLocaleString()}{suffix}
            </p>
            {change !== undefined && change !== 0 && (
              <div className={`flex items-center space-x-1 text-sm ${
                trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {trend === 'up' ? (
                  <ArrowUpIcon className="h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4" />
                )}
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 text-slate-700 dark:text-slate-300">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ActionCard = ({ title, description, icon: Icon, color, action }: ActionCardProps) => (
    <Card className="relative group cursor-pointer hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800" onClick={action}>
      <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl bg-gradient-to-r ${color} text-white group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dashboard Overview
          </h2>
          <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            {['week', 'month', 'year'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedPeriod === period
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Stats Grid */}
        {/* Stats Grid - Mobile Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-white dark:bg-slate-800">
              <CardContent className="p-6 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-300 dark:bg-slate-600 rounded-xl"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-3/4 mb-2"></div>
                    <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Content */}
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Period Selector & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Welcome back, {userProfile?.displayName || 'User'}! 👋
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Here's what's happening with your bookings
          </p>
          {userProfile?.username && (
            <div className="flex items-center space-x-2 mt-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Your booking page:
              </span>
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm font-mono">
                /schedule/{userProfile.username}
              </code>
              <button
                onClick={copyBookingLink}
                className="text-blue-500 hover:text-blue-600 transition-colors"
                title="Copy booking link"
              >
                {copied ? (
                  <span className="text-green-500 text-sm">✓ Copied!</span>
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {['week', 'month', 'year'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Your Booking Link Section */}
      {userProfile?.username && (
        <Card className="border-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <LinkIcon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    🎯 Your Booking Page is Ready!
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Share this link with anyone to let them book time with you
                  </p>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <LinkIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Your booking link:</p>
                      <code className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all">
                        {typeof window !== 'undefined' ? window.location.origin : 'https://schedulo.app'}/schedule/{userProfile.username}
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={copyBookingLink}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-md"
                    >
                      {copied ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="h-4 w-4" />
                          <span className="text-sm">Copy Link</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={openBookingPage}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md"
                    >
                      <EyeIcon className="h-4 w-4" />
                      <span className="text-sm">Preview</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          change={stats.weeklyChange}
          trend={stats.weeklyChange >= 0 ? 'up' : 'down'}
          icon={CalendarDaysIcon}
        />
        <StatCard
          title="Confirmed"
          value={stats.confirmedBookings}
          change={stats.weeklyChange}
          trend={stats.weeklyChange >= 0 ? 'up' : 'down'}
          icon={CheckCircleIcon}
        />
        <StatCard
          title="Revenue"
          value={stats.totalRevenue}
          change={stats.revenueChange}
          trend={stats.revenueChange >= 0 ? 'up' : 'down'}
          icon={CurrencyDollarIcon}
          prefix="$"
        />
        <StatCard
          title="Profile Views"
          value={stats.profileViews}
          change={stats.viewsChange}
          trend={stats.viewsChange >= 0 ? 'up' : 'down'}
          icon={EyeIcon}
        />
      </div>

     

      {/* Recent Bookings and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2">
          <Card className="border-0 bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <FireIcon className="h-5 w-5 text-red-500" />
                <span>Recent Bookings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBookings.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDaysIcon className="h-16 w-16 text-slate-400 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                    No bookings yet
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Share your booking link to start receiving appointments
                  </p>
                  <button
                    onClick={copyBookingLink}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <LinkIcon className="h-5 w-5" />
                    <span>Share Booking Link</span>
                  </button>
                </div>
              ) : (
                recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center space-x-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-200"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                        {booking.displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-base font-medium text-slate-900 dark:text-white truncate">
                          {booking.displayName}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          booking.status === BookingStatus.CONFIRMED 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : booking.status === BookingStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : booking.status === BookingStatus.CANCELLED
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {booking.service} • {booking.email}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <CalendarDaysIcon className="h-3 w-3" />
                          <span>{booking.formattedDate}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{booking.formattedTime}</span>
                        </span>
                        <span>{booking.durationString}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {booking.status === BookingStatus.CONFIRMED ? (
                        <CheckCircleIconSolid className="h-6 w-6 text-green-500" />
                      ) : booking.status === BookingStatus.PENDING ? (
                        <ClockIcon className="h-6 w-6 text-yellow-500" />
                      ) : booking.status === BookingStatus.CANCELLED ? (
                        <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✕</span>
                        </div>
                      ) : (
                        <CheckCircleIconSolid className="h-6 w-6 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          {/* Rating Card */}
          <Card className="border-0 bg-white dark:bg-slate-800">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <StarIconSolid
                      key={star}
                      className={`h-7 w-7 ${
                        star <= Math.floor(stats.avgRating)
                          ? 'text-yellow-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <p className="text-4xl font-bold text-slate-900 dark:text-white">
                    {stats.avgRating.toFixed(1)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Average Rating
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <HeartIcon className="h-4 w-4" />
                  <span>98% positive feedback</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status Breakdown */}
          <Card className="border-0 bg-white dark:bg-slate-800">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-purple-500" />
                <span>Booking Status</span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Confirmed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {stats.confirmedBookings}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({stats.totalBookings > 0 ? Math.round((stats.confirmedBookings / stats.totalBookings) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {stats.pendingBookings}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({stats.totalBookings > 0 ? Math.round((stats.pendingBookings / stats.totalBookings) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {stats.completedBookings}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({stats.totalBookings > 0 ? Math.round((stats.completedBookings / stats.totalBookings) * 100) : 0}%)
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Cancelled</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {stats.cancelledBookings}
                    </span>
                    <span className="text-xs text-slate-500">
                      ({stats.totalBookings > 0 ? Math.round((stats.cancelledBookings / stats.totalBookings) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* All User Booking Links */}
      <AllUserLinks />

      {/* Getting Started Guide */}
      {stats.totalBookings === 0 && (
        <BookingGuide />
      )}
    </div>
  );
}
