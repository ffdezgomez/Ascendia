// src/pages/UserHomePage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ErrorPanel, IconSpinner } from '../components/UI';
import {
  HabitCreateModal,
  HabitCreateFormValues,
} from '../components/habits/HabitCreateModal';
import { Link } from 'react-router-dom';

import { MetricsWidget } from '../components/dashboard/MetricsWidget';
import { HabitsWidget } from '../components/dashboard/HabitsWidget';
import { FriendsWidget } from '../components/dashboard/FriendsWidget';
import { ChallengesWidget } from '../components/dashboard/ChallengesWidget';

import { HabitSummary, HabitCategory, HabitCardColor } from '../types/habits';
import { FriendsApi } from '../lib/friends';
import { MetricsApi } from '../lib/metrics';
import type { AllHabitsMetrics, HabitMetric } from '../types/metrics';
import { HabitGraph } from '../components/habits/HabitGraph';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

type ChallengeSummary = {
  id: string;
  title: string;
  daysLeft: number;
  participants: number;
  opponentName?: string;
  opponentAvatar?: string;
};

type DashboardResponse = {
  habits: HabitSummary[];
  challenges: ChallengeSummary[];
};

async function fetchDashboard(): Promise<DashboardResponse> {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/dashboard`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Mapeamos nuestro tipo del UI a los campos que espera el backend Habit
function mapTypeToBackend(type: HabitCreateFormValues['type']) {
  switch (type) {
    case 'hours':
      return { type: 'time', unit: 'h' };
    case 'count':
      return { type: 'count', unit: 'times' };
    case 'checkbox':
      return { type: 'boolean', unit: 'check' };
    case 'km':
      return { type: 'number', unit: 'km' };
    case 'calories':
      return { type: 'number', unit: 'kcal' };
    case 'weight':
      return { type: 'number', unit: 'kg' };
    case 'number':
    default:
      return { type: 'number', unit: 'u' };
  }
}

const CATEGORY_LABELS: Record<HabitCategory, string> = {
  all: 'Todos',
  fitness: 'Fitness',
  study: 'Estudio',
  health: 'Salud',
  personal: 'Personal',
  work: 'Trabajo',
  creativity: 'Creatividad',
  spirituality: 'Espiritualidad',
  home: 'Hogar',
};

export default function UserHomePage() {
  const [category, setCategory] = useState<HabitCategory>('all');
  const [graphCategory, setGraphCategory] = useState<HabitCategory>('all');
  const [createOpen, setCreateOpen] = useState(false);

  // Edit State
  const [editingHabit, setEditingHabit] = useState<HabitSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<HabitCategory>('fitness');
  const [editEmoji, setEditEmoji] = useState<string>('✨');
  const [editColor, setEditColor] = useState<HabitCardColor>('zinc');

  // Log State
  const [loggingHabit, setLoggingHabit] = useState<HabitSummary | null>(null);
  const [logAmount, setLogAmount] = useState('');
  const [existingLog, setExistingLog] = useState<{ id: string; value: number } | null>(null);

  const queryClient = useQueryClient();

  // Queries
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    retry: 1,
  });

  const friendsQuery = useQuery({
    queryKey: ['friends', 'overview'],
    queryFn: FriendsApi.overview,
    staleTime: 60_000,
  });

  const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery<AllHabitsMetrics>({
    queryKey: ['allHabitsMetrics', '30d'],
    queryFn: () => MetricsApi.getAllHabitsMetrics('30d'),
    retry: 1,
  });

  // Mutations
  const createHabitMutation = useMutation({
    mutationFn: async (values: HabitCreateFormValues) => {
      const mapped = mapTypeToBackend(values.type);
      const payload = {
        name: values.name,
        description: '',
        type: mapped.type,
        unit: mapped.unit,
        category: values.category,
      };
      const res = await fetch(`${process.env.REACT_APP_API_URL}/habit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCreateOpen(false);
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/habit/${habitId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingHabit(null); // Close edit sidebar if open
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async (args: { id: string; name: string; category: HabitCategory; emoji: string; color: HabitCardColor }) => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/habit/${args.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: args.name,
          category: args.category,
          emoji: args.emoji,
          color: args.color,
        }),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingHabit(null);
    },
  });

  const createLogMutation = useMutation({
    mutationFn: async (args: { habitId: string; amount: number }) => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/log`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          habitId: args.habitId,
          value: args.amount,
          date: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setLoggingHabit(null);
      setLogAmount('');
      setExistingLog(null);
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: async (args: { logId: string; amount: number }) => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/log/${args.logId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ value: args.amount }),
      });
      if (!res.ok) throw new Error(await res.text() || res.statusText);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setLoggingHabit(null);
      setLogAmount('');
      setExistingLog(null);
    },
  });

  // Derived State
  const habits = useMemo(() => data?.habits ?? [], [data?.habits]);
  const challenges = useMemo(() => data?.challenges ?? [], [data?.challenges]);
  const friends = useMemo(() => friendsQuery.data?.friends ?? [], [friendsQuery.data]);

  const filteredHabits = useMemo(() => {
    if (category === 'all') return habits;
    return habits.filter((h) => h.category === category);
  }, [habits, category]);

  const stats = useMemo(() => {
    const totalDaysCompleted = habits.filter((h) => h.completedToday).length;
    const totalHours = habits.reduce((sum, h) => {
      if (h.type === 'time') return sum + h.hoursThisMonth;
      return sum;
    }, 0);
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak), 0);
    const activeHabits = habits.length;
    return { totalDaysCompleted, totalHours, bestStreak, activeHabits };
  }, [habits]);

  const filteredMetricsHabits = useMemo(() => {
    if (!metricsData?.habits) return [] as HabitMetric[];
    if (graphCategory === 'all') return metricsData.habits;
    return metricsData.habits.filter(
      (h) => h.category === graphCategory,
    );
  }, [metricsData, graphCategory]);

  // Effects
  useEffect(() => {
    if (!loggingHabit) {
      setExistingLog(null);
      return;
    }

    if (loggingHabit.type === 'boolean') {
      setExistingLog(null);
      setLogAmount('');
      return;
    }

    const habitId = loggingHabit.id;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchTodayLog() {
      try {
        const params = new URLSearchParams({
          habit: habitId,
          day: new Date().toISOString(),
        });
        const res = await fetch(`${process.env.REACT_APP_API_URL}/log?${params.toString()}`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(await res.text() || res.statusText);
        const entries: Array<{ _id: string; value: number }> = await res.json();
        if (cancelled) return;
        const todayLog = Array.isArray(entries) ? entries[0] : null;
        if (todayLog) {
          setExistingLog({ id: todayLog._id, value: todayLog.value });
          setLogAmount(String(todayLog.value));
        } else {
          setExistingLog(null);
          setLogAmount('');
        }
      } catch (err: any) {
        if (cancelled || err?.name === 'AbortError') return;
        console.warn('No se pudo cargar el registro de hoy', err);
      } finally {
        // No UI feedback required here yet
      }
    }

    fetchTodayLog();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loggingHabit]);

  // Handlers
  const handleSaveLog = () => {
    if (!loggingHabit) return;
    if (loggingHabit.type === 'boolean') {
      if (loggingHabit.completedToday) return;
      createLogMutation.mutate({ habitId: loggingHabit.id, amount: 1 });
      return;
    }
    const normalized = Number(logAmount.replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized <= 0) return;

    if (existingLog) {
      updateLogMutation.mutate({ logId: existingLog.id, amount: normalized });
    } else {
      createLogMutation.mutate({ habitId: loggingHabit.id, amount: normalized });
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este hábito?')) {
      deleteHabitMutation.mutate(habitId);
    }
  };

  const handleEditHabit = (habit: HabitSummary) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditCategory(habit.category);
    setEditEmoji(habit.emoji);
    setEditColor(habit.color ?? 'zinc');
  };

  // Render Helpers
  const savingLog = createLogMutation.isPending || updateLogMutation.isPending;
  const isBooleanHabit = loggingHabit?.type === 'boolean';
  const booleanAlreadyLogged = Boolean(loggingHabit && loggingHabit.type === 'boolean' && loggingHabit.completedToday);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center text-zinc-50">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-zinc-900/80 px-4 py-3 ring-1 ring-zinc-800/70">
          <IconSpinner />
          <span className="text-sm text-zinc-300">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center text-zinc-50 px-6 py-16">
        <ErrorPanel message={(error as Error)?.message ?? 'Error cargando dashboard'} />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl px-4 min-h-[calc(100vh-8rem)] flex flex-col justify-center">

        {/* Header */}
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Resumen</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">Home</h1>
        </header>

        {/* Top Metrics */}
        <section className="mb-8">
          <MetricsWidget stats={stats} />
        </section>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Row 1 Left: Habits */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Mis Hábitos</h2>

              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(['all', 'fitness', 'study', 'health', 'personal', 'work', 'creativity', 'spirituality', 'home'] as HabitCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${category === cat
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800'
                      }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <HabitsWidget
              habits={filteredHabits}
              onLog={setLoggingHabit}
              onEdit={handleEditHabit}
              onDelete={handleDeleteHabit}
            />
          </div>

          {/* Row 1 Right: Friends */}
          <div className="lg:col-span-1 flex flex-col">
            <div className="flex items-center justify-between mb-6 h-[32px]">
              <h2 className="text-xl font-semibold">Amigos</h2>
              <Link to="/friends" className="text-xs text-emerald-400 hover:text-emerald-300 transition">
                Ver todos
              </Link>
            </div>
            <FriendsWidget friends={friends} className="h-full" />
          </div>

          {/* Row 2 Left: Graphics */}
          <section className="lg:col-span-2 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Mis Gráficos</h2>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(['all', 'fitness', 'study', 'health', 'personal', 'work', 'creativity', 'spirituality', 'home'] as HabitCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setGraphCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${graphCategory === cat
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-800'
                      }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {metricsLoading ? (
              <div className="animate-pulse h-48 bg-zinc-800/40 rounded-xl" />
            ) : metricsError ? (
              <div className="rounded-xl bg-red-900/20 border border-red-800/50 p-6 text-center text-sm text-red-400">
                Error al cargar las métricas: {(metricsError as Error).message}
              </div>
            ) : filteredMetricsHabits && filteredMetricsHabits.length > 0 ? (
              <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={20}
                slidesPerView={1}
                navigation
                pagination={{ clickable: true }}
                className="pb-12"
              >
                {filteredMetricsHabits.map((habit: HabitMetric) => (
                  <SwiperSlide key={habit.habitId}>
                    <HabitGraph
                      habitName={habit.habitName}
                      habitId={habit.habitId}
                      emoji={habit.emoji}
                      color={habit.color}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <div className="rounded-xl bg-zinc-800/40 p-6 text-center text-sm text-zinc-400">
                No hay hábitos registrados aún para esta categoría.
              </div>
            )}
          </section>

          {/* Row 2 Right: Challenges */}
          <div className="lg:col-span-1 mt-8 flex flex-col">
            <div className="flex items-center justify-between mb-6 h-[32px]">
              <h2 className="text-xl font-semibold">Retos Activos</h2>
              <Link to="/challenges" className="text-xs text-emerald-400 hover:text-emerald-300 transition">
                Ver todos
              </Link>
            </div>
            <ChallengesWidget challenges={challenges} className="h-full" />
          </div>

        </div>
      </div>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="group fixed bottom-8 right-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-1 ring-white/20 transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] active:scale-95"
      >
        <svg
          className="h-8 w-8 transition-transform duration-300 group-hover:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modals */}
      <HabitCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(values) => createHabitMutation.mutate(values)}
        submitting={createHabitMutation.isPending}
        errorMessage={createHabitMutation.error ? (createHabitMutation.error as Error).message : null}
      />

      {/* Edit Sidebar */}
      {editingHabit && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingHabit(null)} />
          <aside className="relative z-50 w-full max-w-sm bg-zinc-950 p-6 shadow-2xl ring-1 ring-zinc-800">
            <h2 className="text-lg font-semibold mb-6">Editar Hábito</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400">Nombre</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => updateHabitMutation.mutate({
                    id: editingHabit.id,
                    name: editName,
                    category: editCategory,
                    emoji: editEmoji,
                    color: editColor
                  })}
                  className="flex-1 rounded-lg bg-white py-2 text-sm font-medium text-black"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingHabit(null)}
                  className="flex-1 rounded-lg bg-zinc-800 py-2 text-sm font-medium text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Log Modal */}
      {loggingHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLoggingHabit(null)} />
          <div className="relative z-50 w-full max-w-sm rounded-3xl bg-zinc-900 p-6 shadow-2xl ring-1 ring-zinc-800">
            <h3 className="text-lg font-semibold mb-4">Registrar: {loggingHabit.name}</h3>
            {!isBooleanHabit && (
              <input
                type="number"
                value={logAmount}
                onChange={(e) => setLogAmount(e.target.value)}
                placeholder={`Cantidad (${loggingHabit.unit})`}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-lg outline-none focus:border-emerald-500"
                autoFocus
              />
            )}
            {isBooleanHabit && booleanAlreadyLogged && (
              <p className="text-sm text-yellow-400 mb-4">Ya completado hoy.</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveLog}
                disabled={savingLog || (isBooleanHabit && booleanAlreadyLogged)}
                className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
              >
                {savingLog ? 'Guardando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setLoggingHabit(null)}
                className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
