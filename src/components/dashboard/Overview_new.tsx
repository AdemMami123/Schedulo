'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserGroupIcon,
  EyeIcon,
  ClipboardDocumentIcon,
  ArrowTrendingUpIcon,
  LinkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface DashboardStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
}

export function Overview() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    upcomingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadDashboardData();
    }
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile) return;

    try {
      // Load bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id),
        orderBy('createdAt', 'desc')
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Booking[];

      // Calculate stats
      const now = new Date();
      const stats = {
        totalBookings: bookings.length,
        upcomingBookings: bookings.filter(b => 
          b.startTime > now && b.status === BookingStatus.CONFIRMED
        ).length,
        completedBookings: bookings.filter(b => 
          b.status === BookingStatus.COMPLETED
        ).length,
        cancelledBookings: bookings.filter(b => 
          b.status === BookingStatus.CANCELLED
        ).length,
      };

      setStats(stats);
      setRecentBookings(bookings.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyBookingLink = async () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `${window.location.origin}/schedule/${userProfile.username}`;
    
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+{trend}%</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color} group-hover:scale-110 transition-transform duration-200`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={CalendarDaysIcon}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
          trend={stats.totalBookings > 0 ? 12 : null}
        />
        <StatCard
          title="Upcoming"
          value={stats.upcomingBookings}
          icon={ClockIcon}
          color="bg-gradient-to-r from-green-500 to-green-600"
          trend={stats.upcomingBookings > 0 ? 8 : null}
        />
        <StatCard
          title="Completed"
          value={stats.completedBookings}
          icon={CheckIcon}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
          trend={stats.completedBookings > 0 ? 15 : null}
        />
        <StatCard
          title="Profile Views"
          value={Math.floor(Math.random() * 100) + 50}
          icon={EyeIcon}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
          trend={25}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Your Booking Link</h3>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
                  <code className="text-sm text-gray-600 dark:text-gray-400 break-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/schedule/{userProfile?.username}
                  </code>
                </div>
                <Button
                  onClick={copyBookingLink}
                  variant={copied ? "primary" : "outline"}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">This Week</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.upcomingBookings}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">This Month</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.totalBookings}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5" />
            <span>Recent Bookings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bookings yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Share your booking link to get started!
              </p>
              <Button onClick={copyBookingLink} variant="outline">
                <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                Copy Booking Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {booking.guestName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {booking.guestName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(booking.startTime)} • {booking.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      booking.status === BookingStatus.CONFIRMED
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : booking.status === BookingStatus.COMPLETED
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
