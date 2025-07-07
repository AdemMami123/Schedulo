'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserProfile } from '@/types';
import { LinkIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface UserWithBookingLink {
  id: string;
  displayName: string;
  username: string | undefined;
  bookingUrl: string;
  photoURL?: string;
}

export function SidebarUserLinks() {
  const [users, setUsers] = useState<UserWithBookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get users with active booking pages
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), orderBy('displayName'), limit(5))
      );
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // Get profiles to check if booking is enabled
      const userIds = usersData.map(user => user.id);
      const profilesSnapshot = await getDocs(
        query(collection(db, 'userProfiles'), where('userId', 'in', userIds))
      );
      
      // Create a map of userId to profile
      const profilesMap = new Map<string, UserProfile>();
      profilesSnapshot.docs.forEach(doc => {
        const profile = doc.data() as UserProfile;
        profilesMap.set(profile.userId, profile);
      });
      
      // Filter users with active booking pages and map to the required format
      const activeBookingUsers = usersData
        .filter(user => {
          const profile = profilesMap.get(user.id);
          return profile?.publicBookingEnabled && user.username;
        })
        .map(user => ({
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          photoURL: user.photoURL,
          bookingUrl: `/schedule/${user.username}`,
        }));
      
      setUsers(activeBookingUsers);
    } catch (error) {
      console.error('Error loading users for sidebar:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyBookingUrl = async (url: string) => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
    }
  };

  const openBookingUrl = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
        Loading users...
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
        No users with active booking pages
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <div 
          key={user.id} 
          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center space-x-2 min-w-0">
            {user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.displayName}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {user.displayName.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium truncate">{user.displayName}</span>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={() => copyBookingUrl(user.bookingUrl)}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              title="Copy booking link"
            >
              {copiedUrl === user.bookingUrl ? (
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              ) : (
                <ClipboardDocumentIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              )}
            </button>
            <button
              onClick={() => openBookingUrl(user.bookingUrl)}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-md transition-colors ml-1"
              title="Open booking page"
            >
              <LinkIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>
          </div>
        </div>
      ))}
      
      <a 
        href="/accounts"
        className="block text-center text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
      >
        View all accounts
      </a>
    </div>
  );
}
