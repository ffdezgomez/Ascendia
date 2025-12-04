import React from 'react';
import { HabitSummary, HabitCardColor } from '../../types/habits';

type HabitsWidgetProps = {
  habits: HabitSummary[];
  onLog: (habit: HabitSummary) => void;
  onEdit: (habit: HabitSummary) => void;
  onDelete: (habitId: string) => void;
};

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

export function HabitsWidget({ habits, onLog, onEdit, onDelete }: HabitsWidgetProps) {
  const [menuOpenId, setMenuOpenId] = React.useState<string | null>(null);

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[26px] bg-zinc-900/75 p-6 md:p-10 text-center backdrop-blur-xl ring-1 ring-inset ring-zinc-800/60">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800/50 text-3xl">
          🌱
        </div>
        <h3 className="text-lg font-semibold text-zinc-200">No hay hábitos activos</h3>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          Empieza a construir tu mejor versión creando tu primer hábito hoy mismo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {habits.map((habit) => {
        const ringClass = getHabitRingClass(habit.color);
        const bgClass = getHabitBackgroundClass(habit.color);

        return (
          <div
            key={habit.id}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-[24px] bg-gradient-to-br ${bgClass} p-4 md:p-5 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl ${ringClass}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/20 text-xl shadow-inner backdrop-blur-sm">
                  {habit.emoji}
                </span>
                <div>
                  <h3 className="font-semibold text-zinc-100">{habit.name}</h3>
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
                    {habit.category}
                  </p>
                </div>
              </div>

              {/* Menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpenId(menuOpenId === habit.id ? null : habit.id)}
                  className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpenId === habit.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpenId(null)}
                    />
                    <div className="absolute right-0 top-8 z-20 w-32 origin-top-right rounded-xl bg-zinc-900 py-1 shadow-xl ring-1 ring-zinc-800 focus:outline-none">
                      <button
                        onClick={() => {
                          setMenuOpenId(null);
                          onEdit(habit);
                        }}
                        className="block w-full px-4 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpenId(null);
                          onDelete(habit.id);
                        }}
                        className="block w-full px-4 py-2 text-left text-xs text-rose-400 hover:bg-zinc-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-black/20 p-3 backdrop-blur-sm">
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wide">
                  Racha
                </p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white tabular-nums">
                    {habit.streak}
                  </span>
                  <span className="text-[10px] text-white/60">días</span>
                </div>
              </div>
              <div className="rounded-2xl bg-black/20 p-3 backdrop-blur-sm">
                <p className="text-[10px] font-medium text-white/50 uppercase tracking-wide">
                  Mes
                </p>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white tabular-nums">
                    {habit.totalThisMonth}
                  </span>
                  <span className="text-[10px] text-white/60">{habit.unit}</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onLog(habit)}
              disabled={habit.completedToday}
              className={`mt-4 w-full rounded-xl py-2 md:py-2.5 text-xs md:text-sm font-semibold shadow-sm transition-all active:scale-95 ${habit.completedToday
                ? 'bg-emerald-500/20 text-emerald-200 cursor-default ring-1 ring-emerald-500/30'
                : 'bg-white text-zinc-900 hover:bg-zinc-100'
                }`}
            >
              {habit.completedToday ? 'Completado hoy' : 'Registrar progreso'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
