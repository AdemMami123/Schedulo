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
  PlusIcon
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

      // Send email invitations
      const booking = {
        id: bookingId,
        ...request,
        organizerId: userProfile.id,
        startTime: request.preferredDate,
        endTime: new Date(request.preferredDate.getTime() + request.duration * 60000),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'pending' as any,
        attendees: request.requiredAttendees?.map((email: string) => ({
          email,
          name: email.split('@')[0],
          status: 'pending' as any
        })) || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await GroupBookingService.sendGroupMeetingInvitations(
        booking as any,
        userProfile.displayName || userProfile.email
      );

      // Show success message and return to availability view
      alert('Meeting scheduled successfully! Invitations have been sent to all members.');
      setViewMode('grid');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to schedule meeting. Please try again.');
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
                      className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 hover:shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-purple-500" />
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </span>
                        </div>
                      </div>

                      {mode === 'collective' ? (
                        <div className="space-y-2">
                          <div className={cn(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
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
                  ))}
                </ResponsiveGrid>
              ) : (
                <div className="space-y-3">
                  {filteredSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-purple-500" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </span>
                        </div>
                      </div>

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
    </div>
  );
}