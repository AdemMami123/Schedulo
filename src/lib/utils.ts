import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString();
}

export function convertToTimeZone(date: Date, timezone: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  bufferTime: number = 0
): string[] {
  const slots: string[] = [];
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  let current = start;
  while (current + duration <= end) {
    slots.push(formatTimeSlot(current));
    current += duration + bufferTime;
  }
  
  return slots;
}

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTimeSlot(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateUsername(displayName: string): string {
  const baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  
  // Add a timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString().slice(-6);
  return `${baseUsername}${timestamp}`;
}

export async function generateUniqueUsername(displayName: string, db: any): Promise<string> {
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  
  let baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15); // Leave room for suffix
  
  // If base username is empty, use 'user'
  if (!baseUsername) {
    baseUsername = 'user';
  }
  
  let username = baseUsername;
  let counter = 1;
  
  // Check if username exists and find a unique one
  while (true) {
    const usernameQuery = query(
      collection(db, 'users'),
      where('username', '==', username)
    );
    
    const querySnapshot = await getDocs(usernameQuery);
    
    if (querySnapshot.empty) {
      // Username is unique, we can use it
      return username;
    }
    
    // Username exists, try with a number suffix
    username = `${baseUsername}${counter}`;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 999) {
      // Fallback: use timestamp
      const timestamp = Date.now().toString().slice(-6);
      return `${baseUsername}${timestamp}`;
    }
  }
}

export function getWeekDays(): string[] {
  return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
