export interface DayData {
  date: string;
  value: number;
  count: number;
}

export interface HabitMetricsResponse {
  habitId: string;
  habitName: string;
  emoji?: string;
  color?: string;
  period: string;
  // tipo y unidad del hábito para poder mostrar tooltips con el texto correcto
  habitType?: 'time' | 'count' | 'boolean' | 'number';
  habitUnit?: string;
  metrics: {
    totalLogs: number;
    totalValue: number;
    avgValue: number;
    maxValue: number;
    minValue: number;
    currentStreak: number;
    longestStreak: number;
    completionRate: number;
  };
  chartData: DayData[];
}

export type HabitCategory =
  | 'fitness'
  | 'study'
  | 'health'
  | 'personal'
  | 'work'
  | 'creativity'
  | 'spirituality'
  | 'home';

export interface HabitMetric {
  habitId: string;
  habitName: string;
  totalLogs: number;
  avgValue: number;
  streak: number;
  emoji?: string;
  color?: string;
  // Misma categoría que se usa en el dashboard/backend
  category: HabitCategory;
}

export interface AllHabitsMetrics {
  period: string;
  summary: {
    totalHabits: number;
    totalLogs: number;
    mostActive: HabitMetric | null;
  };
  habits: HabitMetric[];
}
