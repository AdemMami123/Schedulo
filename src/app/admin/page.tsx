'use client';

import { useState } from 'react';
import { fixDuplicateUsernames, checkForDuplicateUsernames } from '@/scripts/fixUsernames';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [duplicates, setDuplicates] = useState<any[]>([]);

  const handleCheckDuplicates = async () => {
    setLoading(true);
    setResult('Checking for duplicate usernames...');
    
    try {
      const duplicateList = await checkForDuplicateUsernames();
      setDuplicates(duplicateList);
      
      if (duplicateList.length === 0) {
        setResult('✅ No duplicate usernames found!');
      } else {
        setResult(`⚠️ Found ${duplicateList.length} duplicate username(s). See details below.`);
      }
    } catch (error) {
      setResult(`❌ Error checking duplicates: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFixDuplicates = async () => {
    setLoading(true);
    setResult('Fixing duplicate usernames...');
    
    try {
      const success = await fixDuplicateUsernames();
      
      if (success) {
        setResult('✅ Duplicate usernames have been fixed! Please refresh the page and check again.');
        setDuplicates([]);
      } else {
        setResult('❌ Failed to fix duplicate usernames. Check console for details.');
      }
    } catch (error) {
      setResult(`❌ Error fixing duplicates: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 lg:p-8 mobile-safe-area">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-bold">Admin Panel - Username Management</CardTitle>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Manage and fix duplicate usernames in the system
            </p>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Check for Duplicates */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">1. Check for Duplicate Usernames</h3>
              <Button 
                onClick={handleCheckDuplicates} 
                disabled={loading}
                variant="outline"
                className="mr-2 sm:mr-4 touch-target"
              >
                {loading ? 'Checking...' : 'Check Duplicates'}
              </Button>
            </div>

            {/* Fix Duplicates */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">2. Fix Duplicate Usernames</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                This will rename duplicate usernames by adding numbers (e.g., ademmami1, ademmami2)
              </p>
              <Button 
                onClick={handleFixDuplicates} 
                disabled={loading || duplicates.length === 0}
                variant="primary"
                className="touch-target"
              >
                {loading ? 'Fixing...' : 'Fix Duplicates'}
              </Button>
            </div>

            {/* Result */}
            {result && (
              <div className="bg-gray-100 dark:bg-gray-800 p-3 sm:p-4 rounded-lg">
                <h4 className="text-sm sm:text-base font-semibold mb-2">Result:</h4>
                <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{result}</p>
              </div>
            )}

            {/* Duplicate Details */}
            {duplicates.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h4 className="text-sm sm:text-base font-semibold">Duplicate Username Details:</h4>
                {duplicates.map(([username, users], index) => (
                  <Card key={index} variant="bordered">
                    <CardContent className="p-3 sm:p-4">
                      <h5 className="text-sm sm:text-base font-medium text-red-600 mb-2">
                        Username: "{username}" ({users.length} users)
                      </h5>
                      <div className="space-y-2">
                        {users.map((user: any, userIndex: number) => (
                          <div key={userIndex} className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded">
                            <div className="text-xs sm:text-sm">
                              <strong>Name:</strong> <span className="break-words">{user.displayName || 'N/A'}</span>
                            </div>
                            <div className="text-xs sm:text-sm">
                              <strong>Email:</strong> <span className="break-all">{user.email || 'N/A'}</span>
                            </div>
                            <div className="text-xs sm:text-sm">
                              <strong>User ID:</strong> <span className="break-all font-mono">{user.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-lg">
              <h4 className="text-sm sm:text-base font-semibold mb-2">📋 Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                <li>First, click "Check Duplicates" to see if there are any duplicate usernames</li>
                <li>If duplicates are found, click "Fix Duplicates" to automatically resolve them</li>
                <li>The system will keep the first user with the original username</li>
                <li>Other users will get numbered suffixes (e.g., ademmami1, ademmami2)</li>
                <li>After fixing, users can change their usernames in Settings if desired</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
