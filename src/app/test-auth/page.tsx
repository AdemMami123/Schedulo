import { AuthTest } from '@/components/auth/AuthTest';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">Authentication Test</h1>
        <AuthTest />
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Setup Instructions:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Go to Google Cloud Console</li>
            <li>2. Add your email as a test user</li>
            <li>3. Set app to "Testing" mode</li>
            <li>4. Add localhost to authorized domains</li>
            <li>5. Check OAuth client settings</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
