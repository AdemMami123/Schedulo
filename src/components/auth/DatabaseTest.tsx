'use client';

import { useAuth } from '@/contexts/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useState } from 'react';

export default function DatabaseTest() {
  const { user, userProfile, signInWithGoogle, logout } = useAuth();
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    if (!user) {
      setTestResult('Please login first');
      return;
    }

    setLoading(true);
    try {
      // Test writing to database
      const testData = {
        testField: 'Hello World!',
        timestamp: new Date().toISOString(),
        userId: user.uid
      };

      await setDoc(doc(db, 'test', user.uid), testData);
      console.log('Write successful');

      // Test reading from database
      const docSnap = await getDoc(doc(db, 'test', user.uid));
      if (docSnap.exists()) {
        console.log('Read successful:', docSnap.data());
        setTestResult('✅ Database test successful! Both read and write operations work.');
      } else {
        setTestResult('❌ Document does not exist after write');
      }
    } catch (error) {
      console.error('Database test failed:', error);
      setTestResult(`❌ Database test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Database Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          {user ? (
            <div className="space-y-2">
              <p className="text-green-600">✅ User is authenticated</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Display Name:</strong> {user.displayName}</p>
              <p><strong>UID:</strong> {user.uid}</p>
              
              {userProfile && (
                <div className="mt-4 p-4 bg-green-50 rounded-md">
                  <h3 className="font-semibold text-green-800">User Profile:</h3>
                  <p><strong>Username:</strong> {userProfile.username}</p>
                  <p><strong>Timezone:</strong> {userProfile.timezone}</p>
                </div>
              )}
              
              <button
                onClick={logout}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <div>
              <p className="text-red-600">❌ User is not authenticated</p>
              <button
                onClick={signInWithGoogle}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Sign In with Google
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Database Test</h2>
          
          <button
            onClick={testDatabase}
            disabled={!user || loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Database Access'}
          </button>
          
          {testResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p className="whitespace-pre-wrap">{testResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
