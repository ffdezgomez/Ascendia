import type { Request, Response, NextFunction } from 'express'
import Log  from '../models/log.js'
import Habit from '../models/habit.js'
import { getEmoji } from '../services/dashboardSummary.js'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'

// Métricas de un hábito específico
export async function getHabitMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { habitId } = req.params
    const { period = '7d' } = req.query // 7d, 30d, 90d

    // Verificar propiedad del hábito
    const habit = await Habit.findOne({ _id: habitId, user: userId })
    if (!habit) {
      return res.status(404).json({ error: 'Hábito no encontrado' })
    }

    // Calcular rango de fechas
    const now = new Date()
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = subDays(now, days)

    // Obtener logs del período
    const logs = await Log.find({
      _id: { $in: habit.logs },
      date: { $gte: startDate, $lte: now }
    }).sort({ date: 1 })

    // Calcular métricas
    const totalLogs = logs.length
    const totalValue = logs.reduce((sum, log) => sum + log.value, 0)
    const avgValue = totalLogs > 0 ? totalValue / totalLogs : 0
    const maxValue = totalLogs > 0 ? Math.max(...logs.map(l => l.value)) : 0
    const minValue = totalLogs > 0 ? Math.min(...logs.map(l => l.value)) : 0

    // Calcular racha actual
    const streak = calculateStreak(logs)

    // Agrupar por día para el gráfico
    const dailyData = groupByDay(logs, startDate, now)

    res.json({
      habitId,
      habitName: habit.name,
      emoji: habit.emoji || getEmoji(habit.name ?? ''),
      color: habit.color || 'zinc',
      period,
      habitType: habit.type,
      habitUnit: habit.unit,
      metrics: {
        totalLogs,
        totalValue,
        avgValue: Math.round(avgValue * 100) / 100,
        maxValue,
        minValue,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        completionRate: calculateCompletionRate(logs, days)
      },
      chartData: dailyData
    })
  } catch (error) {
    next(error)
  }
}

// Resumen de todos los hábitos
export async function getAllHabitsMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { period = '7d' } = req.query

    const habits = await Habit.find({ user: userId }).populate('logs')

    const now = new Date()
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const startDate = subDays(now, days)

    const metricsPerHabit = await Promise.all(
      habits.map(async (habit) => {
        const logs = await Log.find({
          _id: { $in: habit.logs },
          date: { $gte: startDate, $lte: now }
        })

        return {
          habitId: habit._id,
          habitName: habit.name,
          totalLogs: logs.length,
          avgValue: logs.length > 0 
            ? logs.reduce((sum, l) => sum + l.value, 0) / logs.length 
            : 0,
          streak: calculateStreak(logs).current,
          emoji: habit.emoji || getEmoji(habit.name ?? ''),
          color: habit.color || 'zinc',
          // Usamos la misma categoría normalizada que en el dashboard
          category: (habit as any).category
        }
      })
    )

   const totalLogsAllHabits = metricsPerHabit.reduce((sum, metric) => sum + metric.totalLogs, 0)

    const mostActiveHabit = metricsPerHabit.length > 0
      ? metricsPerHabit.reduce((prev, curr) =>
          curr.totalLogs > prev.totalLogs ? curr : prev
        )
      : null

    res.json({
      period,
      summary: {
        totalHabits: habits.length,
        totalLogs: totalLogsAllHabits,
        mostActive: mostActiveHabit
      },
      habits: metricsPerHabit
    })
  } catch (error) {
    next(error)
  }
}

// Comparativa semanal vs mensual
export async function getComparativeMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).currentUserId
    const { habitId } = req.params

    const habit = await Habit.findOne({ _id: habitId, user: userId })
    if (!habit) {
      return res.status(404).json({ error: 'Hábito no encontrado' })
    }

    const now = new Date()
    
    // Esta semana
    const thisWeekStart = startOfWeek(now)
    const thisWeekEnd = endOfWeek(now)
    const thisWeekLogs = await Log.find({
      _id: { $in: habit.logs },
      date: { $gte: thisWeekStart, $lte: thisWeekEnd }
    })

    // Semana pasada
    const lastWeekStart = startOfWeek(subDays(now, 7))
    const lastWeekEnd = endOfWeek(subDays(now, 7))
    const lastWeekLogs = await Log.find({
      _id: { $in: habit.logs },
      date: { $gte: lastWeekStart, $lte: lastWeekEnd }
    })

    // Este mes
    const thisMonthStart = startOfMonth(now)
    const thisMonthEnd = endOfMonth(now)
    const thisMonthLogs = await Log.find({
      _id: { $in: habit.logs },
      date: { $gte: thisMonthStart, $lte: thisMonthEnd }
    })

    res.json({
      habitId,
      habitName: habit.name,
      thisWeek: {
        count: thisWeekLogs.length,
        total: thisWeekLogs.reduce((sum, l) => sum + l.value, 0)
      },
      lastWeek: {
        count: lastWeekLogs.length,
        total: lastWeekLogs.reduce((sum, l) => sum + l.value, 0)
      },
      thisMonth: {
        count: thisMonthLogs.length,
        total: thisMonthLogs.reduce((sum, l) => sum + l.value, 0)
      },
      trend: calculateTrend(lastWeekLogs.length, thisWeekLogs.length)
    })
  } catch (error) {
    next(error)
  }
}

// ========== FUNCIONES AUXILIARES ==========

function calculateStreak(logs: any[]) {
  if (logs.length === 0) return { current: 0, longest: 0 }

  // Ordenar por fecha
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  let currentStreak = 1
  let longestStreak = 1
  let tempStreak = 1

  for (let i = 1; i < sortedLogs.length; i++) {
    const prevDate = new Date(sortedLogs[i - 1].date)
    const currDate = new Date(sortedLogs[i].date)
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else if (diffDays > 1) {
      tempStreak = 1
    }
  }

  // Verificar si la racha está activa (último log es hoy o ayer)
  const lastLog = sortedLogs[sortedLogs.length - 1]
  const today = new Date()
  const daysSinceLastLog = Math.floor((today.getTime() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))

  currentStreak = daysSinceLastLog <= 1 ? tempStreak : 0

  return { current: currentStreak, longest: longestStreak }
}

function groupByDay(logs: any[], startDate: Date, endDate: Date) {
  const days: { date: string; value: number; count: number }[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    const dayLogs = logs.filter(l => 
      new Date(l.date).toISOString().split('T')[0] === dateStr
    )

    days.push({
      date: dateStr,
      value: dayLogs.reduce((sum, l) => sum + l.value, 0),
      count: dayLogs.length
    })

    current.setDate(current.getDate() + 1)
  }

  return days
}

function calculateCompletionRate(logs: any[], totalDays: number) {
  const uniqueDays = new Set(logs.map(l => 
    new Date(l.date).toISOString().split('T')[0]
  ))
  return Math.round((uniqueDays.size / totalDays) * 100)
}

function calculateTrend(oldValue: number, newValue: number) {
  if (oldValue === 0) return newValue > 0 ? 100 : 0
  const change = ((newValue - oldValue) / oldValue) * 100
  return Math.round(change * 10) / 10
}