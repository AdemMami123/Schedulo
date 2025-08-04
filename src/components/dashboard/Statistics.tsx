'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types';
import { GroupBooking, GroupBookingStatus } from '@/types/groupBooking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  ChartBarIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval, isSameWeek } from 'date-fns';

interface BookingStats {
  totalBookings: number;
  totalGroupBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalRevenue: number;
  averageBookingDuration: number;
  busyDays: { day: string; count: number }[];
  monthlyTrend: { month: string; bookings: number; groupBookings: number }[];
  weeklyTrend: { week: string; bookings: number; groupBookings: number }[];
  topTimeSlots: { time: string; count: number }[];
  groupBookingStats: {
    confirmed: number;
    pending: number;
    cancelled: number;
    completed: number;
  };
  totalAttendees: number;
  averageAttendeesPerGroupBooking: number;
}

export function Statistics() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (userProfile) {
      loadStatistics();
    }
  }, [userProfile, timeRange]);

  const loadStatistics = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // Calculate date range based on selection
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      switch (timeRange) {
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = startOfMonth(now);
      }

      // Fetch all bookings for the user
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id),
        orderBy('startTime', 'asc')
      );

      // Fetch all group bookings for the user
      const groupBookingsQuery = query(
        collection(db, 'groupBookings'),
        where('organizerId', '==', userProfile.id),
        orderBy('startTime', 'asc')
      );

      const [bookingsSnapshot, groupBookingsSnapshot] = await Promise.all([
        getDocs(bookingsQuery),
        getDocs(groupBookingsQuery)
      ]);

      const allBookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Booking[];

      const allGroupBookings = groupBookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as GroupBooking[];

      // Filter bookings for the selected time range
      const filteredBookings = allBookings.filter(booking => 
        booking.startTime >= startDate && booking.startTime <= endDate
      );

      const filteredGroupBookings = allGroupBookings.filter(groupBooking => 
        groupBooking.startTime >= startDate && groupBooking.startTime <= endDate
      );

      // Calculate statistics
      const totalBookings = filteredBookings.length;
      const totalGroupBookings = filteredGroupBookings.length;
      const confirmedBookings = filteredBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
      const pendingBookings = filteredBookings.filter(b => b.status === BookingStatus.PENDING).length;
      const cancelledBookings = filteredBookings.filter(b => b.status === BookingStatus.CANCELLED).length;
      const completedBookings = filteredBookings.filter(b => b.status === BookingStatus.COMPLETED).length;

      // Calculate group booking statistics
      const groupBookingStats = {
        confirmed: filteredGroupBookings.filter(gb => gb.status === GroupBookingStatus.CONFIRMED).length,
        pending: filteredGroupBookings.filter(gb => gb.status === GroupBookingStatus.PENDING).length,
        cancelled: filteredGroupBookings.filter(gb => gb.status === GroupBookingStatus.CANCELLED).length,
        completed: filteredGroupBookings.filter(gb => gb.status === GroupBookingStatus.COMPLETED).length,
      };

      // Calculate total attendees and average
      const totalAttendees = filteredGroupBookings.reduce((sum, gb) => sum + gb.attendees.length, 0);
      const averageAttendeesPerGroupBooking = totalGroupBookings > 0 
        ? Math.round(totalAttendees / totalGroupBookings) 
        : 0;

      // Calculate revenue (assuming a price field exists, otherwise use duration)
      const totalRevenue = filteredBookings.reduce((sum, booking) => {
        // If price exists, use it; otherwise estimate based on duration
        const price = (booking as any).price || (booking.duration * 2); // $2 per minute as example
        return sum + (booking.status === BookingStatus.COMPLETED ? price : 0);
      }, 0);

      // Calculate average booking duration
      const averageBookingDuration = totalBookings > 0 
        ? Math.round(filteredBookings.reduce((sum, booking) => sum + booking.duration, 0) / totalBookings)
        : 0;

      // Calculate busy days
      const dayStats: { [key: string]: number } = {};
      filteredBookings.forEach(booking => {
        const dayName = format(booking.startTime, 'EEEE');
        dayStats[dayName] = (dayStats[dayName] || 0) + 1;
      });
      const busyDays = Object.entries(dayStats)
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);

      // Calculate monthly trend (last 6 months)
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthBookings = allBookings.filter(booking => 
          booking.startTime >= monthStart && booking.startTime <= monthEnd
        ).length;
        const monthGroupBookings = allGroupBookings.filter(groupBooking => 
          groupBooking.startTime >= monthStart && groupBooking.startTime <= monthEnd
        ).length;
        monthlyTrend.push({
          month: format(monthStart, 'MMM'),
          bookings: monthBookings,
          groupBookings: monthGroupBookings
        });
      }

      // Calculate weekly trend (last 8 weeks)
      const weeklyTrend: { week: string; bookings: number; groupBookings: number }[] = [];
      const weeks = eachWeekOfInterval({
        start: subMonths(now, 2),
        end: now
      });
      
      weeks.slice(-8).forEach(week => {
        const weekStart = startOfWeek(week);
        const weekBookings = allBookings.filter(booking => 
          isSameWeek(booking.startTime, week)
        ).length;
        const weekGroupBookings = allGroupBookings.filter(groupBooking => 
          isSameWeek(groupBooking.startTime, week)
        ).length;
        weeklyTrend.push({
          week: format(weekStart, 'MMM d'),
          bookings: weekBookings,
          groupBookings: weekGroupBookings
        });
      });

      // Calculate top time slots
      const timeStats: { [key: string]: number } = {};
      filteredBookings.forEach(booking => {
        const timeSlot = format(booking.startTime, 'HH:mm');
        timeStats[timeSlot] = (timeStats[timeSlot] || 0) + 1;
      });
      const topTimeSlots = Object.entries(timeStats)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        completedBookings,
        totalRevenue,
        averageBookingDuration,
        busyDays,
        monthlyTrend,
        weeklyTrend,
        topTimeSlots,
        totalGroupBookings,
        groupBookingStats,
        totalAttendees,
        averageAttendeesPerGroupBooking
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <XMarkIcon className="h-5 w-5 text-red-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (current < previous) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p className="text-slate-500 dark:text-slate-400">No statistics available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Statistics
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Analytics and insights for your bookings
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 capitalize ${
                timeRange === range
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Bookings</p>
                <p className="text-3xl font-bold">{stats.totalBookings}</p>
              </div>
              <CalendarDaysIcon className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Confirmed</p>
                <p className="text-3xl font-bold">{stats.confirmedBookings}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Revenue</p>
                <p className="text-3xl font-bold">${stats.totalRevenue}</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Avg Duration</p>
                <p className="text-3xl font-bold">{stats.averageBookingDuration}m</p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Group Bookings</p>
                <p className="text-3xl font-bold">{stats.totalGroupBookings}</p>
              </div>
              <UserIcon className="h-8 w-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">Total Attendees</p>
                <p className="text-3xl font-bold">{stats.totalAttendees}</p>
              </div>
              <UserIcon className="h-8 w-8 text-pink-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm font-medium">Avg Group Size</p>
                <p className="text-3xl font-bold">{stats.averageAttendeesPerGroupBooking}</p>
              </div>
              <UserIcon className="h-8 w-8 text-teal-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Breakdown */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ChartBarIcon className="h-6 w-6 text-blue-500" />
              <span>Booking Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Confirmed', value: stats.confirmedBookings, color: 'bg-green-500', icon: 'confirmed' },
                { label: 'Pending', value: stats.pendingBookings, color: 'bg-yellow-500', icon: 'pending' },
                { label: 'Completed', value: stats.completedBookings, color: 'bg-blue-500', icon: 'completed' },
                { label: 'Cancelled', value: stats.cancelledBookings, color: 'bg-red-500', icon: 'cancelled' },
              ].map((item) => (
                <div key={item.label} className="flex items-center space-x-3">
                  {getStatusIcon(item.icon)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {item.value}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{
                          width: `${stats.totalBookings > 0 ? (item.value / stats.totalBookings) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Group Booking Status Breakdown */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-6 w-6 text-indigo-500" />
              <span>Group Booking Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Confirmed', value: stats.groupBookingStats.confirmed, color: 'bg-green-500', icon: 'confirmed' },
                { label: 'Pending', value: stats.groupBookingStats.pending, color: 'bg-yellow-500', icon: 'pending' },
                { label: 'Completed', value: stats.groupBookingStats.completed, color: 'bg-blue-500', icon: 'completed' },
                { label: 'Cancelled', value: stats.groupBookingStats.cancelled, color: 'bg-red-500', icon: 'cancelled' },
              ].map((item) => (
                <div key={item.label} className="flex items-center space-x-3">
                  {getStatusIcon(item.icon)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.label}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {item.value}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{
                          width: `${stats.totalGroupBookings > 0 ? (item.value / stats.totalGroupBookings) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Busy Days */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon className="h-6 w-6 text-purple-500" />
              <span>Busiest Days</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.busyDays.slice(0, 7).map((day, index) => (
                <div key={day.day} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium ${
                      index === 0 ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                      index === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      index === 2 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                      'bg-slate-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {day.day}
                    </span>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {day.count} bookings
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />
              <span>Monthly Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.monthlyTrend.map((month, index) => {
                const previousMonth = index > 0 ? stats.monthlyTrend[index - 1].bookings : month.bookings;
                const totalBookings = month.bookings + month.groupBookings;
                const maxBookings = Math.max(...stats.monthlyTrend.map(m => m.bookings + m.groupBookings));
                return (
                  <div key={month.month} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-slate-900 dark:text-white w-12">
                        {month.month}
                      </span>
                      {getTrendIcon(month.bookings, previousMonth)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2 relative">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{
                            width: `${Math.max((month.bookings / maxBookings) * 100, 2)}%`
                          }}
                        />
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 absolute top-0"
                          style={{
                            left: `${Math.max((month.bookings / maxBookings) * 100, 2)}%`,
                            width: `${Math.max((month.groupBookings / maxBookings) * 100, 2)}%`
                          }}
                        />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 w-16 text-right">
                        <div>{month.bookings} ind</div>
                        <div>{month.groupBookings} grp</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Time Slots */}
        <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ClockIcon className="h-6 w-6 text-orange-500" />
              <span>Popular Time Slots</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topTimeSlots.length > 0 ? (
                stats.topTimeSlots.map((slot, index) => (
                  <div key={slot.time} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium ${
                        index === 0 ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                        index === 1 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        index === 2 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                        'bg-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {slot.time}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {slot.count} bookings
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                  No time slot data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
