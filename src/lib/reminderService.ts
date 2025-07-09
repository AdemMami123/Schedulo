import { collection, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Booking, BookingStatus, UserProfile } from '@/types';

interface ReminderJob {
  bookingId: string;
  userId: string;
  guestEmail: string;
  guestName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  reminderTime: Date;
  reminderMessage?: string;
  sent: boolean;
}

export class ReminderSchedulingService {
  private static instance: ReminderSchedulingService;
  private reminderJobs: Map<string, ReminderJob> = new Map();
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): ReminderSchedulingService {
    if (!ReminderSchedulingService.instance) {
      ReminderSchedulingService.instance = new ReminderSchedulingService();
    }
    return ReminderSchedulingService.instance;
  }

  /**
   * Schedule a reminder for a booking
   */
  public async scheduleReminder(booking: Booking): Promise<void> {
    try {
      // Get user profile to check reminder settings
      const userDoc = await getDoc(doc(db, 'users', booking.userId));
      if (!userDoc.exists()) {
        console.log('User profile not found for booking:', booking.id);
        return;
      }

      const userProfile = userDoc.data() as UserProfile;
      
      // Check if reminders are enabled
      if (!userProfile.enableReminders) {
        console.log('Reminders disabled for user:', booking.userId);
        return;
      }

      // Only schedule reminders for confirmed bookings
      if (booking.status !== BookingStatus.CONFIRMED) {
        console.log('Booking not confirmed, skipping reminder scheduling:', booking.id);
        return;
      }

      // Calculate reminder time
      const reminderTimeHours = userProfile.reminderTime || 24; // Default to 24 hours
      const reminderTime = new Date(booking.startTime.getTime() - (reminderTimeHours * 60 * 60 * 1000));

      // Don't schedule if reminder time is in the past
      if (reminderTime.getTime() <= Date.now()) {
        console.log('Reminder time is in the past, skipping:', booking.id);
        return;
      }

      const reminderJob: ReminderJob = {
        bookingId: booking.id,
        userId: booking.userId,
        guestEmail: booking.guestEmail,
        guestName: booking.guestName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        duration: booking.duration,
        reminderTime,
        reminderMessage: userProfile.customReminderMessage,
        sent: false
      };

      // Store the reminder job
      this.reminderJobs.set(booking.id, reminderJob);
      
      console.log(`Reminder scheduled for booking ${booking.id} at ${reminderTime.toISOString()}`);
      
      // Start the reminder processor if not already running
      if (!this.isRunning) {
        this.startReminderProcessor();
      }
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  }

  /**
   * Cancel a reminder for a booking
   */
  public cancelReminder(bookingId: string): void {
    if (this.reminderJobs.has(bookingId)) {
      this.reminderJobs.delete(bookingId);
      console.log(`Reminder cancelled for booking: ${bookingId}`);
    }
  }

  /**
   * Update reminder when booking is updated
   */
  public async updateReminder(booking: Booking): Promise<void> {
    // Cancel existing reminder
    this.cancelReminder(booking.id);
    
    // Schedule new reminder if booking is confirmed
    if (booking.status === BookingStatus.CONFIRMED) {
      await this.scheduleReminder(booking);
    }
  }

  /**
   * Start the background processor that checks for reminders to send
   */
  private startReminderProcessor(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Starting reminder processor...');
    
    // Check every minute for reminders to send
    const interval = setInterval(async () => {
      try {
        await this.processReminders();
      } catch (error) {
        console.error('Error processing reminders:', error);
      }
    }, 60000); // Check every minute

    // Stop the processor if there are no more reminders
    const checkIfEmpty = setInterval(() => {
      if (this.reminderJobs.size === 0) {
        clearInterval(interval);
        clearInterval(checkIfEmpty);
        this.isRunning = false;
        console.log('Reminder processor stopped - no more reminders');
      }
    }, 300000); // Check every 5 minutes
  }

  /**
   * Process reminders that are due to be sent
   */
  private async processReminders(): Promise<void> {
    const now = Date.now();
    const remindersToSend: ReminderJob[] = [];

    // Find reminders that are due
    for (const [bookingId, job] of this.reminderJobs.entries()) {
      if (!job.sent && job.reminderTime.getTime() <= now) {
        remindersToSend.push(job);
      }
    }

    if (remindersToSend.length === 0) {
      return;
    }

    console.log(`Processing ${remindersToSend.length} reminder(s)...`);

    // Send reminders
    for (const job of remindersToSend) {
      try {
        await this.sendReminder(job);
        
        // Mark as sent
        job.sent = true;
        this.reminderJobs.set(job.bookingId, job);
        
        console.log(`Reminder sent for booking: ${job.bookingId}`);
      } catch (error) {
        console.error(`Failed to send reminder for booking ${job.bookingId}:`, error);
      }
    }

    // Clean up sent reminders
    this.cleanupSentReminders();
  }

  /**
   * Send a reminder email
   */
  private async sendReminder(job: ReminderJob): Promise<void> {
    try {
      // Get user data (not profile) for host information
      const userDoc = await getDoc(doc(db, 'users', job.userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Get user profile for reminder settings
      const userProfileDoc = await getDoc(doc(db, 'userProfiles', job.userId));
      const userProfile = userProfileDoc.exists() ? userProfileDoc.data() as UserProfile : null;

      // Send reminder email via API
      const response = await fetch('/api/email/reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking: {
            id: job.bookingId,
            guestName: job.guestName,
            guestEmail: job.guestEmail,
            startTime: job.startTime.toISOString(),
            endTime: job.endTime.toISOString(),
            duration: job.duration,
            guestNotes: ''
          },
          host: {
            displayName: userData.displayName || 'Host',
            email: userData.email || ''
          },
          reminderMessage: job.reminderMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.error}`);
      }

      const result = await response.json();
      console.log('Reminder email sent successfully:', result.messageId);
    } catch (error) {
      console.error('Error sending reminder email:', error);
      throw error;
    }
  }

  /**
   * Clean up sent reminders
   */
  private cleanupSentReminders(): void {
    const now = Date.now();
    const sentReminders: string[] = [];

    for (const [bookingId, job] of this.reminderJobs.entries()) {
      // Remove sent reminders or those that are past the booking time
      if (job.sent || job.startTime.getTime() <= now) {
        sentReminders.push(bookingId);
      }
    }

    sentReminders.forEach(bookingId => {
      this.reminderJobs.delete(bookingId);
    });

    if (sentReminders.length > 0) {
      console.log(`Cleaned up ${sentReminders.length} sent reminder(s)`);
    }
  }

  /**
   * Get all scheduled reminders (for debugging)
   */
  public getScheduledReminders(): ReminderJob[] {
    return Array.from(this.reminderJobs.values());
  }

  /**
   * Initialize reminders for existing bookings on app start
   */
  public async initializeReminders(): Promise<void> {
    try {
      console.log('Initializing reminders for existing bookings...');
      
      // Get all confirmed bookings that haven't started yet
      const bookingsRef = collection(db, 'bookings');
      const now = Timestamp.now();
      const confirmedBookingsQuery = query(
        bookingsRef,
        where('status', '==', BookingStatus.CONFIRMED),
        where('startTime', '>', now)
      );

      const snapshot = await getDocs(confirmedBookingsQuery);
      
      for (const doc of snapshot.docs) {
        const booking = {
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime.toDate(),
          createdAt: doc.data().createdAt.toDate(),
          updatedAt: doc.data().updatedAt.toDate()
        } as Booking;

        await this.scheduleReminder(booking);
      }

      console.log(`Initialized ${this.reminderJobs.size} reminder(s)`);
    } catch (error) {
      console.error('Error initializing reminders:', error);
    }
  }
}

// Export singleton instance
export const reminderService = ReminderSchedulingService.getInstance();
