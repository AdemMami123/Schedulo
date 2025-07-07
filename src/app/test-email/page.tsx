'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string; url?: string } | null>(null);

  const sendTestEmail = async () => {
    if (!email) {
      setResult({ error: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/email/confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: {
            id: 'test-user',
            email: 'host@example.com',
            displayName: 'Test Host',
            photoURL: 'https://via.placeholder.com/150',
            timezone: 'America/New_York',
            username: 'testhost',
          },
          guest: {
            name: 'Test Guest',
            email: email,
            notes: 'This is a test email to verify the email sending functionality.',
          },
          selectedSlot: {
            start: new Date(Date.now() + 86400000), // tomorrow
            end: new Date(Date.now() + 86400000 + 3600000), // 1 hour later
            duration: 60,
          },
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({ 
          success: true,
          url: typeof window !== 'undefined' ? 
            'Check your console for the Ethereal Email test URL' : undefined 
        });
      } else {
        setResult({ error: data.error || 'Failed to send email' });
      }
    } catch (error) {
      setResult({ error: 'An error occurred while sending the test email' });
      console.error('Error sending test email:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-md mx-auto px-4">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <EnvelopeIcon className="w-6 h-6 mr-2 text-blue-500" />
              Email Test Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Recipient Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  disabled={loading}
                />
              </div>
              
              <Button
                onClick={sendTestEmail}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </Button>
              
              {result && (
                <div className={`mt-4 p-4 rounded-md ${
                  result.success ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300' : 
                  'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                }`}>
                  {result.success ? (
                    <div className="flex flex-col space-y-2">
                      <p className="font-medium">Email sent successfully!</p>
                      {result.url && <p className="text-sm">{result.url}</p>}
                    </div>
                  ) : (
                    <p>{result.error}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
