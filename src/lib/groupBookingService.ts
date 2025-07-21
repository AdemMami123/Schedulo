import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  GroupBooking,
  GroupMeetingRequest,
  GroupBookingStatus,
  AttendeeStatus,
  GroupAvailabilitySlot,
  DayOfWeek
} from '@/types/groupBooking';
import { UserWithProfile } from '@/lib/userLookup';

// Fallback UUID generator
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Utility function to clean data for Firestore (removes undefined values)
const cleanDataForFirestore = (data: any): any => {
  if (data === undefined || data === null) {
    return {};
  }

  const cleaned: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      // For strings, also check if they're not just whitespace
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          cleaned[key] = trimmed;
        }
      } else if (Array.isArray(value)) {
        // Handle arrays - recursively clean each item and filter out undefined/null values
        const cleanedArray = value
          .map(item => {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
              return cleanDataForFirestore(item);
            }
            return item;
          })
          .filter(item => item !== undefined && item !== null &&
                         (typeof item !== 'object' || Object.keys(item).length > 0));

        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } else if (typeof value === 'object' && value.constructor === Object) {
        // Handle nested objects recursively
        const cleanedObject = cleanDataForFirestore(value);
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject;
        }
      } else {
        // For other types (numbers, booleans, dates, etc.)
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
};

export class GroupBookingService {

  /**
   * Send group meeting emails using the proven simple booking email service
   */
  static async sendGroupMeetingEmails(
    bookingId: string,
    title: string,
    startTime: Date,
    endTime: Date,
    attendeeEmails: string[],
    organizerName: string,
    organizerEmail: string,
    description?: string,
    location?: string,
    meetingLink?: string
  ): Promise<void> {
    console.log('📧 GROUP EMAIL SENDING STARTED (using simple booking service)');
    console.log('📋 Parameters:', { bookingId, title, attendeeEmails, organizerName });

    try {
      const emailPromises = attendeeEmails.map(async (email, index) => {
        console.log(`📤 Sending group email ${index + 1}/${attendeeEmails.length} to: ${email}`);

        // Use the same API endpoint as simple bookings for consistency
        const response = await fetch('/api/email/group-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organizer: {
              name: organizerName,
              email: organizerEmail
            },
            attendee: {
              name: email.split('@')[0],
              email: email
            },
            meeting: {
              id: bookingId,
              title: title,
              description: description || '',
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              location: location || '',
              meetingLink: meetingLink || '',
              duration: Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))
            }
          }),
        });

        console.log(`📡 Group email API response for ${email}: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Group email failed for ${email}:`, errorText);
          throw new Error(`Failed to send email to ${email}: ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Group email sent successfully to ${email}:`, result);
        return result;
      });

      await Promise.all(emailPromises);
      console.log('🎉 ALL GROUP EMAILS SENT SUCCESSFULLY');
    } catch (error) {
      console.error('❌ Group email sending failed:', error);
      throw error;
    }
  }




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
      
      // Create attendees list without undefined values
      const attendees = [
        ...request.requiredAttendees?.map(email => ({
          email,
          name: email.split('@')[0], // Default name from email
          status: AttendeeStatus.PENDING
          // notes field omitted - will be added only when there are actual notes
        })) || [],
        ...request.optionalAttendees?.map(email => ({
          email,
          name: email.split('@')[0],
          status: AttendeeStatus.PENDING
          // notes field omitted - will be added only when there are actual notes
        })) || []
      ];

      // Create booking data with only defined values
      const bookingData: any = {
        groupId: request.groupId,
        organizerId: request.organizerEmail || '', // Use organizer email as fallback
        organizerEmail: request.organizerEmail,
        organizerName: request.organizerName,
        title: request.title.trim(),
        startTime: request.preferredDate,
        endTime,
        duration: request.duration,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: GroupBookingStatus.PENDING,
        attendees,
        meetingType: request.meetingType,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Only add optional fields if they have meaningful values
      if (request.description && request.description.trim()) {
        bookingData.description = request.description.trim();
      }

      if (request.location && request.location.trim()) {
        bookingData.location = request.location.trim();
      }

      if (request.meetingLink && request.meetingLink.trim()) {
        bookingData.meetingLink = request.meetingLink.trim();
      }

      if (request.agenda && request.agenda.trim()) {
        bookingData.agenda = request.agenda.trim();
      }

      // Clean data and add to Firestore
      const rawData = {
        ...bookingData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Raw booking data before cleaning:', rawData);

      const dataToSave = cleanDataForFirestore(rawData);

      console.log('Cleaned booking data:', dataToSave);

      // Deep validation for any undefined values
      const validateNoUndefined = (obj: any, path: string = ''): boolean => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (value === undefined) {
            console.error(`Found undefined value at path: ${currentPath}`);
            return false;
          }

          if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              if (value[i] === undefined) {
                console.error(`Found undefined value in array at path: ${currentPath}[${i}]`);
                return false;
              }
              if (typeof value[i] === 'object' && value[i] !== null) {
                if (!validateNoUndefined(value[i], `${currentPath}[${i}]`)) {
                  return false;
                }
              }
            }
          } else if (typeof value === 'object' && value !== null && value.constructor === Object) {
            if (!validateNoUndefined(value, currentPath)) {
              return false;
            }
          }
        }
        return true;
      };

      if (!validateNoUndefined(dataToSave)) {
        console.error('Complete data object:', JSON.stringify(dataToSave, null, 2));
        throw new Error('Data still contains undefined values after cleaning');
      }

      const docRef = await addDoc(collection(db, 'groupBookings'), dataToSave);

      // Create meeting invitations
      console.log('🎫 Creating meeting invitations...');
      await this.createMeetingInvitations(docRef.id, attendees.map(a => a.email));
      console.log('✅ Meeting invitations created successfully');

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
      console.log(`🎫 Creating invitations for booking ${bookingId}`);
      console.log(`📧 Attendee emails:`, attendeeEmails);

      if (!bookingId || !attendeeEmails || attendeeEmails.length === 0) {
        console.error('❌ Invalid booking ID or attendee emails');
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

      // Add all invitations to Firestore with cleaned data
      console.log(`💾 Saving ${invitations.length} invitations to Firestore...`);
      const batch = invitations.map((invitation, index) => {
        console.log(`💾 Saving invitation ${index + 1}: ${invitation.attendeeEmail}`);
        return addDoc(collection(db, 'meetingInvitations'), cleanDataForFirestore(invitation));
      });

      await Promise.all(batch);
      console.log('✅ All invitations saved successfully');
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
