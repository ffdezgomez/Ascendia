import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginCredentials } from '../types/auth.types';
import { authService } from '../services/authService';
import { InputField, Toast, ErrorPanel, IconSpinner } from './UI';
import { z } from 'zod';

// Validación igual a backend
const LoginSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
});

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting }
  } = useForm<LoginCredentials>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: '', password: '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError('');
    try {
      const res = await authService.login(values);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setLoggedIn(true);
      setTimeout(() => navigate('/'), 1600);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales incorrectas');
    }
  });

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md rounded-[30px] bg-zinc-900/70 px-6 py-8 md:px-8 md:py-10 shadow-[0_0_40px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-zinc-800/50">
        <h2 className="text-2xl font-semibold mb-6">Iniciar Sesión</h2>

        <form onSubmit={onSubmit}>
          <InputField
            label="Nombre de usuario"
            error={errors.username?.message}
            {...register('username')}
            placeholder="ascendia_gamer"
            autoComplete="username"
            required
          />

          <InputField
            label="Contraseña"
            error={errors.password?.message}
            {...register('password')}
            placeholder="********"
            type="password"
            autoComplete="current-password"
            required
          />

          {/* Apple-style recover link */}
          <div className="mt-3 flex justify-end">
            <Link
              to="/recover"
              className="group inline-flex items-center gap-1 text-xs font-medium text-sky-300/90 hover:text-sky-200 transition"
            >
              <span className="opacity-80 group-hover:opacity-100 transition">
                ¿Has olvidado tu contraseña?
              </span>
              <span className="translate-x-0 group-hover:translate-x-0.5 transition">
                →
              </span>
            </Link>
          </div>

          {error && <ErrorPanel message={error} onRetry={() => setError('')} />}

          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="mt-6 w-full inline-flex justify-center items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? <IconSpinner /> : null}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="mt-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500 font-medium">O</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <a
            href="https://ascendia-gy9f.vercel.app/auth/google"
            className="mt-6 w-full inline-flex justify-center items-center gap-3 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-200 ring-1 ring-white/5 transition hover:bg-zinc-700 hover:text-white"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-5 w-5" />
            Continuar con Google
          </a>
        </form>
      </div>

      <Toast show={loggedIn}>¡Login correcto!</Toast>
    </div>
  );
}