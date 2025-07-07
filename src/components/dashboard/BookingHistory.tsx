'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { googleCalendarService } from '@/lib/googleCalendar';
import { Booking, BookingStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid, XCircleIcon as XCircleIconSolid } from '@heroicons/react/24/solid';

// Custom animations styles
const animationStyles = `
  @keyframes pulse-slow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(1.05); }
  }
  
  @keyframes ping-slow {
    75%, 100% { transform: scale(1.2); opacity: 0; }
  }
  
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .animate-pulse-slow {
    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  .animate-ping-slow {
    animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
  
  .animate-bounce-slow {
    animation: bounce-slow 6s infinite;
  }
  
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`;

interface BookingWithDetails extends Booking {
  formattedDate: string;
  formattedTime: string;
  formattedDateTime: string;
  durationString: string;
  statusColor: string;
  statusIcon: React.ElementType;
  isUpcoming: boolean;
  isPast: boolean;
  canCancel: boolean;
  canReschedule: boolean;
}

type FilterType = 'all' | 'upcoming' | 'past' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
type SortType = 'newest' | 'oldest' | 'date-asc' | 'date-desc';

export function BookingHistory() {
  const { userProfile, user } = useAuth();
  const { addNotification } = useNotifications();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [selectedSort, setSelectedSort] = useState<SortType>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [userHasGoogleCalendar, setUserHasGoogleCalendar] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadBookings();
      fetchUserProfileData();
    }
  }, [userProfile]);

  const fetchUserProfileData = async () => {
    if (!userProfile) return;
    
    try {
      const profileDoc = await getDoc(doc(db, 'userProfiles', userProfile.id));
      if (profileDoc.exists()) {
        const profileData = profileDoc.data();
        setUserHasGoogleCalendar(profileData.googleCalendarConnected || false);
      }
    } catch (error) {
      console.error('Error fetching user profile data:', error);
    }
  };

  useEffect(() => {
    filterAndSortBookings();
  }, [bookings, searchTerm, selectedFilter, selectedSort]);

  const loadBookings = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id),
        orderBy('createdAt', 'desc')
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const fetchedBookings = bookingsSnapshot.docs.map(doc => {
        const data = doc.data();
        const booking: Booking = {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate() || new Date(),
          endTime: data.endTime?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Booking;

        return transformBooking(booking);
      });

      setBookings(fetchedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      addNotification({
        type: 'error',
        title: 'Error Loading Bookings',
        message: 'Failed to load your booking history. Please try again.',
        duration: 0,
        persistent: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const transformBooking = (booking: Booking): BookingWithDetails => {
    const now = new Date();
    const isUpcoming = booking.startTime > now;
    const isPast = booking.endTime < now;
    const canCancel = isUpcoming && booking.status !== BookingStatus.CANCELLED;
    const canReschedule = isUpcoming && booking.status === BookingStatus.CONFIRMED;

    const statusConfig = {
      [BookingStatus.PENDING]: {
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        icon: ExclamationTriangleIcon,
      },
      [BookingStatus.CONFIRMED]: {
        color: 'text-green-600 bg-green-50 border-green-200',
        icon: CheckCircleIcon,
      },
      [BookingStatus.CANCELLED]: {
        color: 'text-red-600 bg-red-50 border-red-200',
        icon: XCircleIcon,
      },
      [BookingStatus.COMPLETED]: {
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        icon: CheckCircleIconSolid,
      },
    };

    const config = statusConfig[booking.status] || statusConfig[BookingStatus.PENDING];

    return {
      ...booking,
      formattedDate: booking.startTime.toLocaleDateString(),
      formattedTime: booking.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      formattedDateTime: booking.startTime.toLocaleString(),
      durationString: `${booking.duration} min`,
      statusColor: config.color,
      statusIcon: config.icon,
      isUpcoming,
      isPast,
      canCancel,
      canReschedule,
    };
  };

  const filterAndSortBookings = () => {
    let filtered = bookings;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.guestEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.guestNotes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status/time filter
    switch (selectedFilter) {
      case 'upcoming':
        filtered = filtered.filter(booking => booking.isUpcoming);
        break;
      case 'past':
        filtered = filtered.filter(booking => booking.isPast);
        break;
      case 'pending':
        filtered = filtered.filter(booking => booking.status === BookingStatus.PENDING);
        break;
      case 'confirmed':
        filtered = filtered.filter(booking => booking.status === BookingStatus.CONFIRMED);
        break;
      case 'cancelled':
        filtered = filtered.filter(booking => booking.status === BookingStatus.CANCELLED);
        break;
      case 'completed':
        filtered = filtered.filter(booking => booking.status === BookingStatus.COMPLETED);
        break;
    }

    // Apply sorting
    switch (selectedSort) {
      case 'newest':
        filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        break;
      case 'date-desc':
        filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
        break;
    }

    setFilteredBookings(filtered);
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      setLoading(true);
      
      // Get the current booking data first
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      if (!bookingToUpdate) {
        throw new Error('Booking not found');
      }
      
      // Only proceed if the status is actually changing
      if (bookingToUpdate.status === newStatus) {
        setLoading(false);
        return;
      }
      
      const updates: any = {
        status: newStatus,
        updatedAt: new Date(),
      };
      
      // If the status is being changed to CONFIRMED, create a Google Calendar event
      if (newStatus === BookingStatus.CONFIRMED && 
          userHasGoogleCalendar && 
          bookingToUpdate.status !== BookingStatus.CONFIRMED) {
        try {
          console.log('Creating Google Calendar event for confirmed booking');
          
          // Double check that user has Google Calendar connected
          let profileData = userProfile;
          
          // If userProfile is not available or googleCalendarConnected is not set, fetch it
          if (!profileData) {
            try {
              const profileDoc = await getDoc(doc(db, 'userProfiles', user?.uid || ''));
              if (profileDoc.exists()) {
                const data = profileDoc.data();
                profileData = data as any;
              }
            } catch (error) {
              console.error("Error fetching user profile:", error);
            }
          }
          
          // Check if user has Google Calendar connected
          const hasGoogleCalendar = (profileData as any)?.googleCalendarConnected || false;
          
          if (!hasGoogleCalendar) {
            console.warn('User does not have Google Calendar connected, skipping event creation');
            addNotification({
              type: 'warning',
              title: 'Calendar Not Connected',
              message: 'Google Calendar is not connected. The booking has been confirmed, but no calendar event was created.',
              duration: 5000,
              persistent: true,
            });
          } else {
            // Initialize Google Calendar service
            await googleCalendarService.initialize();
            
            // Create calendar event
            const calendarEvent = {
              summary: `Meeting with ${bookingToUpdate.guestName}`,
              description: `Meeting booked through Schedulo.\n\nGuest: ${bookingToUpdate.guestName}\nEmail: ${bookingToUpdate.guestEmail}\n${bookingToUpdate.guestNotes ? `Notes: ${bookingToUpdate.guestNotes}` : ''}`,
              start: {
                dateTime: bookingToUpdate.startTime.toISOString(),
                timeZone: bookingToUpdate.timezone,
              },
              end: {
                dateTime: bookingToUpdate.endTime.toISOString(),
                timeZone: bookingToUpdate.timezone,
              },
              attendees: [
                {
                  email: bookingToUpdate.guestEmail,
                  displayName: bookingToUpdate.guestName,
                },
                // Also add the host to the event
                {
                  email: user?.email || '',
                  displayName: user?.displayName || '',
                }
              ],
              // Add a reminder notification
              reminders: {
                useDefault: false,
                overrides: [
                  { method: 'email', minutes: 60 },
                  { method: 'popup', minutes: 15 }
                ]
              }
            };

            const eventId = await googleCalendarService.createEvent(calendarEvent);
            if (eventId) {
              console.log('Google Calendar event created:', eventId);
              // Store the Google Calendar event ID in the booking
              updates.googleCalendarEventId = eventId;
            }
          }
        } catch (calendarError) {
          console.error('Error creating Google Calendar event:', calendarError);
          // Continue with booking confirmation even if calendar creation fails
          addNotification({
            type: 'warning',
            title: 'Calendar Event Failed',
            message: 'Booking was confirmed but could not be added to your Google Calendar.',
            duration: 5000,
            persistent: true,
          });
        }
      }
      
      // If canceling and there's a Google Calendar event, delete it
      if (newStatus === BookingStatus.CANCELLED && 
          bookingToUpdate.googleCalendarEventId &&
          userHasGoogleCalendar) {
        try {
          // Initialize Google Calendar service
          await googleCalendarService.initialize();
          
          // Delete the calendar event
          const deleted = await googleCalendarService.deleteEvent(bookingToUpdate.googleCalendarEventId);
          if (deleted) {
            console.log('Google Calendar event deleted');
          } else {
            console.warn('Failed to delete Google Calendar event');
            addNotification({
              type: 'warning',
              title: 'Calendar Sync Issue',
              message: 'The booking was cancelled but the calendar event may still be in your Google Calendar.',
              duration: 5000,
              persistent: true,
            });
          }
        } catch (calendarError) {
          console.error('Error deleting Google Calendar event:', calendarError);
          addNotification({
            type: 'error',
            title: 'Calendar Error',
            message: 'Could not delete the event from Google Calendar.',
            duration: 5000,
            persistent: true,
          });
        }
      }
      
      // Update the booking in Firestore
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, updates);

      // Update local state
      setBookings(prev => prev.map(booking =>
        booking.id === bookingId 
          ? transformBooking({ 
              ...booking, 
              ...updates,
              status: newStatus, 
              updatedAt: new Date(),
              googleCalendarEventId: updates.googleCalendarEventId || booking.googleCalendarEventId
            })
          : booking
      ));

      // Send status update email to guest
      try {
        // Create guest info object from booking
        const guest = {
          name: bookingToUpdate.guestName,
          email: bookingToUpdate.guestEmail,
          notes: bookingToUpdate.guestNotes
        };
        
        // Log the status change email we're about to send
        console.log(`Sending booking status update email to ${guest.email} with status: ${newStatus}`);
        
        // Ensure we have a user to send
        if (user) {
          // Send status update via API route
          const emailResponse = await fetch('/api/email/confirmation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host: {
                id: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'Host',
                photoURL: user.photoURL || undefined,
                timezone: userProfile?.timezone || 'UTC'
              },
              guest,
              selectedSlot: {
                start: bookingToUpdate.startTime,
                end: bookingToUpdate.endTime,
                duration: bookingToUpdate.duration
              },
              status: newStatus
            }),
          });

          if (!emailResponse.ok) {
            console.error('Failed to send status update email:', await emailResponse.text());
          } else {
            console.log(`Status update email sent to guest for booking ${bookingId}`);
          }
        } else {
          console.warn('User not available, skipping email notification');
        }
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        // Don't block the process if email fails
      }

      const statusText = newStatus === BookingStatus.CONFIRMED ? 'confirmed' : 
                        newStatus === BookingStatus.CANCELLED ? 'cancelled' : 
                        newStatus === BookingStatus.COMPLETED ? 'completed' : 'updated';

      addNotification({
        type: 'success',
        title: 'Booking Updated',
        message: `Booking has been ${statusText} successfully.`,
        duration: 2000,
        persistent: true,
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update the booking. Please try again.',
        duration: 0,
        persistent: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      
      // Update local state
      setBookings(prev => prev.filter(booking => booking.id !== bookingId));

      addNotification({
        type: 'success',
        title: 'Booking Deleted',
        message: 'Booking has been deleted successfully.',
        duration: 2000,
        persistent: true,
      });
    } catch (error) {
      console.error('Error deleting booking:', error);
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete the booking. Please try again.',
        duration: 0,
        persistent: true,
      });
    }
  };

  const handleCopyBookingDetails = (booking: BookingWithDetails) => {
    const details = `
Booking Details:
Name: ${booking.guestName}
Email: ${booking.guestEmail}
Date: ${booking.formattedDate}
Time: ${booking.formattedTime}
Duration: ${booking.durationString}
Status: ${booking.status}
${booking.guestNotes ? `Notes: ${booking.guestNotes}` : ''}
    `.trim();

    navigator.clipboard.writeText(details);
    addNotification({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'Booking details copied to clipboard.',
      duration: 2000,
      persistent: true,
    });
  };

  const getFilterCounts = () => {
    const counts = {
      all: bookings.length,
      upcoming: bookings.filter(b => b.isUpcoming).length,
      past: bookings.filter(b => b.isPast).length,
      pending: bookings.filter(b => b.status === BookingStatus.PENDING).length,
      confirmed: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
      cancelled: bookings.filter(b => b.status === BookingStatus.CANCELLED).length,
      completed: bookings.filter(b => b.status === BookingStatus.COMPLETED).length,
    };
    return counts;
  };

  const filterCounts = getFilterCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Apply animation styles */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      
      

      {/* How To Use Guide */}
      {filterCounts.all < 5 && (
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
            Getting Started with Schedulo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                <CalendarDaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">1. Set Your Availability</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Configure your weekly schedule and buffer times in the Settings tab
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-600 dark:text-purple-400">
                  <path d="M5.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM2.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM18.75 7.5a.75.75 0 0 0-1.5 0v2.25H15a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H21a.75.75 0 0 0 0-1.5h-2.25V7.5Z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">2. Share Your Link</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Send your booking link to clients so they can schedule meetings with you
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">3. Manage Bookings</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Confirm, cancel, or mark bookings as completed right from this page
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Pending Approvals Section */}
      {filteredBookings.some(b => b.status === BookingStatus.PENDING) && (
        <Card variant="elevated" className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                    Pending Bookings
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    You have {filteredBookings.filter(b => b.status === BookingStatus.PENDING).length} booking{
                      filteredBookings.filter(b => b.status === BookingStatus.PENDING).length !== 1 ? 's' : ''
                    } that require your approval.
                  </p>
                </div>
              </div>
              <button 
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                onClick={() => setSelectedFilter('pending')}
              >
                View Pending
              </button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Booking List */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Booking History
              </h1>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                {filteredBookings.length} of {bookings.length}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              View, approve, and manage your scheduling calendar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {filterCounts.pending > 0 && (
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border-2 border-white dark:border-slate-800" title="Pending bookings">
                  <span className="text-xs font-medium text-amber-800">{filterCounts.pending}</span>
                </div>
              )}
              {filterCounts.confirmed > 0 && (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center border-2 border-white dark:border-slate-800" title="Confirmed bookings">
                  <span className="text-xs font-medium text-green-800">{filterCounts.confirmed}</span>
                </div>
              )}
              {filterCounts.completed > 0 && (
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white dark:border-slate-800" title="Completed bookings">
                  <span className="text-xs font-medium text-blue-800">{filterCounts.completed}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1 group">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by name, email or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-white transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <div className="relative">
                  <FunnelIcon className="h-4 w-4" />
                  {(selectedFilter !== 'all' || selectedSort !== 'newest') && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </div>
                <span>Filters</span>
                {showFilters ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />}
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Filter by Status
                    </label>
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value as FilterType)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                    >
                      <option value="all">All Bookings ({filterCounts.all})</option>
                      <option value="upcoming">Upcoming ({filterCounts.upcoming})</option>
                      <option value="past">Past ({filterCounts.past})</option>
                      <option value="pending">Pending ({filterCounts.pending})</option>
                      <option value="confirmed">Confirmed ({filterCounts.confirmed})</option>
                      <option value="cancelled">Cancelled ({filterCounts.cancelled})</option>
                      <option value="completed">Completed ({filterCounts.completed})</option>
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Sort by
                    </label>
                    <select
                      value={selectedSort}
                      onChange={(e) => setSelectedSort(e.target.value as SortType)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-white"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="date-desc">Booking Date (Newest)</option>
                      <option value="date-asc">Booking Date (Oldest)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 animate-float">
                  <CalendarDaysIcon className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {searchTerm || selectedFilter !== 'all' ? 'No bookings found' : 'No bookings yet'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {searchTerm || selectedFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Your bookings will appear here once customers start booking with you'
                  }
                </p>
                {searchTerm || selectedFilter !== 'all' ? (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedFilter('all');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => (
              <Card 
                key={booking.id} 
                className="hover:shadow-md transition-shadow border-l-4 transform hover:-translate-y-1 transition-all duration-200"
                style={{ 
                  borderLeftColor: booking.status === BookingStatus.PENDING ? '#f59e0b' : 
                                  booking.status === BookingStatus.CONFIRMED ? '#10b981' : 
                                  booking.status === BookingStatus.CANCELLED ? '#ef4444' : 
                                  booking.status === BookingStatus.COMPLETED ? '#3b82f6' : '#6b7280',
                  animationDelay: `${index * 50}ms`,
                  opacity: 0,
                  animation: 'fadeIn 0.5s ease-out forwards'
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {booking.guestName}
                          </h3>
                          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                            <EnvelopeIcon className="h-4 w-4" />
                            <span>{booking.guestEmail}</span>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${booking.statusColor}`}>
                          <booking.statusIcon className="h-3 w-3 inline mr-1" />
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span>{booking.formattedDate}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <ClockIcon className="h-4 w-4" />
                          <span>{booking.formattedTime} ({booking.durationString})</span>
                        </div>
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                          <MapPinIcon className="h-4 w-4" />
                          <span>{booking.timezone}</span>
                        </div>
                      </div>

                      {booking.guestNotes && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <strong>Notes:</strong> {booking.guestNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 gap-2">
                    {/* Status-specific action buttons */}
                    {booking.status === BookingStatus.PENDING && (
                      <>
                        <button
                          onClick={() => handleUpdateBookingStatus(booking.id, BookingStatus.CONFIRMED)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">Confirm</span>
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(booking.id, BookingStatus.CANCELLED)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                        >
                          <XCircleIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">Cancel</span>
                        </button>
                      </>
                    )}
                    
                    {booking.status === BookingStatus.CONFIRMED && booking.isPast && (
                      <button
                        onClick={() => handleUpdateBookingStatus(booking.id, BookingStatus.COMPLETED)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                      >
                        <CheckCircleIconSolid className="h-4 w-4" />
                        <span className="text-xs font-medium">Mark Complete</span>
                      </button>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyBookingDetails(booking)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md transition-colors dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">Copy</span>
                      </button>
                      
                      <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md transition-colors dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">Delete</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <style dangerouslySetInnerHTML={{ 
              __html: `
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              ` 
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
