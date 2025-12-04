// src/pages/ProfilePage.tsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProfileApi } from '../lib/profile';
import type { Profile } from '../types/profile';
import {
  InputField,
  Toast,
  ErrorPanel,
  IconSpinner,
  SavingDot,
} from '../components/UI';

/* =========================================================================
   Validación (Zod)
   ========================================================================= */
const Schema = z.object({
  user: z.string().min(2, 'Mínimo 2 caracteres'),
  bio: z
    .string()
    .trim()
    .max(200, 'Máximo 200 caracteres')
    .optional(),
});

type FormData = z.infer<typeof Schema>;

/* =========================================================================
   Utils
   ========================================================================= */
function fallbackAvatar(name: string, size = 180) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'Ascendia',
  )}&background=ddd&color=444&size=${size}`;
}

const ALL_HABITS = ['Leer', 'Entrenar', 'Dormir bien', 'Meditar'];

const Skeleton: React.FC = () => (
  <div className="mx-auto max-w-2xl px-6 py-16">
    <div className="h-8 w-28 rounded bg-zinc-800/60" />
    <div className="mt-3 h-4 w-72 rounded bg-zinc-800/40" />
    <div className="mt-8 rounded-[30px] bg-zinc-900/70 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-zinc-800/50">
      <div className="animate-pulse">
        <div className="flex items-start gap-6">
          <div className="h-44 w-44 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-24 rounded bg-zinc-800/70" />
            <div className="h-11 w-full rounded-2xl bg-zinc-800/50" />
          </div>
        </div>
        <div className="mt-6 h-4 w-24 rounded bg-zinc-800/70" />
        <div className="mt-2 h-11 w-full rounded-2xl bg-zinc-800/50" />
        <div className="mt-6 h-4 w-24 rounded bg-zinc-800/70" />
        <div className="mt-2 h-11 w-full rounded-2xl bg-zinc-800/50" />
        <div className="mt-8 h-10 w-48 rounded-xl bg-zinc-800/60" />
      </div>
    </div>
  </div>
);

const AvatarPreview: React.FC<{
  src: string;
  name: string;
  activeRing: boolean;
  uploading: boolean;
}> = ({ src, name, activeRing, uploading }) => {
  const [loaded, setLoaded] = useState(false);
  const showRing = activeRing || uploading;

  return (
    <div className={`rounded-full transition-transform duration-200 ${showRing ? 'scale-101' : ''}`}>
      <div className={`rounded-full p-[3px] ${showRing ? 'bg-gradient-to-b from-zinc-100 to-zinc-300' : 'bg-gradient-to-b from-zinc-700 to-zinc-800'}`}>
        <div className="rounded-full bg-zinc-900 p-[8px] shadow-[0_6px_30px_rgba(0,0,0,0.6)]">
          <div className="relative h-32 w-32 md:h-44 md:w-44 overflow-hidden rounded-full ring-1 ring-zinc-800/70 ring-inset">
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-zinc-800/70" />
            )}
            <img
              src={src || fallbackAvatar(name, 180)}
              alt="avatar"
              className="h-full w-full object-cover transition-opacity duration-500"
              loading="lazy"
              style={{ opacity: loaded ? 1 : 0 }}
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackAvatar(name, 180);
                setLoaded(true);
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: ProfileApi.get,
    retry: 1,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: { user: '', bio: '' },
  });

  // Obtención y sincronización de hábitos seleccionados
  const originalHabits = React.useMemo(() => {
    const habits = data?.habits;
    if (!Array.isArray(habits)) return [];
    return habits.filter((h) => ALL_HABITS.includes(h));
  }, [data]);

  const isDirtyHabits =
    JSON.stringify(selectedHabits) !== JSON.stringify(originalHabits);

  const isDirtyAll = isDirty || isDirtyHabits;

  useEffect(() => {
    if (data) {
      reset(
        {
          user: String(data.user ?? ''),
          bio: typeof data.bio === 'string' ? data.bio : '',
        },
        { keepDirty: false },
      );
      const fromApi = originalHabits;
      if (fromApi.length === 0) {
        setSelectedHabits(['Leer', 'Entrenar']);
      } else if (fromApi.length === 1) {
        setSelectedHabits(fromApi);
      } else {
        setSelectedHabits(fromApi.slice(0, 2));
      }
    }
  }, [data, originalHabits, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      ProfileApi.update({
        user: values.user,
        bio:
          values.bio && values.bio.trim() !== ''
            ? values.bio.trim()
            : undefined,
        habits: selectedHabits,
      }),
    onSuccess: (updated) => {
      qc.setQueryData<Profile>(['profile'], updated);
      reset(
        {
          user: updated.user,
          bio: typeof updated.bio === 'string' ? updated.bio : '',
        },
        { keepDirty: false },
      );
      const syncedHabits = Array.isArray(updated.habits)
        ? updated.habits.filter((h) => ALL_HABITS.includes(h))
        : [];
      setSelectedHabits(syncedHabits);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = navigator.platform
        .toLowerCase()
        .includes('mac')
        ? e.metaKey
        : e.ctrlKey;
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const userError = errors.user?.message as string | undefined;
  const liveUser = watch('user') || data?.user || '';

  const avatarSrc = useMemo(() => {
    const raw = data?.avatar ?? '';
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    return raw;
  }, [data?.avatar]);

  const saving = isSubmitting || mutation.isPending;
  const showSavingDot = (isDirtyAll || saving || avatarUploading) && !saved;

  const handleAvatarClick = () => {
    setAvatarError(null);
    fileInputRef.current?.click();
  };

  const handleAvatarChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Por favor selecciona una imagen válida');
      return;
    }

    setAvatarUploading(true);
    try {
      const updated = await ProfileApi.uploadAvatar(file);
      qc.setQueryData<Profile>(['profile'], updated);
      reset(
        {
          user: updated.user,
          bio: typeof updated.bio === 'string' ? updated.bio : '',
        },
        { keepDirty: false },
      );
      const syncedHabits = Array.isArray(updated.habits)
        ? updated.habits.filter((h) => ALL_HABITS.includes(h))
        : [];
      setSelectedHabits(syncedHabits);
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    } catch (err: any) {
      setAvatarError(err?.message || 'No se pudo actualizar el avatar');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.04),transparent_50%),linear-gradient(to_bottom,theme(colors.zinc.950),theme(colors.zinc.900))] text-zinc-50">
        <Skeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(24,24,27,0.04),transparent_50%),linear-gradient(to_bottom,theme(colors.zinc.950),theme(colors.zinc.900))] text-zinc-50 px-6 py-16">
        <ErrorPanel
          message={(error as Error)?.message ?? 'No se pudo cargar el perfil.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  /* ============================== UI =============================== */
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Ajustes</p>
          <div className="flex items-center flex-wrap gap-2">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-2">
              Perfil
            </h1>
            {showSavingDot && <SavingDot />}
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            Ajusta tu nombre, tu foto y los hábitos que definen cómo creces cada día.
          </p>
        </header>

        {/* Tarjeta acrílica */}
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="rounded-[30px] bg-zinc-900/70 backdrop-blur-xl shadow-[0_0_40px_rgba(255,255,255,0.04)] ring-1 ring-inset ring-zinc-800/50"
        >
          <div className="p-5 md:p-10">
            {/* Input oculto para subir avatar */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {/* Avatar + Usuario */}
            <section className="mb-6 flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="group relative inline-flex shrink-0 items-center justify-center rounded-full outline-none ring-offset-0 focus-visible:ring-2 focus-visible:ring-blue-400/80"
              >
                <AvatarPreview
                  src={avatarSrc}
                  name={liveUser}
                  activeRing={isDirtyAll}
                  uploading={avatarUploading}
                />
                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-zinc-950/80 px-3 py-1 text-[11px] font-medium text-zinc-200 opacity-0 shadow-sm backdrop-blur group-hover:opacity-100 transition">
                  <span className="inline-block text-xs">✴︎</span>
                  Cambiar foto
                </div>
              </button>
              <div className="flex-1 space-y-3">
                <InputField
                  label="Nombre de usuario"
                  error={userError}
                  {...register('user')}
                  placeholder="tu_usuario"
                />
                {data.email && (
                  <p className="text-xs text-zinc-500">
                    Sesión iniciada como{' '}
                    <span className="font-medium text-zinc-300">
                      {data.email}
                    </span>
                  </p>
                )}
                {avatarError && (
                  <p className="text-xs text-red-400">{avatarError}</p>
                )}
              </div>
            </section>

            {/* Divider suave */}
            <div className="my-5 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />

            {/* Bio */}
            <section className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Bio
                </h2>
              </div>
              <InputField
                label=""
                placeholder="Cuéntanos algo sobre ti (máx. 200)"
                {...register('bio')}
              />
            </section>
          </div>

          {/* Acciones sticky */}
          <div className="sticky bottom-0 z-10 rounded-b-[30px] bg-zinc-900/80 backdrop-blur-xl p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving || !isDirtyAll}
                onClick={() => {
                  reset(
                    {
                      user: data.user,
                      bio: typeof data.bio === 'string' ? data.bio : '',
                    },
                    { keepDirty: false },
                  );
                  const fromApi = originalHabits;
                  if (fromApi.length === 0) {
                    setSelectedHabits(['Leer', 'Entrenar']);
                  } else if (fromApi.length === 1) {
                    setSelectedHabits(fromApi);
                  } else {
                    setSelectedHabits(fromApi.slice(0, 2));
                  }
                }}
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 shadow-sm transition hover:bg-zinc-800/50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !isDirtyAll}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <IconSpinner /> Guardando…
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
      <Toast show={saved}>Cambios guardados</Toast>
    </>
  );
}
