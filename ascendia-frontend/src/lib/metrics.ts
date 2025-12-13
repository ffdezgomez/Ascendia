import axiosInstance from '../utils/axiosConfig';
import type { HabitMetricsResponse, HabitMetric, AllHabitsMetrics } from '../types/metrics';

// export interface HabitMetrics {
//   habitId: string;
//   habitName: string;
//   period: string;
//   metrics: {
//     totalLogs: number;
//     totalValue: number;
//     avgValue: number;
//     maxValue: number;
//     minValue: number;
//     currentStreak: number;
//     longestStreak: number;
//     completionRate: number;
//   };
//   chartData: Array<{
//     date: string;
//     value: number;
//     count: number;
//   }>;
// }

// export interface AllHabitsMetrics {
//   period: string;
//   summary: {
//     totalHabits: number;
//     totalLogs: number;
//     mostActive: {
//       habitId: string;
//       habitName: string;
//       totalLogs: number;
//       avgValue: number;
//       streak: number;
//     } | null;
//   };
//   habits: Array<{
//     habitId: string;
//     habitName: string;
//     totalLogs: number;
//     avgValue: number;
//     streak: number;
//   }>;
// }

export const MetricsApi = {
  getHabitMetrics: async (habitId: string, period = '30d'): Promise<HabitMetricsResponse> => {
    const response = await axiosInstance.get(`/metrics/habit/${habitId}?period=${period}`);
    return response.data;
  },

  getAllHabitsMetrics: async (period = '30d'): Promise<AllHabitsMetrics> => {
    const response = await axiosInstance.get(`/metrics/habits?period=${period}`);
    return response.data;
  },
};

export type { HabitMetricsResponse, HabitMetric, AllHabitsMetrics };
