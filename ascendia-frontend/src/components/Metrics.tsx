import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { DayData } from '../types/metrics';

interface HabitChartProps {
  data: DayData[];
  label: string;
  color?: string;
  unit?: string;
}

function mapColorToHex(color?: string): string {
  switch (color) {
    case 'emerald': return '#22c55e'; // verde
    case 'sky':     return '#38bdf8';
    case 'amber':   return '#fbbf24';
    case 'violet':  return '#8b5cf6';
    case 'rose':    return '#fb7185';
    case 'teal':    return '#14b8a6';
    case 'indigo':  return '#6366f1';
    case 'lime':    return '#84cc16';
    case 'orange':  return '#fb923c';
    case 'zinc':    return '#71717a';
    default:        return '#38bdf8';
  }
}

export const HabitChart: React.FC<HabitChartProps> = ({ data, label, color, unit }) => (
  <div style={{ width: '100%', height: 180 }}>
    {label && (
      <h3 className="mb-1 text-[11px] text-zinc-500 font-medium uppercase tracking-[0.14em]">
        {label}
      </h3>
    )}
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => {
            // value viene como 'YYYY-MM-DD'; lo formateamos a 'DD MMM'
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
            });
          }}
          tick={{ fontSize: 9, fill: '#a1a1aa' }}
          tickLine={false}
          axisLine={{ stroke: '#3f3f46', strokeWidth: 1 }}
          minTickGap={12}
        />
        <YAxis
          tick={{ fontSize: 9, fill: '#a1a1aa' }}
          tickFormatter={(value: number) => {
            if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(1)}k`;
            }
            return String(value);
          }}
          tickLine={false}
          axisLine={{ stroke: '#3f3f46', strokeWidth: 1 }}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#09090b',
            borderRadius: 12,
            border: '1px solid #27272a',
            padding: '6px 8px',
          }}
          labelFormatter={(value: string) => {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString('es-ES', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            });
          }}
          formatter={(value: number) => {
            // Formateamos según la unidad del hábito si está disponible
            if (!unit) {
              return [`${value}`, ''];
            }

            const normalized = unit.toLowerCase();

            if (['h', 'hora', 'horas'].includes(normalized)) {
              return [`${value} h`, ''];
            }
            if (['veces', 'vez'].includes(normalized)) {
              return [`${value} veces`, ''];
            }
            if (['km', 'kilometros', 'kilómetros'].includes(normalized)) {
              return [`${value} km`, ''];
            }
            if (['kcal', 'calorias', 'calorías'].includes(normalized)) {
              return [`${value} kcal`, ''];
            }
            if (['kg'].includes(normalized)) {
              return [`${value} kg`, ''];
            }

            return [`${value} ${unit}`, ''];
          }}
          labelStyle={{ fontSize: 11, color: '#e4e4e7' }}
          itemStyle={{ fontSize: 11, color: '#38bdf8' }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={mapColorToHex(color)} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

interface MetricsCardProps {
  title: string
  value: string | number
  trend?: number
  icon?: React.ReactNode
}

export function MetricsCard({ title, value, trend, icon }: MetricsCardProps) {
  const trendColor = trend 
    ? trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400'
    : 'text-zinc-400'

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-100">{value}</p>
        </div>
        {icon && (
          <div className="text-zinc-500">
            {icon}
          </div>
        )}
      </div>
      
      {trend !== undefined && (
        <div className={`mt-2 flex items-center text-sm ${trendColor}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          <span className="ml-1 text-zinc-500">vs semana pasada</span>
        </div>
      )}
    </div>
  )
}