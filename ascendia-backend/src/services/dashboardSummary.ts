import Habit from '../models/habit.js'
import Log from '../models/log.js'
import { listUserChallenges } from './challenges.js'

type HabitCategory =
  | 'all'
  | 'fitness'
  | 'study'
  | 'health'
  | 'personal'
  | 'work'
  | 'creativity'
  | 'spirituality'
  | 'home'
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
  | 'orange'

export type HabitSummary = {
  id: string
  name: string
  emoji: string
  color: HabitCardColor
  category: HabitCategory
  type: 'time' | 'count' | 'boolean' | 'number'
  unit: string
  totalThisMonth: number
  hoursThisMonth: number
  completedToday: boolean
  streak: number
  history: { date: string, completed: boolean }[]
}

export type ChallengeSummary = {
  id: string
  title: string
  daysLeft: number
  participants: number
  opponentName?: string
  opponentAvatar?: string
}

const CATEGORY_VALUES: HabitCategory[] = [
  'fitness',
  'study',
  'health',
  'personal',
  'work',
  'creativity',
  'spirituality',
  'home',
]
const COLOR_VALUES: HabitCardColor[] = [
  'zinc',
  'emerald',
  'sky',
  'amber',
  'violet',
  'rose',
  'teal',
  'indigo',
  'lime',
  'orange',
]

function normalizeCategory(name: unknown, fallback: HabitCategory = 'personal'): HabitCategory {
  if (typeof name === 'string' && CATEGORY_VALUES.includes(name as HabitCategory)) {
    return name as HabitCategory
  }
  return fallback
}

function normalizeColor(color: unknown): HabitCardColor {
  if (typeof color === 'string' && COLOR_VALUES.includes(color as HabitCardColor)) {
    return color as HabitCardColor
  }
  return 'zinc'
}

function guessCategory(name: string): HabitCategory {
  const n = name.toLowerCase()

  if (n.includes('gym') || n.includes('entren') || n.includes('run') || n.includes('correr')) {
    return 'fitness'
  }
  if (n.includes('leer') || n.includes('lect') || n.includes('study') || n.includes('estudi')) {
    return 'study'
  }
  if (n.includes('dorm') || n.includes('sleep') || n.includes('comer') || n.includes('agua')) {
    return 'health'
  }
  if (n.includes('medit') || n.includes('journal') || n.includes('orar') || n.includes('diario')) {
    return 'personal'
  }

  return 'personal'
}

export function getEmoji(name: string): string {
  const n = name.toLowerCase()

  if (n.includes('leer') || n.includes('lect')) return '📚'
  if (n.includes('gym') || n.includes('entren') || n.includes('run') || n.includes('correr')) return '💪'
  if (n.includes('dorm') || n.includes('sleep')) return '😴'
  if (n.includes('medit')) return '🧘'

  return '✨'
}

function buildHistoryWindow(days = 7) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: days }).map((_, idx) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - idx))
    return {
      date: d.toISOString().slice(0, 10),
      completed: false
    }
  })
}

function toDayKey(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function buildStreak(dayTotals: Map<string, number>): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  while (true) {
    const key = toDayKey(today)
    if ((dayTotals.get(key) ?? 0) > 0) {
      streak += 1
      today.setDate(today.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

async function buildSummariesFromDocs(userId: string, habits: any[]): Promise<HabitSummary[]> {
  const habitIds = habits.map((h: any) => h._id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today)
  monthStart.setDate(1)

  const logs = habitIds.length === 0
    ? []
    : await Log.find({
        user: userId,
        habit: { $in: habitIds },
      }).lean()

  const summaries = habits.map((h: any) => {
    const fallbackCategory = guessCategory(h.name ?? '')

    return {
      id: String(h._id),
      name: h.name,
      emoji: h.emoji || getEmoji(h.name ?? ''),
      color: normalizeColor(h.color),
      category: normalizeCategory(h.category, fallbackCategory),
      type: ['time', 'count', 'boolean', 'number'].includes(h.type) ? h.type : 'number',
      unit: typeof h.unit === 'string' && h.unit.trim() ? h.unit : 'u',
      totalThisMonth: 0,
      hoursThisMonth: 0,
      completedToday: false,
      streak: 0,
      history: buildHistoryWindow(),
    }
  })

  const summaryMap = new Map<string, HabitSummary>()
  for (const summary of summaries) {
    summaryMap.set(summary.id, summary)
  }

  const perHabitDayTotals = new Map<string, Map<string, number>>()
  const perHabitMonthTotals = new Map<string, number>()

  for (const log of logs) {
    const habitId = String(log.habit)
    if (!summaryMap.has(habitId)) continue

    const value = typeof log.value === 'number' ? log.value : Number(log.value) || 0
    if (value <= 0) continue

    const logDate = log.date instanceof Date ? log.date : new Date(log.date)
    const dayKey = toDayKey(logDate)

    if (!perHabitDayTotals.has(habitId)) {
      perHabitDayTotals.set(habitId, new Map())
    }
    const dayTotals = perHabitDayTotals.get(habitId)!
    dayTotals.set(dayKey, (dayTotals.get(dayKey) ?? 0) + value)

    if (logDate >= monthStart) {
      perHabitMonthTotals.set(
        habitId,
        (perHabitMonthTotals.get(habitId) ?? 0) + value,
      )
    }
  }

  const todayKey = toDayKey(today)

  for (const summary of summaries) {
    const dayTotals = perHabitDayTotals.get(summary.id)
    const monthTotal = perHabitMonthTotals.get(summary.id) ?? 0

    summary.totalThisMonth = monthTotal
    summary.hoursThisMonth = summary.type === 'time' ? monthTotal : 0
    summary.completedToday = (dayTotals?.get(todayKey) ?? 0) > 0

    if (dayTotals) {
      summary.history = buildHistoryWindow().map((entry) => ({
        date: entry.date,
        completed: (dayTotals.get(entry.date) ?? 0) > 0,
      }))
      summary.streak = buildStreak(dayTotals)
    }
  }

  return summaries
}

export async function buildHabitSummaries(userId: string, habitIds?: string[]): Promise<HabitSummary[]> {
  const habitQuery = Habit.find({ user: userId })
  if (habitIds && habitIds.length > 0) {
    habitQuery.where('_id').in(habitIds)
  }
  const habits = await habitQuery.lean()
  return buildSummariesFromDocs(userId, habits)
}

async function buildActiveChallenges(userId: string): Promise<ChallengeSummary[]> {
  const challenges = await listUserChallenges(userId, 'active')

  return challenges.map((c: any) => {
    const now = new Date()
    const end = c.endDate ? new Date(c.endDate) : new Date()
    // Si ya pasó la fecha, 0 días. Si no, calculamos.
    let diffDays = 0
    if (c.endDate && end > now) {
      const diffTime = end.getTime() - now.getTime()
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    let opponentName: string | undefined
    let opponentAvatar: string | undefined

    if (c.type === 'friend') {
      const ownerId = c.owner?._id ? String(c.owner._id) : String(c.owner)
      const isOwner = ownerId === userId
      const otherUser = isOwner ? c.opponent : c.owner

      if (otherUser) {
        opponentName = otherUser.username
        opponentAvatar = otherUser.profile?.avatar
      }
    }

    return {
      id: String(c._id),
      title: c.title,
      daysLeft: diffDays,
      participants: c.opponent ? 2 : 1,
      opponentName,
      opponentAvatar
    }
  })
}

export async function buildDashboardSummary(userId: string): Promise<{ habits: HabitSummary[], challenges: ChallengeSummary[] }> {
  const habits = await buildHabitSummaries(userId)
  const challenges = await buildActiveChallenges(userId)
  return { habits, challenges }
}
