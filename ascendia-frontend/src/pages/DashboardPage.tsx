// src/pages/DashboardPage.tsx
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
import { EMOJI_OPTIONS } from '../constants/emojiOptions';


type HabitCategory =
  | 'all'
  | 'fitness'
  | 'study'
  | 'health'
  | 'personal'
  | 'work'
  | 'creativity'
  | 'spirituality'
  | 'home';
type HabitCardColor =
  | 'zinc'
  | 'emerald'
  | 'sky'
  | 'amber'
  | 'violet'
  | 'rose'
  | 'teal'
  | 'indigo'
  | 'lime'
  | 'orange';

type HabitSummary = {
  id: string;
  name: string;
  emoji: string;
  color?: HabitCardColor;
  category: HabitCategory;
  type: 'time' | 'count' | 'boolean' | 'number';
  unit: string;
  /**
   * Suma de todos los logs de este mes para este hábito
   * (horas, veces, unidades... según el tipo).
   */
  totalThisMonth: number;
  /**
   * Solo horas este mes, para la tarjeta y la métrica global.
   * 0 para hábitos que no son de tipo tiempo.
   */
  hoursThisMonth: number;
  completedToday: boolean;
  streak: number;
  history: { date: string; completed: boolean }[];
};

type DashboardViewMode = 'habits' | 'calendars';

type DashboardResponse = {
  habits: HabitSummary[];
};

const DASHBOARD_TABS: { id: DashboardViewMode; label: string }[] = [
  { id: 'habits', label: 'Hábitos' },
  { id: 'calendars', label: 'Calendarios' },
];

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

const COLOR_CHOICES: { id: HabitCardColor; label: string; previewClass: string }[] = [
  { id: 'zinc', label: 'Clásico', previewClass: 'from-zinc-900 to-zinc-800' },
  { id: 'emerald', label: 'Verde', previewClass: 'from-emerald-500 to-emerald-400' },
  { id: 'sky', label: 'Azul', previewClass: 'from-sky-500 to-sky-400' },
  { id: 'amber', label: 'Ámbar', previewClass: 'from-amber-500 to-amber-400' },
  { id: 'violet', label: 'Violeta', previewClass: 'from-violet-500 to-violet-400' },
  { id: 'rose', label: 'Rosa', previewClass: 'from-rose-500 to-rose-400' },
  { id: 'teal', label: 'Turquesa', previewClass: 'from-teal-500 to-teal-400' },
  { id: 'indigo', label: 'Índigo', previewClass: 'from-indigo-500 to-indigo-400' },
  { id: 'lime', label: 'Lima', previewClass: 'from-lime-500 to-lime-400' },
  { id: 'orange', label: 'Naranja', previewClass: 'from-orange-500 to-orange-400' },
];

function getHabitRingClass(color: HabitCardColor | undefined): string {
  switch (color) {
    case 'emerald':
      return 'ring-1 ring-emerald-500/40 hover:ring-emerald-400/70';
    case 'sky':
      return 'ring-1 ring-sky-500/40 hover:ring-sky-400/70';
    case 'amber':
      return 'ring-1 ring-amber-500/40 hover:ring-amber-400/70';
    case 'violet':
      return 'ring-1 ring-violet-500/40 hover:ring-violet-400/70';
    case 'rose':
      return 'ring-1 ring-rose-500/40 hover:ring-rose-400/70';
    case 'teal':
      return 'ring-1 ring-teal-500/40 hover:ring-teal-400/70';
    case 'indigo':
      return 'ring-1 ring-indigo-500/40 hover:ring-indigo-400/70';
    case 'lime':
      return 'ring-1 ring-lime-500/40 hover:ring-lime-400/70';
    case 'orange':
      return 'ring-1 ring-orange-500/40 hover:ring-orange-400/70';
    case 'zinc':
    default:
      return 'ring-1 ring-zinc-800/80 hover:ring-zinc-600/80';
  }
}

function getHabitBackgroundClass(color: HabitCardColor | undefined): string {
  switch (color) {
    case 'emerald':
      return 'from-emerald-950/70 to-emerald-900/80';
    case 'sky':
      return 'from-sky-950/70 to-sky-900/80';
    case 'amber':
      return 'from-amber-950/70 to-amber-900/80';
    case 'violet':
      return 'from-violet-950/70 to-violet-900/80';
    case 'rose':
      return 'from-rose-950/70 to-rose-900/80';
    case 'teal':
      return 'from-teal-950/70 to-teal-900/80';
    case 'indigo':
      return 'from-indigo-950/70 to-indigo-900/80';
    case 'lime':
      return 'from-lime-950/70 to-lime-900/80';
    case 'orange':
      return 'from-orange-950/70 to-orange-900/80';
    case 'zinc':
    default:
      return 'from-zinc-900/80 to-zinc-950/90';
  }
}

function buildMonthCalendar(habit: HabitSummary | null) {
  if (!habit) return null;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-index
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();

  // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const firstWeekday = firstOfMonth.getDay();

  const completedSet = new Set(
    habit.history
      .filter((d) => d.completed)
      .map((d) => d.date),
  );

  type DayCell = {
    date: Date | null;
    key: string;
    completed: boolean;
  };

  const weeks: DayCell[][] = [];
  let currentWeek: DayCell[] = [];

  // Helper to push the current week and reset
  const pushWeek = () => {
    if (currentWeek.length) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: null, key: `empty-${weeks.length}-${currentWeek.length}`, completed: false });
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  };

  // First week: leading blanks until the first weekday
  for (let i = 0; i < (firstWeekday === 0 ? 6 : firstWeekday - 1); i += 1) {
    currentWeek.push({ date: null, key: `empty-first-${i}`, completed: false });
  }

  // Fill actual days
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month, day);
    const iso = d.toISOString().slice(0, 10);

    currentWeek.push({
      date: d,
      key: iso,
      completed: completedSet.has(iso),
    });

    const jsWeekday = d.getDay(); // 0..6
    const weekdayIndex = jsWeekday === 0 ? 6 : jsWeekday - 1; // 0..6 L..D

    if (weekdayIndex === 6) {
      pushWeek();
    }
  }

  // Push remaining cells in the last week
  pushWeek();

  return weeks;
}

export default function DashboardPage() {
  const [category, setCategory] = useState<HabitCategory>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [editingHabit, setEditingHabit] = useState<HabitSummary | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<HabitCategory>('fitness');
  const [editEmoji, setEditEmoji] = useState<string>('✨');
  const [editColor, setEditColor] = useState<HabitCardColor>('zinc');

  const [loggingHabit, setLoggingHabit] = useState<HabitSummary | null>(null);
  const [logAmount, setLogAmount] = useState('');
  const [existingLog, setExistingLog] = useState<{ id: string; value: number } | null>(null);
  const [isLoadingTodayLog, setIsLoadingTodayLog] = useState(false);
  const [todayLogError, setTodayLogError] = useState<string | null>(null);
  const [dashboardView, setDashboardView] = useState<DashboardViewMode>('habits');

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    retry: 1,
  });

  // ---- Crear hábito ----
  const createHabitMutation = useMutation({
    mutationFn: async (values: HabitCreateFormValues) => {
      const mapped = mapTypeToBackend(values.type);

      const payload = {
        name: values.name,
        description: '', // más adelante lo llenamos con el sidebar avanzado
        type: mapped.type,
        unit: mapped.unit,
        category: values.category,
      };

      const res = await fetch(`${process.env.REACT_APP_API_URL}/habit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setCreateOpen(false);
    },
  });

  // ---- Eliminar hábito ----
  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string) => {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/habit/${habitId}`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
          },
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setMenuOpenId(null);
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async (args: {
      id: string;
      name: string;
      category: HabitCategory;
      emoji: string;
      color: HabitCardColor;
    }) => {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/habit/${args.id}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: args.name,
            category: args.category,
            emoji: args.emoji,
            color: args.color,
          }),
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setEditingHabit(null);
    },
  });

  // ---- Crear log de progreso ----
  const createLogMutation = useMutation({
    mutationFn: async (args: { habitId: string; amount: number }) => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/log`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          habitId: args.habitId,
          value: args.amount,
          date: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setLoggingHabit(null);
      setLogAmount('');
      setExistingLog(null);
      setTodayLogError(null);
      setIsLoadingTodayLog(false);
    },
  })

  const updateLogMutation = useMutation({
    mutationFn: async (args: { logId: string; amount: number }) => {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/log/${args.logId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ value: args.amount }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `${res.status} ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setLoggingHabit(null);
      setLogAmount('');
      setExistingLog(null);
      setTodayLogError(null);
      setIsLoadingTodayLog(false);
    },
  });

  const habits = useMemo(() => data?.habits ?? [], [data?.habits]);

  // Effect for logging
  useEffect(() => {
    if (!loggingHabit) {
      setExistingLog(null);
      setTodayLogError(null);
      setIsLoadingTodayLog(false);
      return;
    }

    if (loggingHabit.type === 'boolean') {
      setExistingLog(null);
      setTodayLogError(null);
      setIsLoadingTodayLog(false);
      setLogAmount('');
      return;
    }

    const habitId = loggingHabit.id;

    let cancelled = false;
    const controller = new AbortController();

    async function fetchTodayLog() {
      setIsLoadingTodayLog(true);
      setTodayLogError(null);
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
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `${res.status} ${res.statusText}`);
        }
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
        setTodayLogError(err?.message ?? 'No se pudo cargar el registro de hoy');
      } finally {
        if (!cancelled) {
          setIsLoadingTodayLog(false);
        }
      }
    }

    fetchTodayLog();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loggingHabit]);

  const filteredHabits = useMemo(() => {
    if (category === 'all') return habits;
    return habits.filter((h) => h.category === category);
  }, [habits, category]);

  const stats = useMemo(() => {
    const totalDaysCompleted = habits.filter((h) => h.completedToday).length;

    // Solo sumamos horas de hábitos tipo tiempo
    const totalHours = habits.reduce((sum, h) => {
      if (h.type === 'time') {
        return sum + h.hoursThisMonth;
      }
      return sum;
    }, 0);

    const bestStreak = habits.reduce(
      (max, h) => Math.max(max, h.streak),
      0,
    );
    const activeHabits = habits.length;

    return { totalDaysCompleted, totalHours, bestStreak, activeHabits };
  }, [habits]);

  const monthLabel = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const savingLog = createLogMutation.isPending || updateLogMutation.isPending;
  const logMutationError = (createLogMutation.error || updateLogMutation.error) as Error | null;
  const isBooleanHabit = loggingHabit?.type === 'boolean';
  const booleanAlreadyLogged = Boolean(loggingHabit && loggingHabit.type === 'boolean' && loggingHabit.completedToday);
  const primaryActionLabel = !loggingHabit
    ? 'Guardar registro'
    : loggingHabit.type === 'boolean'
      ? booleanAlreadyLogged
        ? 'Ya registrado'
        : 'Marcar como completado'
      : existingLog
        ? 'Actualizar registro'
        : 'Guardar registro';
  const savingLabel = !loggingHabit
    ? 'Guardando…'
    : loggingHabit.type === 'boolean'
      ? 'Guardando…'
      : existingLog
        ? 'Actualizando…'
        : 'Guardando…';

  const handleSaveLog = () => {
    if (!loggingHabit || savingLog) return;

    if (loggingHabit.type === 'boolean') {
      if (booleanAlreadyLogged) {
        return;
      }
      createLogMutation.mutate({ habitId: loggingHabit.id, amount: 1 });
      return;
    }

    const normalized = Number(logAmount.replace(',', '.'));
    if (!Number.isFinite(normalized) || normalized <= 0) {
      return;
    }

    if (existingLog) {
      updateLogMutation.mutate({ logId: existingLog.id, amount: normalized });
    } else {
      createLogMutation.mutate({ habitId: loggingHabit.id, amount: normalized });
    }
  };

  // =================== CARGANDO / ERROR ===================
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center text-zinc-50">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-24">
          <div className="inline-flex items-center gap-3 rounded-2xl bg-zinc-900/80 px-4 py-3 ring-1 ring-zinc-800/70">
            <IconSpinner />
            <span className="text-sm text-zinc-300">
              Cargando tu panel de hábitos…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center text-zinc-50 px-6 py-16">
        <ErrorPanel
          message={
            (error as Error)?.message ??
            'No se pudo cargar el dashboard.'
          }
        />
      </div>
    );
  }

  // ========================= UI ===========================
  return (
    <div className="relative">
      <div className="mx-auto max-w-5xl px-6 py-10 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Métricas</p>
            <h1 className="text-3xl font-semibold tracking-tight mt-2">
              Panel de Hábitos
            </h1>
            <p className="text-sm text-zinc-400 mt-2">
              Tu panel de hábitos y métricas, diseñado para que veas tu
              progreso de un vistazo.
            </p>
          </div>
        </header>

        {/* Tarjeta principal acrílica */}
        <section className="rounded-[30px] bg-zinc-900/75 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-zinc-800/60">
          {/* Métricas rápidas */}
          <div className="grid gap-3 md:grid-cols-4">
            {/* Hábitos activos */}
            <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-4 ring-1 ring-zinc-800/80">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
                <span>Hábitos activos</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums text-zinc-50">
                {stats.activeHabits}
              </div>
            </div>

            {/* Completados hoy */}
            <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-4 ring-1 ring-zinc-800/80">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-400">
                <span>Hábitos completados hoy</span>
              </div>
              <div className="text-2xl font-semibold tabular-nums text-zinc-50">
                {stats.totalDaysCompleted}
              </div>
            </div>

            {/* Horas este mes */}
            <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-4 ring-1 ring-zinc-800/80">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <span>Horas este mes</span>
                </span>
              </div>
              <div className="text-2xl font-semibold tabular-nums text-zinc-50">
                {stats.totalHours}
              </div>
            </div>

            {/* Mejor racha */}
            <div className="rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 p-4 ring-1 ring-zinc-800/80">
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <span>Mejor racha</span>
                </span>
                <span className="rounded-full bg-zinc-800/80 px-2 py-[1px] text-[10px] uppercase tracking-wide text-zinc-400">
                  días
                </span>
              </div>
              <div className="text-2xl font-semibold tabular-nums text-zinc-50">
                {stats.bestStreak}
              </div>
            </div>

            {/* Filtro de categorías */}
            <div className="flex gap-2 overflow-x-auto md:col-span-4 md:justify-center lg:gap-3 lg:px-10">
              {(
                [
                  'all',
                  'fitness',
                  'study',
                  'health',
                  'personal',
                  'work',
                  'creativity',
                  'spirituality',
                  'home',
                ] as HabitCategory[]
              ).map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition ${active
                      ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800'
                      }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subpantallas: hábitos / calendarios */}
          <div className="mt-6 rounded-[26px] bg-zinc-950/65 p-4 md:p-6 ring-1 ring-inset ring-zinc-800/60">
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-1 rounded-full bg-zinc-900/80 px-2 py-1 ring-1 ring-zinc-800/70">
                {DASHBOARD_TABS.map((tab) => {
                  const active = dashboardView === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDashboardView(tab.id)}
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${active
                        ? 'bg-emerald-500/20 text-emerald-200 shadow-[0_6px_20px_rgba(16,185,129,0.25)]'
                        : 'text-zinc-400 hover:text-zinc-100'
                        }`}
                    >
                      <span className="text-xs" aria-hidden>
                        {tab.id === 'habits' ? (
                          <span className="grid grid-cols-2 gap-0.5">
                            {[0, 1, 2, 3].map((cell) => (
                              <span key={cell} className="h-1.5 w-2 rounded-full bg-current opacity-90" />
                            ))}
                          </span>
                        ) : (
                          <span className="flex flex-col gap-0.5">
                            {[0, 1, 2].map((row) => (
                              <span key={row} className="flex items-center gap-0.5">
                                <span className="h-1 w-1 rounded-full bg-current opacity-90" />
                                <span className="h-1 w-3 rounded-full bg-current opacity-90" />
                                <span className="h-1 w-3 rounded-full bg-current opacity-90" />
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 min-h-[380px]">
              {dashboardView === 'habits' ? (
                filteredHabits.length === 0 ? (
                  <div className="mt-6 flex justify-center">
                    <div className="flex max-w-md items-center gap-3 px-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/70">
                        <span className="text-lg">🌱</span>
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-zinc-100">
                          No hay hábitos en esta categoría todavía.
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Cambia de categoría o crea un nuevo hábito para
                          empezar a ver tu progreso.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredHabits.map((habit) => {
                      const menuOpen = menuOpenId === habit.id;

                      return (
                        <article
                          key={habit.id}
                          className={`group relative overflow-visible rounded-2xl bg-gradient-to-b ${getHabitBackgroundClass(
                            habit.color,
                          )} p-4 transition ${getHabitRingClass(habit.color)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800/80 text-lg">
                                {habit.emoji}
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-zinc-50">
                                  {habit.name}
                                </h3>
                                <p className="text-xs text-zinc-400">
                                  Racha de{' '}
                                  <span className="font-semibold text-zinc-100">
                                    {habit.streak}
                                  </span>{' '}
                                  días
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <span
                                className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${habit.completedToday
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-zinc-800 text-zinc-400'
                                  }`}
                              >
                                {habit.completedToday
                                  ? 'Completado hoy'
                                  : 'Pendiente'}
                              </span>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(menuOpen ? null : habit.id);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/90 text-zinc-400 ring-1 ring-zinc-700/80 transition hover:bg-zinc-800 hover:text-zinc-100"
                                  aria-label="Opciones de hábito"
                                >
                                  <span className="text-xs">⋯</span>
                                </button>

                                {menuOpen && (
                                  <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-2xl bg-zinc-900/95 p-1 text-xs text-zinc-100 shadow-[0_18px_45px_rgba(0,0,0,0.55)] ring-1 ring-zinc-700/80 backdrop-blur-xl">
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-zinc-800/90"
                                      onClick={() => {
                                        setEditingHabit(habit);
                                        setEditName(habit.name);
                                        setEditCategory(habit.category);
                                        setEditEmoji(habit.emoji);
                                        setEditColor(habit.color ?? 'zinc');
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <span>Editar</span>
                                      <span className="text-[10px] text-zinc-400">
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left hover:bg-zinc-800/90"
                                      onClick={() => {
                                        setLoggingHabit(habit);
                                        setLogAmount('');
                                        setExistingLog(null);
                                        setTodayLogError(null);
                                        setIsLoadingTodayLog(false);
                                        setMenuOpenId(null);
                                      }}
                                    >
                                      <span>Registrar progreso</span>
                                      <span className="text-[10px] text-zinc-400">
                                      </span>
                                    </button>
                                    <div className="my-1 h-px bg-zinc-800/80" />
                                    <button
                                      type="button"
                                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-red-300 hover:bg-red-500/10 hover:text-red-200"
                                      onClick={() =>
                                        deleteHabitMutation.mutate(
                                          habit.id,
                                        )
                                      }
                                    >
                                      <span>Eliminar</span>
                                      <span className="text-[10px] text-red-300">
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-1">
                            {habit.history.map((day) => (
                              <div
                                key={day.date}
                                className={`h-2.5 flex-1 rounded-full ${day.completed
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                  : 'bg-zinc-800'
                                  }`}
                              />
                            ))}
                          </div>

                          <div className="mt-3 flex justify-between text-[11px] text-zinc-500">
                            <span>
                              {habit.type === 'time' && `${habit.hoursThisMonth} h este mes`}
                              {habit.type === 'count' && `${habit.totalThisMonth} veces este mes`}
                              {habit.type === 'boolean' && `${habit.totalThisMonth} días completados este mes`}
                              {habit.type === 'number' &&
                                (habit.unit === 'km'
                                  ? `${habit.totalThisMonth} km este mes`
                                  : habit.unit === 'kcal'
                                    ? `${habit.totalThisMonth} kcal este mes`
                                    : habit.unit === 'kg'
                                      ? `${habit.totalThisMonth} kg registrados este mes`
                                      : `${habit.totalThisMonth} ${habit.unit || 'unidades'} este mes`)}
                            </span>
                            <span>
                              Últimos {habit.history.length} días
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : filteredHabits.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-zinc-900/60 p-6 text-center text-sm text-zinc-400 ring-1 ring-zinc-800/70">
                  No hay calendarios que mostrar.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredHabits.map((habit) => {
                    const weeks = buildMonthCalendar(habit);
                    return (
                      <article
                        key={`calendar-${habit.id}`}
                        className={`rounded-3xl bg-gradient-to-b ${getHabitBackgroundClass(
                          habit.color,
                        )} p-4 ${getHabitRingClass(habit.color)}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-zinc-900/40 text-lg">
                              {habit.emoji}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-zinc-50">
                                {habit.name}
                              </p>
                              <p className="text-[11px] text-zinc-200/80">
                                {CATEGORY_LABELS[habit.category]}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-zinc-200/80">
                            {habit.history.filter((d) => d.completed).length} días
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-200/70">
                          <span className="capitalize">{monthLabel}</span>
                          <span>Últimos registros</span>
                        </div>

                        {weeks ? (
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-7 gap-1 text-[10px] text-zinc-300/80">
                              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                                <span
                                  key={`dow-${habit.id}-${d}`}
                                  className="mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-zinc-400"
                                >
                                  {d}
                                </span>
                              ))}

                              {weeks.map((week) =>
                                week.map((cell) =>
                                  cell.date ? (
                                    <span
                                      key={cell.key}
                                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${cell.completed
                                        ? 'bg-emerald-400/90 text-emerald-50'
                                        : 'bg-zinc-900/70 text-zinc-400'
                                        }`}
                                    >
                                      {cell.date.getDate()}
                                    </span>
                                  ) : (
                                    <span key={cell.key} className="h-6 w-6 rounded-full" />
                                  )
                                )
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-zinc-200/80">
                            Aún no hay historial este mes.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Panel lateral de edición de hábito */}
      {editingHabit && (
        <div className="fixed inset-0 z-30 flex justify-end">
          {/* Backdrop oscuro clicable */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingHabit(null)}
          />
          {/* Sidebar */}
          <aside className="relative z-40 flex h-full w-full max-w-sm flex-col bg-zinc-950/90 px-5 py-6 shadow-[0_0_40px_rgba(0,0,0,0.7)] ring-1 ring-zinc-800/80 backdrop-blur-2xl">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Editar hábito
                </p>
                <h2 className="text-sm font-semibold text-zinc-50">
                  {editingHabit.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingHabit(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 ring-1 ring-zinc-700/80 hover:bg-zinc-800 hover:text-zinc-100"
                aria-label="Cerrar panel"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
              {/* Nombre */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">
                  Nombre del hábito
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-50 outline-none ring-offset-0 focus:border-zinc-400 focus:ring-0"
                />
              </div>

              {/* Cambiar categoría */}
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-400">
                  Categoría
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    ['fitness', 'study', 'health', 'personal', 'work', 'creativity', 'spirituality', 'home'] as HabitCategory[]
                  ).map(
                    (cat) => {
                      const active = editCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setEditCategory(cat)}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${active
                            ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                            : 'bg-zinc-900 text-zinc-300 ring-1 ring-zinc-700 hover:bg-zinc-800'
                            }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* Cambiar emoji */}
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-400">
                  Emoji
                </p>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => {
                    const active = editEmoji === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditEmoji(emoji)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition ${active
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                          : 'bg-zinc-900 text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-800'
                          }`}
                        aria-label={`Elegir emoji ${emoji}`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color de la tarjeta */}
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-400">
                  Color de la tarjeta
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_CHOICES.map((c) => {
                    const active = editColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setEditColor(c.id)}
                        className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] transition ${active
                          ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                          : 'bg-zinc-900 text-zinc-200 ring-1 ring-zinc-700 hover:bg-zinc-800'
                          }`}
                      >
                        <span
                          className={`h-4 w-7 rounded-full bg-gradient-to-r ${c.previewClass}`}
                        />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer acciones */}
            <footer className="mt-4 space-y-3">
              {updateHabitMutation.error && (
                <p className="text-xs text-red-400">
                  {(updateHabitMutation.error as Error).message}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!editingHabit) return;
                  updateHabitMutation.mutate({
                    id: editingHabit.id,
                    name: editName.trim() || editingHabit.name,
                    category: editCategory,
                    emoji: editEmoji,
                    color: editColor,
                  });
                }}
                disabled={updateHabitMutation.isPending}
                className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-white disabled:opacity-60"
              >
                {updateHabitMutation.isPending ? 'Guardando…' : 'Guardar cambios'}
              </button>

              <button
                type="button"
                onClick={() => setEditingHabit(null)}
                className="inline-flex w-full items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-700/80 hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </footer>
          </aside>
        </div>
      )
      }

      {/* Modal centrado para registrar progreso */}
      {
        loggingHabit && (
          <div className="fixed inset-0 z-40 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={() => {
                setLoggingHabit(null);
                setExistingLog(null);
                setTodayLogError(null);
                setIsLoadingTodayLog(false);
              }}
            />

            {/* Caja principal estilo Apple */}
            <div className="relative z-50 w-full max-w-sm rounded-[28px] bg-zinc-950/90 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.85)] ring-1 ring-zinc-800/80 backdrop-blur-2xl">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    Registrar progreso
                  </p>
                  <h2 className="text-sm font-semibold text-zinc-50">
                    {loggingHabit.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLoggingHabit(null);
                    setExistingLog(null);
                    setTodayLogError(null);
                    setIsLoadingTodayLog(false);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 ring-1 ring-zinc-700/80 hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </header>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-400">
                    Cantidad de hoy
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.25"
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                    placeholder={
                      loggingHabit?.type === 'time'
                        ? 'Ej. 1.0 h'
                        : loggingHabit?.type === 'count'
                          ? 'Ej. 3 veces'
                          : loggingHabit?.type === 'number'
                            ? loggingHabit.unit === 'km'
                              ? 'Ej. 5 km'
                              : loggingHabit.unit === 'kcal'
                                ? 'Ej. 300 kcal'
                                : loggingHabit.unit === 'kg'
                                  ? 'Ej. 70.5 kg'
                                  : 'Ej. 10 unidades'
                            : 'Este hábito se marca como completado'
                    }
                    disabled={isBooleanHabit}
                    className="w-full rounded-xl border border-zinc-700/70 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-50 outline-none ring-offset-0 focus:border-zinc-400 focus:ring-0"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {isBooleanHabit
                      ? booleanAlreadyLogged
                        ? 'Este hábito ya fue marcado hoy. Solo puedes registrarlo una vez por día.'
                        : 'Marca este hábito una sola vez al día para contar la racha.'
                      : 'Registra o ajusta el avance del día. Guardaremos un único registro que puedes editar.'}
                  </p>
                </div>

                {loggingHabit && !isBooleanHabit && (
                  <div className="space-y-1 text-[11px] text-zinc-500">
                    {isLoadingTodayLog && (
                      <span className="inline-flex items-center gap-2 text-zinc-400">
                        <IconSpinner />
                        <span>Buscando registro guardado…</span>
                      </span>
                    )}
                    {todayLogError && (
                      <span className="text-amber-300">{todayLogError}</span>
                    )}
                    {existingLog && !isLoadingTodayLog && !todayLogError && (
                      <span>
                        Registro de hoy: {existingLog.value} {loggingHabit.unit}. Puedes actualizarlo si lo necesitas.
                      </span>
                    )}
                  </div>
                )}

                {logMutationError && (
                  <p className="text-xs text-red-400">{logMutationError.message}</p>
                )}
              </div>

              <footer className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveLog}
                  disabled={savingLog || (isBooleanHabit && booleanAlreadyLogged)}
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-white disabled:opacity-60"
                >
                  {savingLog ? savingLabel : primaryActionLabel}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLoggingHabit(null);
                    setExistingLog(null);
                    setTodayLogError(null);
                    setIsLoadingTodayLog(false);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-700/80 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
              </footer>
            </div>
          </div>
        )
      }

      {/* Botón flotante Apple-style para crear hábito */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="group fixed bottom-8 right-8 inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-1 ring-white/20 transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] active:scale-95"
        aria-label="Crear hábito"
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

      {/* Modal de creación de hábito */}
      <HabitCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(values) => createHabitMutation.mutate(values)}
        submitting={createHabitMutation.isPending}
        errorMessage={
          createHabitMutation.error
            ? (createHabitMutation.error as Error).message
            : null
        }
      />
    </div >
  );
}