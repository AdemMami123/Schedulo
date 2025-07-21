import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  GroupBooking,
  GroupMeetingRequest,
  GroupBookingStatus,
  AttendeeStatus,
  GroupAvailabilitySlot,
  MeetingInvitation,
  DayOfWeek
} from '@/types/groupBooking';
import { UserWithProfile } from '@/lib/userLookup';
import { WeeklyAvailability } from '@/types/index';

// Fallback UUID generator
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export class GroupBookingService {
  
  /**
   * Create a group meeting booking
   */
  static async createGroupBooking(request: GroupMeetingRequest): Promise<string> {
    try {
      // Validate request
      if (!request.groupId || !request.title || !request.preferredDate || !request.duration) {
        throw new Error('Missing required fields for group booking');
      }

      if (request.duration < 15 || request.duration > 480) {
        throw new Error('Duration must be between 15 and 480 minutes');
      }

      // Calculate end time based on duration
      const endTime = new Date(request.preferredDate.getTime() + request.duration * 60000);
      
      // Create attendees list
      const attendees = [
        ...request.requiredAttendees?.map(email => ({
          email,
          name: email.split('@')[0], // Default name from email
          status: AttendeeStatus.PENDING,
          notes: undefined
        })) || [],
        ...request.optionalAttendees?.map(email => ({
          email,
          name: email.split('@')[0],
          status: AttendeeStatus.PENDING,
          notes: undefined
        })) || []
      ];

      const bookingData: Omit<GroupBooking, 'id'> = {
        groupId: request.groupId,
        organizerId: '', // Will be set by the calling component
        title: request.title,
        description: request.description,
        startTime: request.preferredDate,
        endTime,
        duration: request.duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: GroupBookingStatus.PENDING,
        attendees,
        meetingType: request.meetingType,
        location: request.location,
        meetingLink: request.meetingLink,
        agenda: request.agenda,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'groupBookings'), {
        ...bookingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create meeting invitations
      await this.createMeetingInvitations(docRef.id, attendees.map(a => a.email));

      return docRef.id;
    } catch (error) {
      console.error('Error creating group booking:', error);
      throw error;
    }
  }

  /**
   * Create meeting invitations for attendees
   */
  static async createMeetingInvitations(bookingId: string, attendeeEmails: string[]): Promise<void> {
    try {
      if (!bookingId || !attendeeEmails || attendeeEmails.length === 0) {
        throw new Error('Invalid booking ID or attendee emails');
      }

      // Filter out invalid emails
      const validEmails = attendeeEmails.filter(email =>
        email && email.includes('@') && email.includes('.')
      );

      if (validEmails.length === 0) {
        throw new Error('No valid email addresses provided');
      }

      const invitations = validEmails.map(email => ({
        bookingId,
        attendeeEmail: email,
        token: generateUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: serverTimestamp()
      }));

      // Add all invitations to Firestore
      const batch = invitations.map(invitation => 
        addDoc(collection(db, 'meetingInvitations'), invitation)
      );

      await Promise.all(batch);
    } catch (error) {
      console.error('Error creating meeting invitations:', error);
      throw error;
    }
  }

  /**
   * Calculate group availability slots
   */
  static calculateGroupAvailability(
    usersWithProfiles: UserWithProfile[],
    days: number = 7
  ): GroupAvailabilitySlot[] {
    const slots: GroupAvailabilitySlot[] = [];
    const today = new Date();
    
    // Get users with valid profiles
    const validUsers = usersWithProfiles.filter(uwp => 
      uwp.profile?.weeklyAvailability
    );

    if (validUsers.length === 0) return slots;

    // Generate slots for the next 'days' days
    for (let dayOffset = 0; dayOffset < days; dayOffset++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + dayOffset);
      
      // Get the day name in the correct format for our availability system
      const dayIndex = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayIndex] as DayOfWeek;
      
      // Collect all time slots for this day
      const daySlots: Array<{ start: string; end: string; userEmail: string }> = [];
      
      validUsers.forEach(uwp => {
        const dayAvailability = uwp.profile?.weeklyAvailability?.[dayName];
        if (dayAvailability?.enabled && dayAvailability.timeSlots) {
          dayAvailability.timeSlots.forEach((slot: any) => {
            daySlots.push({
              start: slot.start,
              end: slot.end,
              userEmail: uwp.email
            });
          });
        }
      });

      // Find overlapping time periods
      const timePoints = new Set<string>();
      daySlots.forEach(slot => {
        timePoints.add(slot.start);
        timePoints.add(slot.end);
      });

      const sortedTimes = Array.from(timePoints).sort();

      // Create availability slots
      for (let i = 0; i < sortedTimes.length - 1; i++) {
        const startTime = sortedTimes[i];
        const endTime = sortedTimes[i + 1];
        
        // Find available members for this time period
        const availableMembers = validUsers
          .filter(uwp => {
            const dayAvailability = uwp.profile?.weeklyAvailability?.[dayName];
            if (!dayAvailability?.enabled) return false;

            return dayAvailability.timeSlots.some((slot: any) =>
              slot.start <= startTime && slot.end >= endTime
            );
          })
          .map(uwp => uwp.email);

        if (availableMembers.length > 0) {
          // Create Date objects for start and end times
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          const slotStart = new Date(currentDate);
          slotStart.setHours(startHour, startMinute, 0, 0);
          
          const slotEnd = new Date(currentDate);
          slotEnd.setHours(endHour, endMinute, 0, 0);

          // Determine confidence level
          const availabilityRatio = availableMembers.length / validUsers.length;
          let confidence: 'high' | 'medium' | 'low';
          if (availabilityRatio >= 0.8) confidence = 'high';
          else if (availabilityRatio >= 0.5) confidence = 'medium';
          else confidence = 'low';

          slots.push({
            start: slotStart,
            end: slotEnd,
            availableMembers,
            totalMembers: validUsers.length,
            day: dayName,
            confidence
          });
        }
      }
    }

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Send group meeting invitations via email
   */
  static async sendGroupMeetingInvitations(
    booking: GroupBooking,
    organizerName: string
  ): Promise<void> {
    try {
      if (!booking || !booking.attendees || booking.attendees.length === 0) {
        throw new Error('Invalid booking or no attendees');
      }

      if (!organizerName) {
        throw new Error('Organizer name is required');
      }

      const emailPromises = booking.attendees.map(async (attendee) => {
        // Get invitation token
        const invitationsQuery = query(
          collection(db, 'meetingInvitations'),
          where('bookingId', '==', booking.id),
          where('attendeeEmail', '==', attendee.email)
        );
        
        const invitationsSnapshot = await getDocs(invitationsQuery);
        let invitationToken = '';
        
        if (!invitationsSnapshot.empty) {
          invitationToken = invitationsSnapshot.docs[0].data().token;
        }

        // Send email via API
        return fetch('/api/email/group-meeting-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking,
            attendee,
            organizerName,
            invitationToken
          }),
        });
      });

      await Promise.all(emailPromises);
    } catch (error) {
      console.error('Error sending group meeting invitations:', error);
      throw error;
    }
  }

  /**
   * Update attendee response
   */
  static async updateAttendeeResponse(
    bookingId: string,
    attendeeEmail: string,
    status: AttendeeStatus,
    notes?: string
  ): Promise<void> {
    try {
      // Get the booking document directly by ID
      const bookingDocRef = doc(db, 'groupBookings', bookingId);
      const bookingSnapshot = await getDoc(bookingDocRef);

      if (bookingSnapshot.exists()) {
        const booking = { id: bookingId, ...bookingSnapshot.data() } as GroupBooking;
        
        // Update attendee status
        const updatedAttendees = booking.attendees.map(attendee => {
          if (attendee.email === attendeeEmail) {
            return {
              ...attendee,
              status,
              notes,
              responseTime: new Date()
            };
          }
          return attendee;
        });

        // Update the booking
        await updateDoc(bookingDocRef, {
          attendees: updatedAttendees,
          updatedAt: serverTimestamp()
        });
      } else {
        throw new Error(`Booking with ID ${bookingId} not found`);
      }
    } catch (error) {
      console.error('Error updating attendee response:', error);
      throw error;
    }
  }

  /**
   * Get group bookings for a specific group
   */
  static async getGroupBookings(groupId: string): Promise<GroupBooking[]> {
    try {
      const bookingsQuery = query(
        collection(db, 'groupBookings'),
        where('groupId', '==', groupId)
      );
      
      const snapshot = await getDocs(bookingsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime),
          endTime: data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)
        } as GroupBooking;
      });
    } catch (error) {
      console.error('Error getting group bookings:', error);
      throw error;
    }
  }
}
