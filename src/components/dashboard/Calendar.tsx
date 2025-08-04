'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserIcon, 
  EnvelopeIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';

interface MeetingDetails {
  booking: Booking;
  displayName: string;
  email: string;
  formattedTime: string;
  durationString: string;
  status: BookingStatus;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  meetings: MeetingDetails[];
}

export function Calendar() {
  const { userProfile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [meetings, setMeetings] = useState<MeetingDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedMeetings, setSelectedMeetings] = useState<MeetingDetails[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  useEffect(() => {
    if (userProfile) {
      loadMeetings();
    }
  }, [userProfile, currentMonth]);

  const loadMeetings = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // Get the start and end of the current month
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch bookings for the current month
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userProfile.id),
        orderBy('startTime', 'asc')
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

      // Filter bookings for the current month
      const monthBookings = allBookings.filter(booking => 
        booking.startTime >= monthStart && booking.startTime <= monthEnd
      );

      // Format meetings
      const formattedMeetings: MeetingDetails[] = monthBookings.map(booking => ({
        booking,
        displayName: booking.guestName,
        email: booking.guestEmail,
        formattedTime: booking.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationString: `${booking.duration} min`,
        status: booking.status,
      }));

      setMeetings(formattedMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return days.map((day: Date) => {
      const dayMeetings = meetings.filter(meeting => 
        isSameDay(meeting.booking.startTime, day)
      );

      return {
        date: day,
        isCurrentMonth: isSameMonth(day, currentMonth),
        isToday: isToday(day),
        meetings: dayMeetings,
      };
    });
  };

  const handleDayClick = (day: CalendarDay) => {
    if (day.meetings.length > 0) {
      setSelectedDay(day.date);
      setSelectedMeetings(day.meetings);
      setShowMeetingModal(true);
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case BookingStatus.PENDING:
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case BookingStatus.CANCELLED:
        return <XMarkIcon className="h-4 w-4 text-red-500" />;
      case BookingStatus.COMPLETED:
        return <CheckCircleIcon className="h-4 w-4 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case BookingStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case BookingStatus.CANCELLED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case BookingStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const calendarDays = generateCalendarDays();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Calendar
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            View all your scheduled meetings in calendar format
          </p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            ←
          </button>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white min-w-48 text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-6 w-6 text-blue-500" />
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                className={`
                  relative p-2 min-h-24 border border-slate-200 dark:border-slate-700 rounded-lg transition-all duration-200
                  ${day.isCurrentMonth 
                    ? 'bg-white dark:bg-slate-800' 
                    : 'bg-slate-50 dark:bg-slate-900'
                  }
                  ${day.isToday 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : ''
                  }
                  ${day.meetings.length > 0 
                    ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow-md' 
                    : ''
                  }
                `}
              >
                <div className={`text-sm font-medium ${
                  day.isCurrentMonth 
                    ? 'text-slate-900 dark:text-white' 
                    : 'text-slate-400 dark:text-slate-600'
                } ${day.isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                  {format(day.date, 'd')}
                </div>
                
                {/* Meeting indicators */}
                {day.meetings.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {day.meetings.slice(0, 3).map((meeting, idx) => (
                      <div
                        key={idx}
                        className={`text-xs px-2 py-1 rounded text-center truncate ${getStatusColor(meeting.status)}`}
                      >
                        {meeting.formattedTime}
                      </div>
                    ))}
                    {day.meetings.length > 3 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        +{day.meetings.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meeting Details Modal */}
      {showMeetingModal && selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Meetings for {format(selectedDay, 'MMMM d, yyyy')}
                </h3>
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedMeetings.map((meeting, index) => (
                  <div
                    key={index}
                    className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {meeting.formattedTime}
                        </span>
                        <span className="text-sm text-slate-500">({meeting.durationString})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(meeting.status)}
                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(meeting.status)}`}>
                          {meeting.status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {meeting.displayName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {meeting.email}
                        </span>
                      </div>
                      {meeting.booking.guestNotes && (
                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-2 rounded">
                          <strong>Notes:</strong> {meeting.booking.guestNotes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
