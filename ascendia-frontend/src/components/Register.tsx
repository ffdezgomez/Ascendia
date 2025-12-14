// export default Register;
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterData } from '../types/auth.types';
import { authService } from '../services/authService';

// Importa los componentes reutilizables:
import { InputField, IconSpinner, ErrorPanel, Toast } from './UI'; // ajusta la ruta según tus ficheros

import { z } from 'zod';

// Validación Zod igual al backend
const RegisterSchema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres')
});

export default function Register() {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<RegisterData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { username: '', email: '', password: '' }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError('');
    try {
      await authService.register(values);
      setSaved(true);
      reset();
      // No redirect, user must verify email
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
    }
  });

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-md rounded-[30px] bg-zinc-900/70 px-6 py-8 md:px-8 md:py-10 shadow-[0_0_40px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-zinc-800/50">
        <h2 className="text-2xl font-semibold mb-6">Crear Cuenta</h2>
        <form onSubmit={onSubmit}>
          <InputField
            label="Nombre de usuario"
            error={errors.username?.message}
            {...register('username')}
            placeholder="Ej: ascendia_gamer"
            autoComplete="username"
            required
          />
          <InputField
            label="Email"
            error={errors.email?.message}
            {...register('email')}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
          <InputField
            label="Contraseña"
            error={errors.password?.message}
            {...register('password')}
            placeholder="********"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          {error && <ErrorPanel message={error} onRetry={() => { setError(''); }} />}
          <button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="mt-6 w-full inline-flex justify-center items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? <IconSpinner /> : null}
            {isSubmitting ? 'Registrando...' : 'Registrarse'}
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
      <Toast show={saved}>
        Cuenta creada. Revisa tu email para verificarla.
      </Toast>
    </div>
  );
}
