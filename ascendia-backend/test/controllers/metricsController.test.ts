import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { getHabitMetrics, getAllHabitsMetrics, getComparativeMetrics } from '../../src/controllers/metricsController'
import Habit from '../../src/models/habit.js'
import Log from '../../src/models/log.js'

// Mocks
vi.mock('../../src/models/habit.js')
vi.mock('../../src/models/log.js')

describe('metricsController', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      session: {}
    } as any
    
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis()
    } as any
    
    next = vi.fn()
    
    vi.clearAllMocks()
  })

  describe('getHabitMetrics', () => {
    it('debe retornar métricas de un hábito con logs', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      req.query = { period: '7d' }
      ;(req as any).currentUserId = userId

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: ['log1', 'log2', 'log3']
      }

      const mockLogs = [
        { _id: 'log1', date: new Date('2025-11-14'), value: 30, user: userId },
        { _id: 'log2', date: new Date('2025-11-15'), value: 45, user: userId },
        { _id: 'log3', date: new Date('2025-11-16'), value: 60, user: userId }
      ]

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      vi.mocked(Log.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockLogs)
      } as any)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          habitId,
          habitName: 'Ejercicio',
          period: '7d',
          metrics: expect.objectContaining({
            totalLogs: 3,
            totalValue: 135,
            avgValue: 45,
            maxValue: 60,
            minValue: 30
          }),
          chartData: expect.any(Array)
        })
      )
    })

    it('debe retornar 404 si el hábito no existe', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      ;(req as any).currentUserId = userId

      vi.mocked(Habit.findOne).mockResolvedValue(null)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith({ error: 'Hábito no encontrado' })
    })

    it('debe calcular métricas correctamente con logs vacíos', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      req.query = { period: '7d' }
      ;(req as any).currentUserId = userId

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: []
      }

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      vi.mocked(Log.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      } as any)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            totalLogs: 0,
            totalValue: 0,
            avgValue: 0,
            maxValue: 0,
            minValue: 0,
            currentStreak: 0,
            longestStreak: 0
          })
        })
      )
    })

    it('debe manejar diferentes períodos (7d, 30d, 90d)', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      req.query = { period: '30d' }
      ;(req as any).currentUserId = userId

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: []
      }

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      vi.mocked(Log.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue([])
      } as any)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          period: '30d'
        })
      )
    })
  })

  describe('getAllHabitsMetrics', () => {
    it('debe retornar resumen de todos los hábitos', async () => {
      const userId = '507f1f77bcf86cd799439012'
      req.query = { period: '7d' }
      ;(req as any).currentUserId = userId

      const mockHabits = [
        { _id: 'habit1', name: 'Ejercicio', logs: ['log1', 'log2'] },
        { _id: 'habit2', name: 'Lectura', logs: ['log3'] }
      ]

      const mockLogs1 = [
        { value: 30, date: new Date('2025-11-14') },
        { value: 45, date: new Date('2025-11-15') }
      ]
      const mockLogs2 = [
        { value: 60, date: new Date('2025-11-14') }
      ]

      vi.mocked(Habit.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockHabits)
      } as any)

      vi.mocked(Log.find)
        .mockReturnValueOnce({
          sort: vi.fn().mockResolvedValue(mockLogs1)
        } as any)
        .mockReturnValueOnce({
          sort: vi.fn().mockResolvedValue(mockLogs2)
        } as any)

      await getAllHabitsMetrics(req as Request, res as Response, next)
      // ...resto del test...
    })

    

    it('debe manejar usuario sin hábitos', async () => {
      const userId = '507f1f77bcf86cd799439012'
      
      ;(req as any).currentUserId = userId
      req.query = { period: '7d' }

      vi.mocked(Habit.find).mockReturnValue({
        populate: vi.fn().mockResolvedValue([])
      } as any)

      await getAllHabitsMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          period: '7d',
          summary: {
            totalHabits: 0,
            totalLogs: 0,
            mostActive: null
          },
          habits: []
        })
      )
    })
  })

  describe('getComparativeMetrics', () => {
    it('debe comparar métricas semanales y mensuales', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      ;(req as any).currentUserId = userId

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: []
      }

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      
      // Esta semana
      vi.mocked(Log.find).mockResolvedValueOnce([
        { value: 30 },
        { value: 45 }
      ] as any)
      
      // Semana pasada
      vi.mocked(Log.find).mockResolvedValueOnce([
        { value: 20 }
      ] as any)
      
      // Este mes
      vi.mocked(Log.find).mockResolvedValueOnce([
        { value: 30 },
        { value: 45 },
        { value: 60 }
      ] as any)

      await getComparativeMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          habitId,
          habitName: 'Ejercicio',
          thisWeek: {
            count: 2,
            total: 75
          },
          lastWeek: {
            count: 1,
            total: 20
          },
          thisMonth: {
            count: 3,
            total: 135
          },
          trend: 100 // (2 - 1) / 1 * 100 = 100% de mejora
        })
      )
    })

    it('debe calcular tendencia negativa correctamente', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      ;(req as any).currentUserId = userId

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: []
      }

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      
      // Esta semana (menos logs)
      vi.mocked(Log.find).mockResolvedValueOnce([
        { value: 30 }
      ] as any)
      
      // Semana pasada (más logs)
      vi.mocked(Log.find).mockResolvedValueOnce([
        { value: 20 },
        { value: 25 }
      ] as any)
      
      // Este mes
      vi.mocked(Log.find).mockResolvedValueOnce([
        { value: 30 }
      ] as any)

      await getComparativeMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          trend: -50 // (1 - 2) / 2 * 100 = -50% de disminución
        })
      )
    })
  })

  describe('Funciones auxiliares - calculateStreak', () => {
    it('debe calcular racha actual correctamente', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      req.query = { period: '7d' }
      ;(req as any).currentUserId = userId

      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: ['log1', 'log2', 'log3']
      }

      // Logs consecutivos hasta hoy
      const mockLogs = [
        { _id: 'log1', date: twoDaysAgo, value: 30, user: userId },
        { _id: 'log2', date: yesterday, value: 45, user: userId },
        { _id: 'log3', date: today, value: 60, user: userId }
      ]

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      vi.mocked(Log.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockLogs)
      } as any)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            currentStreak: 3,
            longestStreak: 3
          })
        })
      )
    })

    it('debe resetear racha si hay días sin logs', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      req.query = { period: '7d' }
      ;(req as any).currentUserId = userId

      const today = new Date()
      const threeDaysAgo = new Date(today)
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const mockHabit = {
        _id: habitId,
        name: 'Ejercicio',
        logs: ['log1']
      }

      // Log de hace 3 días (racha rota)
      const mockLogs = [
        { _id: 'log1', date: threeDaysAgo, value: 30, user: userId }
      ]

      vi.mocked(Habit.findOne).mockResolvedValue(mockHabit as any)
      vi.mocked(Log.find).mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockLogs)
      } as any)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: expect.objectContaining({
            currentStreak: 0 // Racha rota
          })
        })
      )
    })
  })

  describe('Manejo de errores', () => {
    it('debe llamar a next() si hay un error', async () => {
      const habitId = '507f1f77bcf86cd799439011'
      const userId = '507f1f77bcf86cd799439012'
      
      req.params = { habitId }
      ;(req as any).currentUserId = userId

      const error = new Error('Database error')
      vi.mocked(Habit.findOne).mockRejectedValue(error)

      await getHabitMetrics(req as Request, res as Response, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})