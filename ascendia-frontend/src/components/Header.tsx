// src/components/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { useQueryClient } from '@tanstack/react-query';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  isAuthenticated: boolean;
}

export default function Header({ isAuthenticated }: HeaderProps) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const isLandingPage = location.pathname === '/';

  const handleLogout = async () => {
    try {
      await authService.logout();
      queryClient.clear();
      window.location.href = '/';
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {isAuthenticated ? (
        <>
          <Link to="/dashboard" className={`hover:text-white transition-colors ${location.pathname === '/dashboard' ? 'text-white' : ''} ${mobile ? 'px-3 py-2' : ''}`}>
            Hábitos
          </Link>
          <Link to="/challenges" className={`hover:text-white transition-colors ${location.pathname === '/challenges' ? 'text-white' : ''} ${mobile ? 'px-3 py-2' : ''}`}>
            Retos
          </Link>
          <Link to="/friends" className={`hover:text-white transition-colors ${location.pathname === '/friends' ? 'text-white' : ''} ${mobile ? 'px-3 py-2' : ''}`}>
            Amistades
          </Link>
          <Link to="/profile" className={`hover:text-white transition-colors ${location.pathname === '/profile' ? 'text-white' : ''} ${mobile ? 'px-3 py-2' : ''}`}>
            Perfil
          </Link>
        </>
      ) : isLandingPage ? (
        <>
          <a href="#features" className={`hover:text-white transition-colors ${mobile ? 'px-3 py-2' : ''}`}>Características</a>
          <a href="#how-it-works" className={`hover:text-white transition-colors ${mobile ? 'px-3 py-2' : ''}`}>Cómo funciona</a>
          <a href="#faq" className={`hover:text-white transition-colors ${mobile ? 'px-3 py-2' : ''}`}>FAQ</a>
        </>
      ) : null}
    </>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-lg font-bold tracking-tight text-white">Ascendia</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6 text-sm font-medium text-zinc-400">
            <NavLinks />
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                {location.pathname !== '/login' && (
                  <Link
                    to="/login"
                    className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Login
                  </Link>
                )}
                {location.pathname !== '/register' && (
                  <Link
                    to="/register"
                    className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-white/10 hover:bg-zinc-200 transition-all active:scale-95"
                  >
                    {location.pathname === '/login' ? 'Crear cuenta' : 'Empezar'}
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation (Horizontal Scroll) */}
        <div className="md:hidden -mx-4 overflow-x-auto no-scrollbar border-t border-white/5 bg-zinc-950/50">
          <nav className="flex items-center gap-1 px-4 py-1 text-sm font-medium text-zinc-400 whitespace-nowrap">
            <NavLinks mobile />
          </nav>
        </div>
      </div>
    </header>
  );
}
