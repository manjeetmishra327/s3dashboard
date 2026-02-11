'use client';

import { useEffect, useState } from 'react';
import Dashboard from '../components/Dashboard';

export default function MentorDashboardPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/';
      return;
    }
    setReady(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/';
  };

  if (!ready) return null;

  return <Dashboard onLogout={handleLogout} />;
}
