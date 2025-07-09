'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  LinkIcon, 
  ClipboardDocumentIcon, 
  EyeIcon,
  UserGroupIcon,
  GlobeAltIcon 
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface UserWithBookingLink {
  id: string;
  displayName: string;
  username: string;
  bookingUrl: string;
  photoURL?: string;
  bookingPageTitle?: string;
  bookingPageDescription?: string;
  isCurrentUser?: boolean;
}

export function AllUserLinks() {
  const { userProfile } = useAuth();
  const { addNotification } = useNotifications();
  const [users, setUsers] = useState<UserWithBookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [userProfile]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all users
      const usersSnapshot = await getDocs(
        query(collection(db, 'users'), orderBy('displayName'))
      );
      
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      
      // Get all profiles to check if booking is enabled
      const profilesSnapshot = await getDocs(
        query(collection(db, 'userProfiles'), where('publicBookingEnabled', '==', true))
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
        .map(user => {
          const profile = profilesMap.get(user.id);
          return {
            id: user.id,
            displayName: user.displayName,
            username: user.username!,
            photoURL: user.photoURL,
            bookingUrl: `/schedule/${user.username}`,
            bookingPageTitle: profile?.bookingPageTitle,
            bookingPageDescription: profile?.bookingPageDescription,
            isCurrentUser: user.id === userProfile?.id,
          };
        })
        .sort((a, b) => {
          // Put current user first, then sort alphabetically
          if (a.isCurrentUser) return -1;
          if (b.isCurrentUser) return 1;
          return a.displayName.localeCompare(b.displayName);
        });
      
      setUsers(activeBookingUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      addNotification({
        type: 'error',
        title: 'Failed to Load Users',
        message: 'Could not load user booking links. Please try again.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyBookingUrl = async (url: string, userName: string) => {
    try {
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(url);
      
      addNotification({
        type: 'success',
        title: 'Link Copied!',
        message: `${userName}'s booking link copied to clipboard`,
        duration: 3000,
      });
      
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Error copying URL:', error);
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Could not copy link to clipboard',
        duration: 5000,
      });
    }
  };

  const openBookingUrl = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserGroupIcon className="h-6 w-6 text-purple-500" />
            <span>All User Booking Links</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserGroupIcon className="h-6 w-6 text-purple-500" />
            <span>All User Booking Links</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <GlobeAltIcon className="h-16 w-16 text-slate-400 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            No Active Booking Pages
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            No users have enabled public booking pages yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-white dark:bg-slate-800 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="h-6 w-6 text-purple-500" />
            <span>All User Booking Links</span>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className={`relative group p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                user.isCurrentUser
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              {/* Current user badge */}
              {user.isCurrentUser && (
                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                  You
                </div>
              )}

              {/* User info */}
              <div className="flex items-start space-x-3 mb-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-slate-800"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {user.displayName.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {user.displayName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    @{user.username}
                  </p>
                </div>
              </div>

              {/* Booking page info */}
              {(user.bookingPageTitle || user.bookingPageDescription) && (
                <div className="mb-3 text-sm">
                  {user.bookingPageTitle && (
                    <p className="font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                      {user.bookingPageTitle}
                    </p>
                  )}
                  {user.bookingPageDescription && (
                    <p className="text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {user.bookingPageDescription}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400">
                  <LinkIcon className="h-3 w-3" />
                  <span className="truncate max-w-24">/{user.username}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => copyBookingUrl(user.bookingUrl, user.displayName)}
                    className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors group-hover:bg-white dark:group-hover:bg-slate-600"
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
                    className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition-colors group-hover:bg-white dark:group-hover:bg-slate-600"
                    title="Open booking page"
                  >
                    <EyeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
