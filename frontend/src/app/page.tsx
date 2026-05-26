'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import AuthPage from '@/components/auth/AuthPage';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default function Home() {
  const { user, isAuthLoading, restoreSession } = useStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Show a centered loader while checking auth
  if (isAuthLoading) {
    return (
      <div className="loader-screen">
        <div className="loader-logo">
          <span className="loader-icon">V</span>
        </div>
        <p className="loader-text">Loading...</p>
      </div>
    );
  }

  // Not logged in → show auth page
  if (!user) {
    return <AuthPage />;
  }

  // Logged in → show dashboard
  return <DashboardShell />;
}
