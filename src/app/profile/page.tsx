'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { doc, updateDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { UserIcon, LinkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { addNotification } = useNotifications();
  
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userProfile?.username) {
      setUsername(userProfile.username);
      setOriginalUsername(userProfile.username);
    }
  }, [userProfile]);

  const validateUsername = async (newUsername: string) => {
    if (!newUsername) {
      setUsernameError('Username is required');
      return false;
    }

    // Check format
    const usernameRegex = /^[a-z0-9_-]+$/;
    if (!usernameRegex.test(newUsername)) {
      setUsernameError('Username can only contain lowercase letters, numbers, underscores, and hyphens');
      return false;
    }

    if (newUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters long');
      return false;
    }

    if (newUsername.length > 30) {
      setUsernameError('Username must be less than 30 characters');
      return false;
    }

    // If username hasn't changed, it's valid
    if (newUsername === originalUsername) {
      setUsernameError('');
      return true;
    }

    // Check if username is already taken
    setIsValidating(true);
    try {
      const usernameQuery = query(
        collection(db, 'users'),
        where('username', '==', newUsername.toLowerCase())
      );
      
      const querySnapshot = await getDocs(usernameQuery);
      
      if (!querySnapshot.empty) {
        setUsernameError('This username is already taken');
        return false;
      }

      setUsernameError('');
      return true;
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleUsernameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(newUsername);
    
    if (newUsername !== originalUsername) {
      // Debounce validation
      setTimeout(() => {
        validateUsername(newUsername);
      }, 500);
    } else {
      setUsernameError('');
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !userProfile) return;

    const isValid = await validateUsername(username);
    if (!isValid) return;

    setSaving(true);
    try {
      // Update in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        username: username.toLowerCase(),
        updatedAt: new Date()
      });

      // Refresh user profile
      await refreshUserProfile();
      
      setOriginalUsername(username);
      
      addNotification({
        type: 'success',
        title: 'Username Updated',
        message: 'Your username has been successfully updated.',
        duration: 3000
      });
    } catch (error) {
      console.error('Error updating username:', error);
      addNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update username. Please try again.',
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  const copyBookingLink = () => {
    if (!userProfile?.username) return;
    
    const bookingUrl = `${window.location.origin}/schedule/${userProfile.username}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    
    setTimeout(() => setCopied(false), 2000);
    
    addNotification({
      type: 'success',
      title: 'Link Copied',
      message: 'Your booking link has been copied to clipboard.',
      duration: 2000
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <p className="text-gray-500">Please log in to view your profile.</p>
      </div>
    );
  }

  const bookingUrl = userProfile.username ? `${typeof window !== 'undefined' ? window.location.origin : ''}/schedule/${userProfile.username}` : '';
  const hasUsernameChanged = username !== originalUsername;
  const canSave = hasUsernameChanged && !usernameError && !isValidating;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 mobile-safe-area">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Manage your account settings and booking preferences
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Avatar and Basic Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full ring-2 ring-gray-200 dark:ring-gray-600 self-center sm:self-auto"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center self-center sm:self-auto">
                    <UserIcon className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
                <div className="text-center sm:text-left">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {user.displayName}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-all sm:break-normal">{user.email}</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Timezone: {userProfile.timezone}
                  </p>
                </div>
              </div>

              {/* Username Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Username
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">@</span>
                        <Input
                          type="text"
                          id="username"
                          value={username}
                          onChange={handleUsernameChange}
                          error={usernameError}
                          placeholder="Enter your username"
                          disabled={saving}
                          className="flex-1 text-mobile-responsive"
                        />
                        {isValidating && (
                          <div className="flex-shrink-0">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                      </div>
                      {usernameError && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{usernameError}</p>
                      )}
                      <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        Your username creates your unique booking URL. Use only lowercase letters, numbers, underscores, and hyphens.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <Button
                        onClick={handleSaveUsername}
                        disabled={!canSave || saving}
                        className="min-w-[100px] touch-target"
                      >
                        {saving ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                      </Button>
                      {hasUsernameChanged && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUsername(originalUsername);
                            setUsernameError('');
                          }}
                          disabled={saving}
                          className="touch-target"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Booking URL Preview */}
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Your Booking URL
                      </label>
                      {bookingUrl ? (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate flex-1 font-mono">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/schedule/{username || 'your-username'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={copyBookingLink}
                              disabled={!userProfile.username}
                              className="flex-shrink-0 touch-target tap-highlight-none"
                            >
                              {copied ? (
                                <CheckIcon className="h-4 w-4 text-green-500" />
                              ) : (
                                <ClipboardDocumentIcon className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          {userProfile.username && (
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(bookingUrl, '_blank')}
                                className="flex items-center justify-center gap-1 touch-target"
                              >
                                <LinkIcon className="h-3 w-3" />
                                Preview Page
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={copyBookingLink}
                                className="flex items-center justify-center gap-1 touch-target"
                              >
                                {copied ? (
                                  <CheckIcon className="h-3 w-3 text-green-500" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-3 w-3" />
                                )}
                                {copied ? 'Copied!' : 'Copy Link'}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          Set a username to get your booking URL
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Display Name
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">{user.displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Managed by your Google account
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Email Address
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">{user.email}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Managed by your Google account
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Account Created
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">
                    {userProfile.createdAt?.toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Last Updated
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">
                    {userProfile.updatedAt?.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/settings'}
                  className="justify-start touch-target tap-highlight-none text-sm"
                >
                  Booking Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/availability'}
                  className="justify-start touch-target tap-highlight-none text-sm"
                >
                  Set Availability
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/history'}
                  className="justify-start touch-target tap-highlight-none text-sm"
                >
                  View Bookings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
