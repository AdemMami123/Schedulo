'use client';

import { useState, useMemo, useEffect } from 'react';
import { Group } from '@/types/group';
import { UserProfile, WeeklyAvailability } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ResponsiveGrid } from '@/components/ui/ResponsiveGrid';
import AvailabilitySetupPrompt from './AvailabilitySetupPrompt';
import GroupBookingForm from '@/components/groups/GroupBookingForm';
import { GroupBookingService } from '@/lib/groupBookingService';
import { GroupMeetingRequest, GroupAvailabilitySlot } from '@/types/groupBooking';
import { UserWithProfile } from '@/lib/userLookup';
import {
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChartBarIcon,
  XMarkIcon as X
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface GroupAvailabilityProps {
  group: Group;
  profiles: (UserProfile & { memberEmail?: string })[]; // Profiles of group members with email
  usersWithProfiles?: UserWithProfile[]; // Full user data with profiles
  mode?: 'collective' | 'round-robin';
}

interface CollectiveSlot {
  start: string;
  end: string;
  availableMembers: string[]; // member emails
  totalMembers: number;
  day: keyof WeeklyAvailability;
}

interface RoundRobinSlot {
  start: string;
  end: string;
  assignedMember: string; // member email
  day: keyof WeeklyAvailability;
}

const DAYS_OF_WEEK: (keyof WeeklyAvailability)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

// Helper functions for time calculations
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  const totalMinutes = timeToMinutes(time) + minutesToAdd;
  return minutesToTime(totalMinutes);
};

export default function GroupAvailability({ group, profiles, usersWithProfiles = [], mode: initialMode = 'collective' }: GroupAvailabilityProps) {
  const { userProfile } = useAuth();
  const [selectedDay, setSelectedDay] = useState<keyof WeeklyAvailability>('monday');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'booking'>('grid');
  const [mode, setMode] = useState<'collective' | 'round-robin'>(initialMode);
  const [availabilitySlots, setAvailabilitySlots] = useState<GroupAvailabilitySlot[]>([]);

  // Enhanced booking state for group creators
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBookingSlot, setSelectedBookingSlot] = useState<CollectiveSlot | null>(null);
  const [bookingDetails, setBookingDetails] = useState({
    title: '',
    description: '',
    duration: 60,
    location: '',
    meetingLink: '',
    selectedDate: null as Date | null
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Get member profiles that exist in the profiles array
  const memberProfiles = useMemo(() => {
    const filtered = profiles.filter(profile =>
      profile.memberEmail && group.members.includes(profile.memberEmail)
    );
    console.log('GroupAvailability - Member profiles:', filtered);
    console.log('GroupAvailability - Group members:', group.members);
    return filtered;
  }, [profiles, group.members]);

  // Calculate availability slots for booking
  useEffect(() => {
    if (usersWithProfiles.length > 0) {
      const slots = GroupBookingService.calculateGroupAvailability(usersWithProfiles, 14); // Next 14 days
      setAvailabilitySlots(slots);
    }
  }, [usersWithProfiles]);

  // Handle booking submission
  const handleBookingSubmit = async (request: GroupMeetingRequest) => {
    try {
      if (!userProfile?.id) {
        throw new Error('User not authenticated');
      }

      // Create the booking
      const bookingId = await GroupBookingService.createGroupBooking(request);

      // Send email invitations using the proven email service
      const startTime = request.preferredDate;
      const endTime = new Date(request.preferredDate.getTime() + request.duration * 60000);

      await GroupBookingService.sendGroupMeetingEmails(
        bookingId,
        request.title,
        startTime,
        endTime,
        request.requiredAttendees || [],
        userProfile.displayName || userProfile.email || 'Group Organizer',
        userProfile.email || '',
        request.description,
        request.location,
        request.meetingLink
      );

      // Show success message and return to availability view
      alert('Group meeting confirmed and scheduled successfully! All attendees have been automatically confirmed and invitations sent.');
      setViewMode('grid');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to schedule meeting. Please try again.');
    }
  };

  // Enhanced booking function for group creators
  const handleSlotBooking = (slot: CollectiveSlot) => {
    if (group.createdBy !== userProfile?.id) {
      alert('Only the group creator can book meetings for this group.');
      return;
    }

    setSelectedBookingSlot(slot);
    setBookingDetails({
      title: `${group.name} Meeting`,
      description: '',
      duration: 60,
      location: '',
      meetingLink: '',
      selectedDate: null
    });
    calculateAvailableDates();
    setShowBookingModal(true);
  };

  // Calculate available dates for the next 30 days
  const calculateAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();

    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    setAvailableDates(dates);
  };

  // Book the meeting
  const handleConfirmBooking = async () => {
    console.log('🚀 BOOKING PROCESS STARTED');
    console.log('📋 Selected slot:', selectedBookingSlot);
    console.log('📅 Selected date:', bookingDetails.selectedDate);
    console.log('📝 Meeting title:', bookingDetails.title);

    if (!selectedBookingSlot || !bookingDetails.selectedDate || !bookingDetails.title.trim()) {
      alert('Please fill in all required fields and select a date.');
      return;
    }

    setBookingLoading(true);
    try {
      console.log('✅ Validation passed, proceeding with booking...');
      // Create the meeting date and time
      const [hours, minutes] = selectedBookingSlot.start.split(':').map(Number);
      const meetingStart = new Date(bookingDetails.selectedDate);
      meetingStart.setHours(hours, minutes, 0, 0);

      const meetingEnd = new Date(meetingStart.getTime() + bookingDetails.duration * 60000);

      // Create the booking request with proper undefined handling
      const bookingRequest: GroupMeetingRequest = {
        groupId: group.id,
        organizerEmail: userProfile?.email || '',
        organizerName: userProfile?.displayName || userProfile?.email || '',
        title: bookingDetails.title.trim(),
        preferredDate: meetingStart,
        duration: bookingDetails.duration,
        meetingType: 'collective',
        requiredAttendees: group.members || [],
        optionalAttendees: []
      };

      // Only add optional fields if they have meaningful values
      if (bookingDetails.description && bookingDetails.description.trim()) {
        bookingRequest.description = bookingDetails.description.trim();
      }

      if (bookingDetails.location && bookingDetails.location.trim()) {
        bookingRequest.location = bookingDetails.location.trim();
      }

      if (bookingDetails.meetingLink && bookingDetails.meetingLink.trim()) {
        bookingRequest.meetingLink = bookingDetails.meetingLink.trim();
      }

      // Create the booking
      console.log('📝 Creating booking with request:', bookingRequest);
      const bookingId = await GroupBookingService.createGroupBooking(bookingRequest);
      console.log('✅ Booking created with ID:', bookingId);

      // Create the booking object for email sending
      const booking = {
        id: bookingId,
        title: bookingRequest.title,
        description: bookingRequest.description,
        location: bookingRequest.location,
        meetingLink: bookingRequest.meetingLink,
        organizerId: userProfile?.email || '',
        organizerEmail: userProfile?.email || '',
        organizerName: userProfile?.displayName || userProfile?.email || '',
        startTime: meetingStart,
        endTime: meetingEnd,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'pending' as any,
        attendees: (group.members || []).map(email => ({
          email,
          name: email.split('@')[0],
          status: 'pending' as any
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('📧 Booking object created for emails:', booking);

      // Send email invitations using proven email service
      console.log('📧 Sending email invitations using proven email service...');

      try {
        await GroupBookingService.sendGroupMeetingEmails(
          bookingId,
          bookingDetails.title,
          meetingStart,
          meetingEnd,
          group.members || [],
          userProfile?.displayName || userProfile?.email || 'Group Organizer',
          userProfile?.email || '',
          bookingDetails.description || undefined,
          bookingDetails.location || undefined,
          bookingDetails.meetingLink || undefined
        );
        console.log('✅ Group email invitations sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send email invitations:', emailError);
        // Don't fail the entire booking if emails fail
      }

      // Reserve time slots on member calendars
      console.log('Reserving calendar slots...');
      try {
        await reserveTimeSlotForMembers(booking, group.members || []);
        console.log('✅ Calendar slots reserved successfully');
      } catch (calendarError) {
        console.error('❌ Failed to reserve calendar slots:', calendarError);
        // Don't fail the entire booking if calendar reservation fails
      }

      alert('Meeting booked successfully! Email invitations have been sent to all group members.');

      // Reset state
      setShowBookingModal(false);
      setSelectedBookingSlot(null);
      setBookingDetails({
        title: '',
        description: '',
        duration: 60,
        location: '',
        meetingLink: '',
        selectedDate: null
      });

    } catch (error) {
      console.error('Error booking meeting:', error);
      alert('Failed to book meeting. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Reserve time slot on member calendars
  const reserveTimeSlotForMembers = async (booking: any, memberEmails: string[]) => {
    try {
      const reservationPromises = memberEmails.map(async (email) => {
        return fetch('/api/calendar/reserve-slot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberEmail: email,
            booking: {
              id: booking.id,
              title: booking.title,
              startTime: booking.startTime,
              endTime: booking.endTime,
              location: booking.location,
              meetingLink: booking.meetingLink,
              organizerEmail: booking.organizerEmail
            }
          }),
        });
      });

      await Promise.all(reservationPromises);
    } catch (error) {
      console.error('Error reserving time slots:', error);
      // Don't throw - meeting is already created, this is just calendar sync
    }
  };

  // Calculate collective availability (overlapping time slots)
  const collectiveAvailability = useMemo((): CollectiveSlot[] => {
    if (memberProfiles.length === 0) return [];

    const slots: CollectiveSlot[] = [];

    DAYS_OF_WEEK.forEach(day => {
      // Get all time slots for this day from all members
      const memberTimeSlots = new Map<string, Array<{ start: string; end: string }>>();

      memberProfiles.forEach(profile => {
        const dayAvailability = profile.weeklyAvailability?.[day];
        if (dayAvailability?.enabled && dayAvailability.timeSlots) {
          const memberEmail = profile.memberEmail || profile.userId;
          memberTimeSlots.set(memberEmail, dayAvailability.timeSlots);
        }
      });

      if (memberTimeSlots.size === 0) return;

      // Create a comprehensive time grid (15-minute intervals)
      const timeGrid = new Map<string, Set<string>>(); // time -> set of available members

      // For each member's time slots, mark their availability in 15-minute intervals
      memberTimeSlots.forEach((timeSlots, memberEmail) => {
        timeSlots.forEach(slot => {
          const startMinutes = timeToMinutes(slot.start);
          const endMinutes = timeToMinutes(slot.end);

          // Mark every 15-minute interval this member is available
          for (let minutes = startMinutes; minutes < endMinutes; minutes += 15) {
            const timeKey = minutesToTime(minutes);
            if (!timeGrid.has(timeKey)) {
              timeGrid.set(timeKey, new Set());
            }
            timeGrid.get(timeKey)!.add(memberEmail);
          }
        });
      });

      // Find continuous time blocks where members overlap
      const sortedTimes = Array.from(timeGrid.keys()).sort();

      let currentSlot: {
        start: string;
        availableMembers: Set<string>;
        startIndex: number;
      } | null = null;

      sortedTimes.forEach((time, index) => {
        const availableMembers = timeGrid.get(time)!;

        if (currentSlot) {
          // Check if the same members are still available
          const sameMembers =
            currentSlot.availableMembers.size === availableMembers.size &&
            Array.from(currentSlot.availableMembers).every(member => availableMembers.has(member));

          if (!sameMembers || index === sortedTimes.length - 1) {
            // End current slot and create a new one
            const endTime = index === sortedTimes.length - 1 && sameMembers
              ? addMinutesToTime(time, 15)
              : time;

            // Only add slots with meaningful duration (at least 15 minutes)
            if (timeToMinutes(endTime) - timeToMinutes(currentSlot.start) >= 15) {
              slots.push({
                start: currentSlot.start,
                end: endTime,
                availableMembers: Array.from(currentSlot.availableMembers),
                totalMembers: memberProfiles.length,
                day
              });
            }

            // Start new slot if not at the end
            if (index < sortedTimes.length - 1) {
              currentSlot = {
                start: time,
                availableMembers: new Set(availableMembers),
                startIndex: index
              };
            } else {
              currentSlot = null;
            }
          }
        } else {
          // Start new slot
          currentSlot = {
            start: time,
            availableMembers: new Set(availableMembers),
            startIndex: index
          };
        }
      });
    });

    // Filter out slots with no overlap (only include slots where at least 1 member is available)
    const filteredSlots = slots.filter(slot => slot.availableMembers.length >= 1);
    console.log('GroupAvailability - Collective slots:', filteredSlots);
    return filteredSlots;
  }, [memberProfiles]);

  // Calculate round-robin availability (distribute slots fairly among members)
  const roundRobinAvailability = useMemo((): RoundRobinSlot[] => {
    if (memberProfiles.length === 0) return [];

    // First, collect all available time slots from all members
    const allSlots: Array<{
      start: string;
      end: string;
      day: keyof WeeklyAvailability;
      availableMembers: string[];
    }> = [];

    DAYS_OF_WEEK.forEach(day => {
      // Create a time grid to find all possible slots
      const timeGrid = new Map<string, string[]>(); // time -> available members

      memberProfiles.forEach(profile => {
        const dayAvailability = profile.weeklyAvailability?.[day];
        if (dayAvailability?.enabled && dayAvailability.timeSlots) {
          const memberEmail = profile.memberEmail || profile.userId;

          dayAvailability.timeSlots.forEach(slot => {
            const startMinutes = timeToMinutes(slot.start);
            const endMinutes = timeToMinutes(slot.end);

            // Mark every 30-minute interval this member is available (longer slots for round-robin)
            for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
              const timeKey = minutesToTime(minutes);
              if (!timeGrid.has(timeKey)) {
                timeGrid.set(timeKey, []);
              }
              timeGrid.get(timeKey)!.push(memberEmail);
            }
          });
        }
      });

      // Convert time grid to slots with available members
      const sortedTimes = Array.from(timeGrid.keys()).sort();
      sortedTimes.forEach(time => {
        const availableMembers = timeGrid.get(time)!;
        if (availableMembers.length > 0) {
          allSlots.push({
            start: time,
            end: addMinutesToTime(time, 30), // 30-minute slots for round-robin
            day,
            availableMembers: [...new Set(availableMembers)] // Remove duplicates
          });
        }
      });
    });

    // Sort slots by day and time
    allSlots.sort((a, b) => {
      if (a.day !== b.day) {
        return DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day);
      }
      return a.start.localeCompare(b.start);
    });

    // Implement fair round-robin assignment
    const memberAssignmentCount = new Map<string, number>();
    const assignedSlots: RoundRobinSlot[] = [];

    // Initialize assignment counts
    memberProfiles.forEach(profile => {
      const memberEmail = profile.memberEmail || profile.userId;
      memberAssignmentCount.set(memberEmail, 0);
    });

    // Assign slots using round-robin with fairness
    allSlots.forEach(slot => {
      if (slot.availableMembers.length === 0) return;

      // Find the member with the least assignments who is available for this slot
      let selectedMember = slot.availableMembers[0];
      let minAssignments = memberAssignmentCount.get(selectedMember) || 0;

      slot.availableMembers.forEach(member => {
        const assignments = memberAssignmentCount.get(member) || 0;
        if (assignments < minAssignments) {
          selectedMember = member;
          minAssignments = assignments;
        }
      });

      // Assign the slot to the selected member
      assignedSlots.push({
        start: slot.start,
        end: slot.end,
        assignedMember: selectedMember,
        day: slot.day
      });

      // Increment assignment count
      memberAssignmentCount.set(selectedMember, (memberAssignmentCount.get(selectedMember) || 0) + 1);
    });

    console.log('GroupAvailability - Round-robin slots:', assignedSlots);
    return assignedSlots;
  }, [memberProfiles]);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAvailabilityColor = (availableCount: number, totalCount: number) => {
    const percentage = availableCount / totalCount;
    if (percentage === 1) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (percentage >= 0.4) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const filteredSlots = mode === 'collective'
    ? collectiveAvailability.filter(slot => slot.day === selectedDay)
    : roundRobinAvailability.filter(slot => slot.day === selectedDay);

  // Show booking form if in booking mode
  if (viewMode === 'booking') {
    return (
      <GroupBookingForm
        group={group}
        usersWithProfiles={usersWithProfiles}
        availableSlots={availabilitySlots}
        onBookingSubmit={handleBookingSubmit}
        onCancel={() => setViewMode('grid')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">
                  {group.name} Availability
                </CardTitle>
                <p className="text-indigo-100 text-sm">
                  {memberProfiles.length} member{memberProfiles.length !== 1 ? 's' : ''} • {mode === 'collective' ? 'Collective' : 'Round-robin'} mode
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-white border-white/20 hover:bg-white/20"
              >
                <ChartBarIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="text-white border-white/20 hover:bg-white/20"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Members Overview */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserIcon className="h-5 w-5 text-blue-500" />
            <span>Group Members</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memberProfiles.length === 0 ? (
            <AvailabilitySetupPrompt
              userEmails={group.members}
            />
          ) : (
            <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="normal">
              {memberProfiles.map((profile) => (
                <div
                  key={profile.userId}
                  className="flex items-center space-x-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {profile.memberEmail?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {profile.memberEmail?.split('@')[0] || 'Unknown User'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {profile.timezone} • {profile.memberEmail}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {profile.weeklyAvailability ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </ResponsiveGrid>
          )}
        </CardContent>
      </Card>

      {/* Day Selection */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-purple-500" />
            <span>Select Day</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const daySlots = mode === 'collective'
                ? collectiveAvailability.filter(slot => slot.day === day)
                : roundRobinAvailability.filter(slot => slot.day === day);

              const isSelected = selectedDay === day;
              const hasSlots = daySlots.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    'p-3 rounded-xl text-center transition-all duration-300 border-2',
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-500 shadow-lg transform scale-105'
                      : hasSlots
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div className="font-medium text-sm">
                    {DAY_LABELS[day].slice(0, 3)}
                  </div>
                  <div className="text-xs mt-1">
                    {daySlots.length} slot{daySlots.length !== 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Creator Call-to-Action */}
      {mode === 'collective' && group.createdBy === userProfile?.id && (
        <Card className="border-0 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CalendarDaysIcon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Ready to Schedule a Meeting?</h3>
                  <p className="text-green-100 text-sm">
                    Click "Book Meeting" on any time slot below to schedule with your group members
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-green-100">
                <span className="text-sm">👥 {group.members?.length || 0} members</span>
                <span className="text-sm">•</span>
                <span className="text-sm">📧 Auto-invitations</span>
                <span className="text-sm">•</span>
                <span className="text-sm">📅 Calendar sync</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability Display */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-green-500" />
              <span>Available Times - {DAY_LABELS[selectedDay]}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filteredSlots.length} slot{filteredSlots.length !== 1 ? 's' : ''}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSlots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDaysIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No availability for {DAY_LABELS[selectedDay]}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {mode === 'collective'
                  ? 'No overlapping time slots found for group members'
                  : 'No individual time slots available from group members'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {viewMode === 'grid' ? (
                <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="normal">
                  {filteredSlots.map((slot, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-5 rounded-xl border-2 transition-all duration-300 min-h-[160px] flex flex-col justify-between",
                        mode === 'collective' && group.createdBy === userProfile?.id
                          ? "border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30"
                          : "border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1">
                        {mode === 'collective' ? (
                          <div className="space-y-3">
                            <div className={cn(
                              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                              getAvailabilityColor((slot as CollectiveSlot).availableMembers.length, (slot as CollectiveSlot).totalMembers)
                            )}>
                              {(slot as CollectiveSlot).availableMembers.length}/{(slot as CollectiveSlot).totalMembers} available
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                              {(slot as CollectiveSlot).availableMembers.length === (slot as CollectiveSlot).totalMembers
                                ? 'All members available'
                                : `${(slot as CollectiveSlot).availableMembers.length} of ${(slot as CollectiveSlot).totalMembers} members`
                              }
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {(slot as RoundRobinSlot).assignedMember.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {(slot as RoundRobinSlot).assignedMember.includes('@')
                                  ? (slot as RoundRobinSlot).assignedMember.split('@')[0]
                                  : `Member ${(slot as RoundRobinSlot).assignedMember.slice(-4)}`
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Book Meeting Button for Grid View */}
                      {mode === 'collective' && group.createdBy === userProfile?.id && (
                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-600">
                          <Button
                            size="sm"
                            onClick={() => handleSlotBooking(slot as CollectiveSlot)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-sm py-2.5 rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 border-0 flex items-center justify-center space-x-2"
                          >
                            <CalendarDaysIcon className="h-4 w-4" />
                            <span>Book Meeting</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </ResponsiveGrid>
              ) : (
                <div className="space-y-3">
                  {filteredSlots.map((slot, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-xl transition-all duration-300 min-h-[80px]",
                        mode === 'collective' && group.createdBy === userProfile?.id
                          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 hover:shadow-lg hover:border-green-400 dark:hover:border-green-600"
                          : "bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {mode === 'collective' ? (
                            <>
                              <div className={cn(
                                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                                getAvailabilityColor((slot as CollectiveSlot).availableMembers.length, (slot as CollectiveSlot).totalMembers)
                              )}>
                                {(slot as CollectiveSlot).availableMembers.length}/{(slot as CollectiveSlot).totalMembers}
                              </div>
                            </>
                          ) : (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {(slot as RoundRobinSlot).assignedMember.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {(slot as RoundRobinSlot).assignedMember.includes('@')
                                ? (slot as RoundRobinSlot).assignedMember.split('@')[0]
                                : `Member ${(slot as RoundRobinSlot).assignedMember.slice(-4)}`
                              }
                            </span>
                          </div>
                        )}
                        </div>

                        {/* Book Meeting Button for Group Creators */}
                        {mode === 'collective' && (
                          group.createdBy === userProfile?.id ? (
                            <Button
                              size="sm"
                              onClick={() => handleSlotBooking(slot as CollectiveSlot)}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-0 min-w-[120px] flex items-center justify-center space-x-2"
                            >
                              <CalendarDaysIcon className="h-4 w-4" />
                              <span>Book Meeting</span>
                            </Button>
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400 italic min-w-[120px] text-center">
                              Only creator can book
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Toggle */}
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">
                Scheduling Mode
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {mode === 'collective'
                  ? 'Shows overlapping availability where multiple members are free'
                  : 'Shows individual member availability in rotation'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
              <Button
                variant={mode === 'collective' ? 'primary' : 'ghost'}
                size="sm"
                className="text-sm"
                onClick={() => setMode('collective')}
              >
                Collective
              </Button>
              <Button
                variant={mode === 'round-robin' ? 'primary' : 'ghost'}
                size="sm"
                className="text-sm"
                onClick={() => setMode('round-robin')}
              >
                Round-robin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Modal */}
      {showBookingModal && selectedBookingSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-0 max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Book Meeting</CardTitle>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Selected Time Slot Info */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                    Selected Time Slot
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-green-700 dark:text-green-300">
                    <span>📅 {DAY_LABELS[selectedBookingSlot.day]}</span>
                    <span>🕐 {formatTime(selectedBookingSlot.start)} - {formatTime(selectedBookingSlot.end)}</span>
                    <span>👥 {selectedBookingSlot.availableMembers.length}/{selectedBookingSlot.totalMembers} members available</span>
                  </div>
                </div>

                {/* Meeting Details Form */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Meeting Title *
                    </label>
                    <input
                      type="text"
                      value={bookingDetails.title}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Team Planning Meeting"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={bookingDetails.description}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the meeting..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Duration
                      </label>
                      <select
                        value={bookingDetails.duration}
                        onChange={(e) => setBookingDetails(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={90}>1.5 hours</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Date *
                      </label>
                      <select
                        value={bookingDetails.selectedDate ? bookingDetails.selectedDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => setBookingDetails(prev => ({
                          ...prev,
                          selectedDate: e.target.value ? new Date(e.target.value) : null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select a date</option>
                        {availableDates
                          .filter(date => {
                            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklyAvailability;
                            return dayName === selectedBookingSlot.day;
                          })
                          .map(date => (
                            <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                              {date.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={bookingDetails.location}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Conference Room A or Online"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Meeting Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={bookingDetails.meetingLink}
                      onChange={(e) => setBookingDetails(prev => ({ ...prev, meetingLink: e.target.value }))}
                      placeholder="e.g., https://zoom.us/j/123456789"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-600">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">
                      Ready to book this meeting?
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      All group members will receive email invitations and calendar reservations
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setShowBookingModal(false)}
                      disabled={bookingLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmBooking}
                      disabled={bookingLoading || !bookingDetails.title.trim() || !bookingDetails.selectedDate}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {bookingLoading ? 'Booking...' : 'Book Meeting'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}