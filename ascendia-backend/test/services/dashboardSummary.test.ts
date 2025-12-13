import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildDashboardSummary } from '../../src/services/dashboardSummary'

const habitFindMock = vi.hoisted(() => vi.fn())
const logFindMock = vi.hoisted(() => vi.fn())
const listUserChallengesMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/models/habit.js', () => ({
  default: { find: habitFindMock }
}))

vi.mock('../../src/models/log.js', () => ({
  default: { find: logFindMock }
}))

vi.mock('../../src/services/challenges.js', () => ({
  listUserChallenges: listUserChallengesMock
}))

function withLean<T>(value: T) {
  return {
    lean: vi.fn().mockResolvedValue(value)
  }
}

describe('buildDashboardSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    habitFindMock.mockReset()
    logFindMock.mockReset()
    listUserChallengesMock.mockReset()
    listUserChallengesMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns an empty list when the user has no habits', async () => {
    habitFindMock.mockReturnValue(withLean([]))
    logFindMock.mockReturnValue(withLean([]))

    const summary = await buildDashboardSummary('user-1')

    expect(summary.habits).toEqual([])
    expect(habitFindMock).toHaveBeenCalledWith({ user: 'user-1' })
    expect(logFindMock).not.toHaveBeenCalled()
  })

  it('aggregates logs, normalizes metadata and builds streaks', async () => {
    vi.setSystemTime(new Date('2024-11-15T10:00:00Z'))

    const habits = [
      {
        _id: 'habit-a',
        name: 'Leer 30m',
        emoji: '',
        color: 'emerald',
        category: 'study',
        type: 'time',
        unit: 'min'
      },
      {
        _id: 'habit-b',
        name: 'Run 5k',
        emoji: undefined,
        color: 'magenta',
        category: undefined,
        type: 'unknown',
        unit: ' ',
        user: 'user-1'
      }
    ]

    const logs = [
      { habit: 'habit-a', user: 'user-1', date: new Date('2024-11-15T08:00:00Z'), value: 30 },
      { habit: 'habit-a', user: 'user-1', date: new Date('2024-11-14T08:00:00Z'), value: 30 },
      { habit: 'habit-a', user: 'user-1', date: new Date('2024-11-13T08:00:00Z'), value: 30 },
      { habit: 'habit-a', user: 'user-1', date: new Date('2024-10-31T08:00:00Z'), value: 15 },
      { habit: 'habit-b', user: 'user-1', date: new Date('2024-11-10T09:00:00Z'), value: 5 },
      { habit: 'habit-b', user: 'user-1', date: new Date('2024-11-11T09:00:00Z'), value: 0 }
    ]

    habitFindMock.mockReturnValue(withLean(habits))
    logFindMock.mockReturnValue(withLean(logs))

    const summary = await buildDashboardSummary('user-1')

    expect(summary.habits).toHaveLength(2)

    const reading = summary.habits.find((h) => h.id === 'habit-a')!
    expect(reading.totalThisMonth).toBe(90)
    expect(reading.hoursThisMonth).toBe(90)
    expect(reading.completedToday).toBe(true)
    expect(reading.streak).toBe(3)
    expect(reading.history).toHaveLength(7)
    expect(reading.history.filter((day) => day.completed)).toHaveLength(3)

    const running = summary.habits.find((h) => h.id === 'habit-b')!
    expect(running.type).toBe('number')
    expect(running.unit).toBe('u')
    expect(running.category).toBe('fitness')
    expect(running.color).toBe('zinc')
    expect(running.completedToday).toBe(false)
    expect(running.totalThisMonth).toBe(5)
    expect(running.history.some((d) => d.date === '2024-11-10' && d.completed)).toBe(true)
  })
})