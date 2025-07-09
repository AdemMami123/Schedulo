'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { User as AppUser } from '@/types';
import { generateUniqueUsername } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  userProfile: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        await loadUserProfile(firebaseUser);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (firebaseUser: User) => {
    try {
      // First try to get the user document
      let userData;
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        userData = userDoc.exists() ? userDoc.data() : null;
      } catch (error) {
        console.warn('Error reading user document, will create new user:', error);
        userData = null;
      }
      
      if (userData) {
        // Check if username exists, if not generate one
        let username = userData.username;
        if (!username) {
          username = await generateUniqueUsername(firebaseUser.displayName!, db);
          // Try to update the user document with the generated username
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              username,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } catch (error) {
            console.warn('Could not update username, using generated one locally:', error);
          }
        }
        
        setUserProfile({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName!,
          photoURL: firebaseUser.photoURL || undefined,
          timezone: userData.timezone || 'UTC',
          username,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        });
      } else {
        // Create new user profile
        const username = await generateUniqueUsername(firebaseUser.displayName!, db);
        const newUser: Partial<AppUser> = {
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName!,
          photoURL: firebaseUser.photoURL || undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          username,
        };

        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), {
            ...newUser,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.warn('Could not create user document, using local profile:', error);
        }

        setUserProfile({
          id: firebaseUser.uid,
          ...newUser,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as AppUser);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Fallback: create a basic user profile from Firebase data
      const username = await generateUniqueUsername(firebaseUser.displayName!, db);
      setUserProfile({
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName!,
        photoURL: firebaseUser.photoURL || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        username,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signInWithGoogle,
    logout,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
