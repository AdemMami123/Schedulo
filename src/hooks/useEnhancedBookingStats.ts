import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types';
import { GroupBooking } from '@/types/groupBooking';

export interface EnhancedBookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  thisWeekBookings: number;
  thisMonthBookings: number;
  totalRevenue: number;
  profileViews: number;
  groupMeetings: number;
  upcomingBookings: number;
  loading: boolean;
  growthPercentage: number;
  conversionRate: number;
  averageMeetingDuration: number;
}

export function useEnhancedBookingStats() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<EnhancedBookingStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    thisWeekBookings: 0,
    thisMonthBookings: 0,
    totalRevenue: 0,
    profileViews: 0,
    groupMeetings: 0,
    upcomingBookings: 0,
    loading: true,
    growthPercentage: 0,
    conversionRate: 0,
    averageMeetingDuration: 0,
  });

  useEffect(() => {
    if (userProfile) {
      loadEnhancedStats();
    }
  }, [userProfile]);

  const loadEnhancedStats = async () => {
    if (!userProfile) return;

    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      const now = new Date();
      
      // Calculate date ranges
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Fetch regular bookings
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id)
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const allBookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Booking;
      });

      // Fetch group bookings where user is organizer
      const groupBookingsQuery = query(
        collection(db, 'groupBookings'),
        where('organizerId', '==', userProfile.id)
      );

      const groupBookingsSnapshot = await getDocs(groupBookingsQuery);
      const allGroupBookings = groupBookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as GroupBooking;
      });

      // Calculate basic statistics
      const totalBookings = allBookings.length;
      const confirmedBookings = allBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
      const pendingBookings = allBookings.filter(b => b.status === BookingStatus.PENDING).length;
      const cancelledBookings = allBookings.filter(b => b.status === BookingStatus.CANCELLED).length;
      
      // Time-based statistics
      const thisWeekBookings = allBookings.filter(booking => 
        booking.startTime >= startOfWeek
      ).length;

      const thisMonthBookings = allBookings.filter(booking => 
        booking.startTime >= startOfMonth
      ).length;

      const lastMonthBookings = allBookings.filter(booking => 
        booking.startTime >= lastMonth && booking.startTime <= endOfLastMonth
      ).length;

      const upcomingBookings = allBookings.filter(booking => 
        booking.startTime > now && booking.status === BookingStatus.CONFIRMED
      ).length;

      // Group meetings
      const groupMeetings = allGroupBookings.length;

      // Calculate growth percentage (this month vs last month)
      const growthPercentage = lastMonthBookings > 0 
        ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 
        : thisMonthBookings > 0 ? 100 : 0;

      // Calculate conversion rate (confirmed / total)
      const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

      // Calculate average meeting duration
      const totalDuration = allBookings.reduce((sum, booking) => sum + booking.duration, 0);
      const averageMeetingDuration = totalBookings > 0 ? Math.round(totalDuration / totalBookings) : 0;

      // Mock data for features not yet implemented
      const totalRevenue = confirmedBookings * 50; // Assuming $50 per meeting
      const profileViews = Math.floor(Math.random() * 50) + totalBookings * 3; // Mock profile views

      setStats({
        totalBookings,
        confirmedBookings,
        pendingBookings,
        cancelledBookings,
        thisWeekBookings,
        thisMonthBookings,
        totalRevenue,
        profileViews,
        groupMeetings,
        upcomingBookings,
        loading: false,
        growthPercentage,
        conversionRate,
        averageMeetingDuration,
      });

    } catch (error) {
      console.error('Error loading enhanced booking stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}
