import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HabitChart } from '../Metrics';
import { MetricsApi } from '../../lib/metrics';
import type { HabitMetricsResponse } from '../../types/metrics';

type Period = '7d' | '30d' | '90d';

export const HabitGraph: React.FC<{ habitName: string; habitId: string; emoji?: string; color?: string }> = ({
  habitName, habitId, emoji, color
}) => {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: habitMetrics, isLoading } = useQuery<HabitMetricsResponse>({
    queryKey: ['habitMetrics', habitId, period],
    queryFn: () => MetricsApi.getHabitMetrics(habitId, period),
  });

  if (isLoading) return <div className="mx-2 my-1 animate-pulse h-56 rounded-3xl bg-zinc-900/40 ring-1 ring-zinc-800/60" />;
  if (!habitMetrics) return null;

  return (
    <div className="mx-10 h-full rounded-3xl bg-zinc-900/70 backdrop-blur-xl ring-1 ring-zinc-800/70 shadow-[0_18px_50px_rgba(0,0,0,0.7)] px-5 py-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {(habitMetrics.emoji || emoji) && (
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-800/80 text-xl">
              {habitMetrics.emoji || emoji}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
              Evolución de hábito
            </p>
            <h3 className="text-sm font-semibold text-zinc-50">
              {habitName}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-zinc-900/80 px-1.5 py-[2px] text-[10px] font-medium text-zinc-400 ring-1 ring-zinc-700/70">
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`px-2 py-0.5 rounded-full transition ${period === '7d' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'}`}
          >
            7d
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30d')}
            className={`px-2 py-0.5 rounded-full transition ${period === '30d' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'}`}
          >
            30d
          </button>
          <button
            type="button"
            onClick={() => setPeriod('90d')}
            className={`px-2 py-0.5 rounded-full transition ${period === '90d' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'}`}
          >
            90d
          </button>
        </div>
      </div>

      <div className="h-40 w-full">
        <HabitChart
          data={habitMetrics.chartData}
          label=""
          color={habitMetrics.color || color}
          unit={habitMetrics.habitUnit}
        />
      </div>

      <div className="flex gap-4 text-[11px] text-zinc-400">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Racha</p>
          <p className="mt-0.5 text-sm font-medium text-zinc-50">
            {habitMetrics.metrics.currentStreak} días
          </p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Media</p>
          <p className="mt-0.5 text-sm font-medium text-zinc-50">
            {habitMetrics.metrics.avgValue.toFixed(1)}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">% días completados</p>
          <p className="mt-0.5 text-sm font-medium text-emerald-300">
            {habitMetrics.metrics.completionRate}%
          </p>
        </div>
      </div>
    </div>
  );
};
