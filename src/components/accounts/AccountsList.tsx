'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  UserIcon,
  EnvelopeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';

interface UserWithProfile {
  user: User;
  profile?: UserProfile;
  hasBookingEnabled: boolean;
  bookingUrl: string;
}

export function AccountsList() {
  const { userProfile } = useAuth();
  const { addNotification } = useNotifications();
  const [accounts, setAccounts] = useState<UserWithProfile[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<UserWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      // Fetch all users
      const usersQuery = query(collection(db, 'users'), orderBy('displayName', 'asc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      // Fetch all user profiles
      const profilesQuery = query(collection(db, 'userProfiles'), orderBy('updatedAt', 'desc'));
      const profilesSnapshot = await getDocs(profilesQuery);
      
      // Create a map of profiles by userId
      const profilesMap = new Map<string, UserProfile>();
      profilesSnapshot.docs.forEach(doc => {
        const profile = { id: doc.id, ...doc.data() } as UserProfile;
        profilesMap.set(profile.userId, profile);
      });

      // Combine users with their profiles
      const usersList: UserWithProfile[] = usersSnapshot.docs.map(doc => {
        const user = { id: doc.id, ...doc.data() } as User;
        const profile = profilesMap.get(user.id);
        const hasBookingEnabled = profile?.publicBookingEnabled ?? false;
        const bookingUrl = user.username ? `${typeof window !== 'undefined' ? window.location.origin : 'https://schedulo.app'}/schedule/${user.username}` : '';

        return {
          user,
          profile,
          hasBookingEnabled,
          bookingUrl,
        };
      });

      setAccounts(usersList);
    } catch (error) {
      console.error('Error loading accounts:', error);
      addNotification({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load accounts. Please try again.',
        duration: 0,
        persistent: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    if (!searchTerm.trim()) {
      setFilteredAccounts(accounts);
      return;
    }

    const filtered = accounts.filter(account => 
      account.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (account.user.username && account.user.username.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredAccounts(filtered);
  };

  const copyBookingUrl = async (url: string, userName: string) => {
    if (!url) {
      addNotification({
        type: 'warning',
        title: 'No Booking URL',
        message: 'This user does not have a booking URL set up.',
        duration: 2000,
        persistent: true,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      addNotification({
        type: 'success',
        title: 'Link Copied',
        message: `Booking link for ${userName} copied to clipboard!`,
        duration: 2000,
        persistent: false,
      });
      
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      addNotification({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy booking link. Please try again.',
        duration: 0,
        persistent: true,
      });
    }
  };

  const openBookingPage = (url: string, userName: string) => {
    if (!url) {
      addNotification({
        type: 'warning',
        title: 'No Booking URL',
        message: 'This user does not have a booking URL set up.',
        duration: 2000,
        persistent: true,
      });
      return;
    }

    window.open(url, '_blank');
  };

  const getStats = () => {
    const totalAccounts = accounts.length;
    const enabledBookings = accounts.filter(a => a.hasBookingEnabled).length;
    const withUsername = accounts.filter(a => a.user.username).length;
    const completedSetup = accounts.filter(a => a.user.username && a.hasBookingEnabled).length;

    return {
      totalAccounts,
      enabledBookings,
      withUsername,
      completedSetup,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            All Accounts
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            View and manage all user accounts and their booking links
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Accounts</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.totalAccounts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Booking Enabled</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.enabledBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">With Username</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.withUsername}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white dark:bg-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Setup Complete</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{stats.completedSetup}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search accounts by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <UserGroupIcon className="h-12 w-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {searchTerm ? 'No accounts found' : 'No accounts yet'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Accounts will appear here as users sign up'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => (
            <Card key={account.user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {account.user.photoURL ? (
                        <img
                          src={account.user.photoURL}
                          alt={account.user.displayName}
                          className="w-12 h-12 rounded-full ring-2 ring-slate-200 dark:ring-slate-600"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                          {account.user.displayName}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {account.hasBookingEnabled ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              <CheckCircleIconSolid className="h-3 w-3 mr-1" />
                              Booking Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Booking Disabled
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                          <EnvelopeIcon className="h-4 w-4" />
                          <span>{account.user.email}</span>
                        </div>
                        
                        {account.user.username ? (
                          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                            <LinkIcon className="h-4 w-4" />
                            <span className="font-mono">@{account.user.username}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-500">
                            <XCircleIcon className="h-4 w-4" />
                            <span className="italic">No username set</span>
                          </div>
                        )}

                        {account.profile?.timezone && (
                          <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                            <ClockIcon className="h-4 w-4" />
                            <span>{account.profile.timezone}</span>
                          </div>
                        )}

                        {account.bookingUrl && (
                          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <GlobeAltIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <code className="text-sm font-mono text-slate-600 dark:text-slate-400 truncate">
                                  {account.bookingUrl}
                                </code>
                              </div>
                              <div className="flex items-center space-x-2 ml-2">
                                <button
                                  onClick={() => copyBookingUrl(account.bookingUrl, account.user.displayName)}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                  title="Copy booking URL"
                                >
                                  {copiedUrl === account.bookingUrl ? (
                                    <CheckCircleIconSolid className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => openBookingPage(account.bookingUrl, account.user.displayName)}
                                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                                  title="Open booking page"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {account.bookingUrl && (
                      <>
                        <button
                          onClick={() => copyBookingUrl(account.bookingUrl, account.user.displayName)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Copy booking link"
                        >
                          <ClipboardDocumentIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openBookingPage(account.bookingUrl, account.user.displayName)}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Open booking page"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {accounts.length > 0 && (
        <Card className="border-0 bg-slate-50 dark:bg-slate-800/50">
          <CardContent className="p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Showing {filteredAccounts.length} of {accounts.length} accounts
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
