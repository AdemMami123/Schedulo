import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserProfile } from '@/types';

export interface UserWithProfile {
  user: User;
  profile: UserProfile | null;
  email: string;
}

/**
 * Find users by their email addresses and get their profiles
 */
export async function getUsersByEmails(emails: string[]): Promise<UserWithProfile[]> {
  if (emails.length === 0) return [];

  try {
    const results: UserWithProfile[] = [];

    // Get all users first
    const usersQuery = await getDocs(collection(db, 'users'));
    const userEmailToDataMap = new Map<string, { user: User; userId: string }>();
    
    usersQuery.docs.forEach(doc => {
      const userData = doc.data() as User;
      if (userData.email && emails.includes(userData.email)) {
        userEmailToDataMap.set(userData.email, {
          user: { ...userData, id: doc.id },
          userId: doc.id
        });
      }
    });

    // Get profiles for found users
    for (const email of emails) {
      const userData = userEmailToDataMap.get(email);
      
      if (userData) {
        // Try to get the user's profile
        let profile: UserProfile | null = null;
        try {
          const profileQuery = query(
            collection(db, 'userProfiles'),
            where('userId', '==', userData.userId)
          );
          const profileSnapshot = await getDocs(profileQuery);
          
          if (!profileSnapshot.empty) {
            const profileDoc = profileSnapshot.docs[0];
            profile = {
              id: profileDoc.id,
              ...profileDoc.data()
            } as UserProfile;
          }
        } catch (error) {
          console.error(`Error fetching profile for user ${userData.userId}:`, error);
        }

        results.push({
          user: userData.user,
          profile,
          email
        });
      } else {
        // User not found - they might not have signed up yet
        results.push({
          user: {
            id: '',
            email,
            displayName: email.split('@')[0],
            timezone: 'UTC',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          profile: null,
          email
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching users by emails:', error);
    return [];
  }
}

/**
 * Check if a user exists by email
 */
export async function userExistsByEmail(email: string): Promise<boolean> {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email)
    );
    const snapshot = await getDocs(usersQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    return false;
  }
}

/**
 * Get user profile by user ID
 */
export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  try {
    const profileQuery = query(
      collection(db, 'userProfiles'),
      where('userId', '==', userId)
    );
    const profileSnapshot = await getDocs(profileQuery);
    
    if (!profileSnapshot.empty) {
      const profileDoc = profileSnapshot.docs[0];
      return {
        id: profileDoc.id,
        ...profileDoc.data()
      } as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching profile for user ${userId}:`, error);
    return null;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
