import { MetricsApi } from '../../src/lib/metrics';
import axiosInstance from '../../src/utils/axiosConfig';

jest.mock('../../src/utils/axiosConfig');

describe('MetricsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHabitMetrics', () => {
    it('should fetch habit metrics with default period', async () => {
      const mockMetrics = {
        habitId: 'habit1',
        habitName: 'Exercise',
        period: '30d',
        metrics: {
          totalLogs: 15,
          totalValue: 150,
          avgValue: 10,
          maxValue: 20,
          minValue: 5,
          currentStreak: 5,
          longestStreak: 10,
          completionRate: 0.75,
        },
        chartData: [],
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockMetrics,
      });

      const result = await MetricsApi.getHabitMetrics('habit1');
      expect(result).toEqual(mockMetrics);
      expect(axiosInstance.get).toHaveBeenCalledWith('/metrics/habit/habit1?period=30d');
    });

    it('should fetch habit metrics with custom period', async () => {
      const mockMetrics = {
        habitId: 'habit1',
        habitName: 'Exercise',
        period: '7d',
        metrics: {
          totalLogs: 5,
          totalValue: 50,
          avgValue: 10,
          maxValue: 15,
          minValue: 5,
          currentStreak: 3,
          longestStreak: 5,
          completionRate: 0.8,
        },
        chartData: [],
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockMetrics,
      });

      const result = await MetricsApi.getHabitMetrics('habit1', '7d');
      expect(result).toEqual(mockMetrics);
      expect(axiosInstance.get).toHaveBeenCalledWith('/metrics/habit/habit1?period=7d');
    });
  });

  describe('getAllHabitsMetrics', () => {
    it('should fetch all habits metrics with default period', async () => {
      const mockMetrics = {
        period: '30d',
        summary: {
          totalHabits: 3,
          totalLogs: 45,
          mostActive: {
            habitId: 'habit1',
            habitName: 'Exercise',
            totalLogs: 20,
            avgValue: 10,
            streak: 5,
          },
        },
        habits: [
          {
            habitId: 'habit1',
            habitName: 'Exercise',
            totalLogs: 20,
            avgValue: 10,
            streak: 5,
          },
          {
            habitId: 'habit2',
            habitName: 'Reading',
            totalLogs: 15,
            avgValue: 8,
            streak: 3,
          },
        ],
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockMetrics,
      });

      const result = await MetricsApi.getAllHabitsMetrics();
      expect(result).toEqual(mockMetrics);
      expect(axiosInstance.get).toHaveBeenCalledWith('/metrics/habits?period=30d');
    });

    it('should fetch all habits metrics with custom period', async () => {
      const mockMetrics = {
        period: '7d',
        summary: {
          totalHabits: 2,
          totalLogs: 10,
          mostActive: null,
        },
        habits: [],
      };

      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: mockMetrics,
      });

      const result = await MetricsApi.getAllHabitsMetrics('7d');
      expect(result).toEqual(mockMetrics);
      expect(axiosInstance.get).toHaveBeenCalledWith('/metrics/habits?period=7d');
    });
  });
});
