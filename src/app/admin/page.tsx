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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Admin Panel - Username Management</CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and fix duplicate usernames in the system
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Check for Duplicates */}
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Check for Duplicate Usernames</h3>
              <Button 
                onClick={handleCheckDuplicates} 
                disabled={loading}
                variant="outline"
                className="mr-4"
              >
                {loading ? 'Checking...' : 'Check Duplicates'}
              </Button>
            </div>

            {/* Fix Duplicates */}
            <div>
              <h3 className="text-lg font-semibold mb-3">2. Fix Duplicate Usernames</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                This will rename duplicate usernames by adding numbers (e.g., ademmami1, ademmami2)
              </p>
              <Button 
                onClick={handleFixDuplicates} 
                disabled={loading || duplicates.length === 0}
                variant="primary"
              >
                {loading ? 'Fixing...' : 'Fix Duplicates'}
              </Button>
            </div>

            {/* Result */}
            {result && (
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Result:</h4>
                <p className="whitespace-pre-wrap">{result}</p>
              </div>
            )}

            {/* Duplicate Details */}
            {duplicates.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Duplicate Username Details:</h4>
                {duplicates.map(([username, users], index) => (
                  <Card key={index} variant="bordered">
                    <CardContent className="p-4">
                      <h5 className="font-medium text-red-600 mb-2">
                        Username: "{username}" ({users.length} users)
                      </h5>
                      <div className="space-y-2">
                        {users.map((user: any, userIndex: number) => (
                          <div key={userIndex} className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                            <div className="text-sm">
                              <strong>Name:</strong> {user.displayName || 'N/A'}
                            </div>
                            <div className="text-sm">
                              <strong>Email:</strong> {user.email || 'N/A'}
                            </div>
                            <div className="text-sm">
                              <strong>User ID:</strong> {user.id}
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📋 Instructions:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
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
