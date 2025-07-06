'use client';

import { useState } from 'react';
import { signInWithPopup, User } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export function AuthTest() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Sign in successful:', result.user);
      setUser(result.user);
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Firebase Auth Test</h2>
      
      {!user ? (
        <div>
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h3 className="font-medium">Signed in as:</h3>
            <p>{user.displayName}</p>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
