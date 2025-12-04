import React from 'react';

type MetricsProps = {
  stats: {
    totalDaysCompleted: number;
    totalHours: number;
    bestStreak: number;
    activeHabits: number;
  };
};

export function MetricsWidget({ stats }: MetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
    </div>
  );
}
