import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types';

export interface BookingStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  thisWeekBookings: number;
  loading: boolean;
}

export function useBookingStats() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<BookingStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    thisWeekBookings: 0,
    loading: true,
  });

  useEffect(() => {
    if (userProfile) {
      loadBookingStats();
    }
  }, [userProfile]);

  const loadBookingStats = async () => {
    if (!userProfile) return;

    try {
      setStats(prev => ({ ...prev, loading: true }));
      
      // Calculate this week's date range
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);

      // Fetch all bookings for the user
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id),
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

      // Calculate statistics
      const totalBookings = allBookings.length;
      const confirmedBookings = allBookings.filter(b => b.status === BookingStatus.CONFIRMED).length;
      const pendingBookings = allBookings.filter(b => b.status === BookingStatus.PENDING).length;
      
      // Filter bookings for this week
      const thisWeekBookings = allBookings.filter(booking => 
        booking.startTime >= startOfWeek
      ).length;

      setStats({
        totalBookings,
        confirmedBookings,
        pendingBookings,
        thisWeekBookings,
        loading: false,
      });

    } catch (error) {
      console.error('Error loading booking stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return stats;
}
