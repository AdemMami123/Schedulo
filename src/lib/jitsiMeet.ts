/**
 * Jitsi Meet Integration Service
 * Generates Jitsi Meet links for bookings
 */

export interface JitsiMeetConfig {
  domain?: string;
  roomPrefix?: string;
  enableRecording?: boolean;
  enableTranscription?: boolean;
  requirePassword?: boolean;
}

export interface JitsiMeetRoom {
  roomName: string;
  meetingUrl: string;
  password?: string;
  moderatorUrl?: string;
}

export class JitsiMeetService {
  private readonly domain: string;
  private readonly roomPrefix: string;
  private readonly config: JitsiMeetConfig;

  constructor(config: JitsiMeetConfig = {}) {
    this.domain = config.domain || 'meet.jit.si';
    this.roomPrefix = config.roomPrefix || 'schedulo';
    this.config = config;
  }

  /**
   * Generate a unique Jitsi Meet room for a booking
   */
  public generateMeetingRoom(booking: {
    id: string;
    guestName: string;
    startTime: Date;
    userId: string;
  }): JitsiMeetRoom {
    // Create a unique room name using booking details
    const roomId = this.generateRoomId(booking);
    const roomName = `${this.roomPrefix}-${roomId}`;
    
    // Generate the meeting URL
    const meetingUrl = `https://${this.domain}/${roomName}`;
    
    // Generate password if required
    const password = this.config.requirePassword 
      ? this.generatePassword() 
      : undefined;

    // Generate moderator URL with config parameters
    const moderatorUrl = this.generateModeratorUrl(roomName, booking);

    return {
      roomName,
      meetingUrl,
      password,
      moderatorUrl,
    };
  }

  /**
   * Generate a room ID based on booking details
   */
  private generateRoomId(booking: {
    id: string;
    guestName: string;
    startTime: Date;
    userId: string;
  }): string {
    // Create a deterministic but unique room ID
    const date = booking.startTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = booking.startTime.toISOString().split('T')[1].substring(0, 5).replace(':', ''); // HHMM
    const bookingHash = this.hashString(booking.id).substring(0, 6);
    const userHash = this.hashString(booking.userId).substring(0, 4);
    
    return `${date}-${time}-${userHash}-${bookingHash}`;
  }

  /**
   * Generate a simple password for the meeting
   */
  private generatePassword(): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate moderator URL with additional parameters
   */
  private generateModeratorUrl(roomName: string, booking: {
    guestName: string;
    startTime: Date;
  }): string {
    const baseUrl = `https://${this.domain}/${roomName}`;
    const params = new URLSearchParams();
    
    // Add configuration parameters
    params.append('config.startWithAudioMuted', 'false');
    params.append('config.startWithVideoMuted', 'false');
    params.append('config.prejoinPageEnabled', 'true');
    params.append('config.requireDisplayName', 'true');
    
    // Set meeting subject
    const subject = `Meeting with ${booking.guestName}`;
    params.append('config.subject', subject);
    
    // Enable recording if configured
    if (this.config.enableRecording) {
      params.append('config.recordingService.enabled', 'true');
    }
    
    // Enable transcription if configured
    if (this.config.enableTranscription) {
      params.append('config.transcribingEnabled', 'true');
    }

    return `${baseUrl}#${params.toString()}`;
  }

  /**
   * Simple hash function for generating deterministic IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate if a Jitsi Meet URL is properly formatted
   */
  public validateMeetingUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === this.domain && urlObj.pathname.length > 1;
    } catch {
      return false;
    }
  }

  /**
   * Extract room name from a Jitsi Meet URL
   */
  public extractRoomName(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname === this.domain) {
        return urlObj.pathname.substring(1); // Remove leading slash
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a direct join URL with pre-filled user name
   */
  public generateDirectJoinUrl(
    meetingUrl: string, 
    displayName: string, 
    isHost: boolean = false
  ): string {
    try {
      const url = new URL(meetingUrl);
      const params = new URLSearchParams();
      
      params.append('config.prejoinPageEnabled', 'false');
      params.append('userInfo.displayName', displayName);
      
      if (isHost) {
        params.append('config.startWithAudioMuted', 'false');
        params.append('config.startWithVideoMuted', 'false');
      }
      
      url.hash = params.toString();
      return url.toString();
    } catch {
      return meetingUrl; // Fallback to original URL
    }
  }
}

// Create a singleton instance
export const jitsiMeetService = new JitsiMeetService({
  domain: 'meet.jit.si',
  roomPrefix: 'schedulo',
  enableRecording: false,
  enableTranscription: false,
  requirePassword: false,
});
