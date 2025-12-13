// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import ProfilePage from './pages/ProfilePage';
import Login from './components/Login';
import Register from './components/Register';
import UserHomePage from './pages/UserHomePage';
import FriendsPage from './pages/FriendsPage';
import FriendDashboardPage from './pages/FriendDashboardPage';
import ChallengesPage from './pages/ChallengesPage';
import Header from './components/Header';
import LandingPage from './pages/LandingPage';

import RecoverPage from './pages/RecoverPage';
import RecoverResetPage from './pages/RecoverResetPage';
import DashboardPage from './pages/DashboardPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

async function fetchAuthStatus() {
  try {
    const res = await fetch('/api/profile', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 401) return { authenticated: false };
      throw new Error('No se pudo comprobar la sesión');
    }

    await res.json();
    return { authenticated: true };
  } catch (err) {
    console.warn('[auth] estado desconocido:', err);
    return { authenticated: false };
  }
}

export default function App() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['auth', 'status'],
    queryFn: fetchAuthStatus,
    retry: false,
    staleTime: 60 * 1000,
  });

  const isAuthenticated = data?.authenticated ?? false;

  React.useEffect(() => {
    function handleAuthChange(event: CustomEvent<{ authenticated: boolean }>) {
      queryClient.setQueryData(['auth', 'status'], {
        authenticated: event.detail.authenticated,
      });
    }

    window.addEventListener('auth:changed', handleAuthChange as EventListener);
    return () =>
      window.removeEventListener('auth:changed', handleAuthChange as EventListener);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.04),transparent_50%),linear-gradient(to_bottom,theme(colors.zinc.950),theme(colors.zinc.900))] text-zinc-50 font-sans">
      <Header isAuthenticated={isAuthenticated} />

      <main className="pt-24 p-4">
        <Routes>
          <Route path="/" element={isAuthenticated ? <UserHomePage /> : <LandingPage />} />

          {/* públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/recover" element={<RecoverPage />} />
          <Route path="/recover/reset" element={<RecoverResetPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* privadas */}
          <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/dashboard" element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="/friends" element={isAuthenticated ? <FriendsPage /> : <Navigate to="/login" replace />} />
          <Route path="/friends/:username" element={isAuthenticated ? <FriendDashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="/challenges" element={isAuthenticated ? <ChallengesPage /> : <Navigate to="/login" replace />} />
          {/* siempre al final */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}