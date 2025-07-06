'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {user ? <Dashboard /> : <LoginPage />}
    </main>
  );
}
