import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createChallenge,
  requestFinishChallenge,
  declineFinishChallenge,
  deleteChallenge,
  respondToChallenge,
  getChallengeSummary
} from '../../src/services/challenges'

const challengeFindMock = vi.hoisted(() => vi.fn())
const challengeCreateMock = vi.hoisted(() => vi.fn())
const challengeFindByIdMock = vi.hoisted(() => vi.fn())
const challengeDeleteOneMock = vi.hoisted(() => vi.fn())

const habitFindMock = vi.hoisted(() => vi.fn())
const habitCreateMock = vi.hoisted(() => vi.fn())

const habitChallengeCreateMock = vi.hoisted(() => vi.fn())
const habitChallengeDeleteManyMock = vi.hoisted(() => vi.fn())
const habitChallengeFindMock = vi.hoisted(() => vi.fn())

const logFindMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/models/challenge.js', () => ({
  default: {
    find: challengeFindMock,
    create: challengeCreateMock,
    findById: challengeFindByIdMock,
    deleteOne: challengeDeleteOneMock
  }
}))

vi.mock('../../src/models/habit.js', () => ({
  default: {
    find: habitFindMock,
    create: habitCreateMock
  }
}))

vi.mock('../../src/models/habitChallenge.js', () => ({
  default: {
    create: habitChallengeCreateMock,
    deleteMany: habitChallengeDeleteManyMock,
    find: habitChallengeFindMock
  }
}))

// Avoid hitting User or Log operations in helper functions
vi.mock('../../src/models/user.js', () => ({
  default: {
    findByIdAndUpdate: vi.fn()
  }
}))
vi.mock('../../src/models/log.js', () => ({
  default: {
    find: logFindMock
  }
}))

function withLean<T>(value: T) {
  return {
    lean: vi.fn().mockResolvedValue(value)
  }
}

describe('challenges service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid challenge types', async () => {
    await expect(createChallenge('507f1f77bcf86cd799439011', { type: 'unknown', disciplines: [] } as any)).rejects.toThrow(/Tipo de reto/)
  })

  it('validates date ranges before creating challenge', async () => {
    const start = new Date('2024-01-02')
    const end = new Date('2024-01-01')

    await expect(createChallenge('507f1f77bcf86cd799439011', {
      type: 'personal',
      disciplines: [{ ownerHabitId: 'h1', dailyGoal: 1 }],
      startDate: start,
      endDate: end
    })).rejects.toThrow(/fecha de fin/)
  })

  it('creates personal challenges using existing habits', async () => {
    habitFindMock.mockReturnValue(withLean([{
      _id: 'h1',
      user: 'user-1',
      type: 'time',
      unit: 'h',
      name: 'Run',
      emoji: '',
      color: 'zinc',
      category: 'fitness'
    }]))

    habitChallengeCreateMock.mockResolvedValue({ _id: 'hc1' })
    challengeCreateMock.mockResolvedValue({ _id: 'c1' })

    const challenge = await createChallenge('507f1f77bcf86cd799439011', {
      type: 'personal',
      disciplines: [{ ownerHabitId: 'h1', dailyGoal: 2 }],
      title: 'Mi reto'
    })

    expect(challenge._id).toBe('c1')
    expect(habitChallengeCreateMock).toHaveBeenCalled()
    expect(challengeCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      owner: expect.anything(),
      type: 'personal',
      status: 'active'
    }))
  })

  it('flags finish requests and completes when both users agree', async () => {
    const saveSpy = vi.fn().mockResolvedValue(undefined)
    const pendingDoc: any = {
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      status: 'active',
      ownerWantsToFinish: false,
      opponentWantsToFinish: false,
      endDate: null,
      save: saveSpy
    }
    challengeFindByIdMock
      .mockResolvedValueOnce(pendingDoc)
      .mockResolvedValueOnce({
        owner: '507f1f77bcf86cd799439011',
        opponent: '507f1f77bcf86cd799439012',
        status: 'pending_finish',
        ownerWantsToFinish: true,
        opponentWantsToFinish: false,
        endDate: null,
        save: saveSpy
      })

    const first = await requestFinishChallenge('c1', '507f1f77bcf86cd799439011')
    expect(first.status).toBe('pending_finish')
    expect(first.ownerWantsToFinish).toBe(true)

    const second = await requestFinishChallenge('c1', '507f1f77bcf86cd799439012')
    expect(second.status).toBe('finished')
    expect(second.endDate).toBeInstanceOf(Date)
  })

  it('rejects finish requests when unauthorized or status invalid', async () => {
    challengeFindByIdMock
      .mockResolvedValueOnce({ owner: 'owner-1', opponent: 'op-1', status: 'pending', ownerWantsToFinish: false, opponentWantsToFinish: false })
      .mockResolvedValueOnce({ owner: 'owner-1', opponent: 'op-1', status: 'draft', ownerWantsToFinish: false, opponentWantsToFinish: false })

    await expect(requestFinishChallenge('c1', 'stranger')).rejects.toThrow(/No estás autorizado/)
    await expect(requestFinishChallenge('c1', 'owner-1')).rejects.toThrow(/Solo se pueden cerrar retos activos/)
  })

  it('fails finishing when challenge is missing', async () => {
    challengeFindByIdMock.mockResolvedValue(null)

    await expect(requestFinishChallenge('missing', '507f1f77bcf86cd799439011')).rejects.toThrow(/Challenge not found/)
  })

  it('declines finish request and reverts state when allowed', async () => {
    const doc: any = {
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      status: 'pending_finish',
      ownerWantsToFinish: true,
      opponentWantsToFinish: true,
      save: vi.fn().mockResolvedValue(undefined)
    }
    challengeFindByIdMock.mockResolvedValue(doc)

    const result = await declineFinishChallenge('c9', '507f1f77bcf86cd799439011')

    expect(result.status).toBe('active')
    expect(result.ownerWantsToFinish).toBe(false)
    expect(result.opponentWantsToFinish).toBe(false)
  })

  it('validates decline finish authorization and pending state', async () => {
    challengeFindByIdMock
      .mockResolvedValueOnce({ owner: 'owner-1', opponent: 'op-1', status: 'active' })
      .mockResolvedValueOnce({ owner: 'owner-1', opponent: 'op-1', status: 'pending_finish', ownerWantsToFinish: false, opponentWantsToFinish: false })

    await expect(declineFinishChallenge('c2', 'stranger')).rejects.toThrow(/No estás autorizado/)
    await expect(declineFinishChallenge('c2', 'owner-1')).rejects.toThrow(/No hay una solicitud/)
  })

  it('fails declining when challenge missing or not pending finish', async () => {
    challengeFindByIdMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ owner: 'owner-1', opponent: 'op-1', status: 'active' })

    await expect(declineFinishChallenge('missing', 'owner-1')).rejects.toThrow(/Challenge not found/)
    await expect(declineFinishChallenge('c-active', 'owner-1')).rejects.toThrow(/No hay una solicitud/)
  })

  it('prevents deleting challenges when user is not participant', async () => {
    challengeFindByIdMock.mockResolvedValue({
      _id: 'c8',
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      disciplines: [],
      status: 'active'
    })

    await expect(deleteChallenge('c8', 'stranger')).rejects.toThrow(/No estás autorizado/)
    expect(habitChallengeDeleteManyMock).not.toHaveBeenCalled()
  })

  it('fails deleting when challenge is missing', async () => {
    challengeFindByIdMock.mockResolvedValue(null)

    await expect(deleteChallenge('c-missing', '507f1f77bcf86cd799439011')).rejects.toThrow(/Challenge not found/)
  })

  it('rejects responding to non-friend or invalid challenges', async () => {
    challengeFindByIdMock
      .mockResolvedValueOnce({ _id: 'c1', type: 'personal' })
      .mockResolvedValueOnce({ _id: 'c2', type: 'friend', opponent: null })
      .mockResolvedValueOnce({ _id: 'c3', type: 'friend', opponent: '507f1f77bcf86cd799439012', status: 'active' })
      .mockResolvedValueOnce({ _id: 'c4', type: 'friend', opponent: '507f1f77bcf86cd799439012', status: 'pending', awaitingUser: 'other' })

    await expect(respondToChallenge('c1', 'u', { action: 'accept' })).rejects.toThrow(/Solo los retos con amigos/)
    await expect(respondToChallenge('c2', 'u', { action: 'accept' })).rejects.toThrow(/falta opponent/)
    await expect(respondToChallenge('c3', 'u', { action: 'accept' })).rejects.toThrow(/pendientes/)
    await expect(respondToChallenge('c4', 'u', { action: 'accept' })).rejects.toThrow(/No estás autorizado/)
  })

  it('rejects challenge when user chooses reject action', async () => {
    const saveSpy = vi.fn().mockResolvedValue(undefined)
    const challengeDoc: any = {
      _id: 'c-reject',
      type: 'friend',
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      status: 'pending',
      awaitingUser: '507f1f77bcf86cd799439012',
      disciplines: [],
      save: saveSpy
    }

    challengeFindByIdMock.mockResolvedValue(challengeDoc)

    const result = await respondToChallenge('c-reject', '507f1f77bcf86cd799439012', { action: 'reject' })

    expect(result.status).toBe('rejected')
    expect(result.awaitingUser).toBeNull()
    expect(saveSpy).toHaveBeenCalled()
  })

  it('validates modify action date ranges', async () => {
    const challengeDoc: any = {
      _id: 'c-modify-invalid',
      type: 'friend',
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      status: 'pending',
      awaitingUser: '507f1f77bcf86cd799439011',
      startDate: new Date('2024-01-02T00:00:00Z'),
      endDate: null
    }

    challengeFindByIdMock.mockResolvedValue(challengeDoc)

    await expect(respondToChallenge('c-modify-invalid', '507f1f77bcf86cd799439011', {
      action: 'modify',
      disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2', dailyGoal: 1 }],
      startDate: new Date('2024-02-01T00:00:00Z'),
      endDate: new Date('2024-01-01T00:00:00Z')
    })).rejects.toThrow(/endDate/)
  })

  it('modifies challenge disciplines and resets awaiting user', async () => {
    const ownerId = '507f1f77bcf86cd799439011'
    const opponentId = '507f1f77bcf86cd799439012'
    const saveSpy = vi.fn().mockResolvedValue(undefined)

    const challengeDoc: any = {
      _id: 'c-modify',
      type: 'friend',
      owner: ownerId,
      opponent: opponentId,
      status: 'pending',
      awaitingUser: opponentId,
      disciplines: ['old-hc'],
      startDate: new Date('2024-01-01T00:00:00Z'),
      endDate: new Date('2024-01-05T00:00:00Z'),
      save: saveSpy
    }

    challengeFindByIdMock.mockResolvedValue(challengeDoc)

    habitFindMock
      .mockReturnValueOnce(withLean([{ _id: 'owner-h', user: ownerId, type: 'time', unit: 'h', name: 'Run', emoji: '', color: 'zinc' }]))
      .mockReturnValueOnce(withLean([{ _id: 'op-h', user: opponentId, type: 'time', unit: 'h', name: 'Walk', emoji: '', color: 'zinc' }]))

    habitChallengeCreateMock.mockResolvedValue({ _id: 'new-hc' })
    habitChallengeDeleteManyMock.mockResolvedValue(undefined)

    const result = await respondToChallenge('c-modify', opponentId, {
      action: 'modify',
      disciplines: [{ ownerHabitId: 'owner-h', challengerHabitId: 'op-h', dailyGoal: 2 }],
      startDate: new Date('2024-02-01T00:00:00Z'),
      endDate: new Date('2024-02-10T00:00:00Z')
    })

    expect(habitChallengeDeleteManyMock).toHaveBeenCalledWith({ _id: { $in: ['old-hc'] } })
    expect(result.disciplines).toEqual(['new-hc'])
    expect(result.status).toBe('pending')
    expect(String(result.awaitingUser)).toContain(ownerId)
    expect(saveSpy).toHaveBeenCalled()
  })

  it('accepts challenge creating pending challenger habit', async () => {
    const saveSpy = vi.fn().mockResolvedValue(undefined)
    habitChallengeFindMock.mockResolvedValue([{ _id: 'hc1', challengerHabit: null, pendingChallengerHabit: { name: 'New', type: 'time', unit: 'h' }, save: saveSpy }])
    habitCreateMock.mockResolvedValue({ _id: 'h-new', toObject: () => ({ _id: 'h-new' }) })

    const challengeDoc: any = {
      _id: 'c5',
      type: 'friend',
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      status: 'pending',
      disciplines: ['hc1'],
      awaitingUser: '507f1f77bcf86cd799439012',
      save: vi.fn().mockResolvedValue(undefined)
    }

    challengeFindByIdMock.mockResolvedValue(challengeDoc)

    const result = await respondToChallenge('c5', '507f1f77bcf86cd799439012', { action: 'accept' })

    expect(result.status).toBe('active')
    expect(habitCreateMock).toHaveBeenCalled()
    expect(saveSpy).toHaveBeenCalled()
  })

  it('rejects modify action without disciplines', async () => {
    challengeFindByIdMock.mockResolvedValue({
      _id: 'c6',
      type: 'friend',
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      status: 'pending',
      awaitingUser: '507f1f77bcf86cd799439012'
    })

    await expect(respondToChallenge('c6', '507f1f77bcf86cd799439012', { action: 'modify', disciplines: [] }))
      .rejects.toThrow(/proporcionar disciplinas/)
  })

  it('builds personal challenge summary and marks owner winner', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-05T00:00:00Z'))

    const challengeDoc: any = {
      _id: 'c-personal',
      title: 'Solo',
      type: 'personal',
      status: 'active',
      owner: { _id: 'owner', username: 'Owner', profile: { avatar: '/o.png' } },
      opponent: null,
      startDate: new Date('2024-03-01T00:00:00Z'),
      endDate: new Date('2024-03-02T00:00:00Z'),
      disciplines: [{
        _id: 'd-personal',
        type: 'personal',
        ownerHabit: { _id: 'ho', name: 'Read', type: 'time', unit: 'h', emoji: '', color: 'sky' },
        challengerHabit: null,
        pendingChallengerHabit: null,
        dailyGoal: 1
      }],
      awaitingUser: null,
      initiator: 'owner',
      ownerWantsToFinish: false,
      opponentWantsToFinish: false
    }

    const populated = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(challengeDoc)
    }
    challengeFindByIdMock.mockReturnValue(populated as any)

    logFindMock.mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([
      { habit: 'ho', user: 'owner', date: new Date('2024-03-02T00:00:00Z'), value: 2 }
    ]) })

    const summary = await getChallengeSummary('c-personal', 'owner')

    expect(summary.disciplines[0].winner).toBe('owner')
    expect(summary.ownerWins).toBeGreaterThan(0)
    expect(summary.overallWinner).toBe('owner')

    vi.useRealTimers()
  })

  it('computes friend winner on tied ratios and yields overall draw', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-03-05T00:00:00Z'))

    const challengeDoc: any = {
      _id: 'c-friend-draw',
      title: 'Empates',
      type: 'friend',
      status: 'active',
      owner: { _id: 'owner', username: 'Owner', profile: { avatar: '/o.png' } },
      opponent: { _id: 'op', username: 'Opp', profile: { avatar: '/p.png' } },
      startDate: new Date('2024-03-01T00:00:00Z'),
      endDate: new Date('2024-03-03T00:00:00Z'),
      disciplines: [
        {
          _id: 'd-equal',
          type: 'friend',
          ownerHabit: { _id: 'ho', name: 'Push', type: 'time', unit: 'h', emoji: '', color: 'zinc' },
          challengerHabit: { _id: 'hc', name: 'Push too', type: 'time', unit: 'h', emoji: '', color: 'zinc' },
          pendingChallengerHabit: null,
          dailyGoal: 0
        },
        {
          _id: 'd-draw',
          type: 'friend',
          ownerHabit: { _id: 'ho2', name: 'Pull', type: 'time', unit: 'h', emoji: '', color: 'emerald' },
          challengerHabit: { _id: 'hc2', name: 'Pull too', type: 'time', unit: 'h', emoji: '', color: 'emerald' },
          pendingChallengerHabit: null,
          dailyGoal: 1
        }
      ],
      awaitingUser: null,
      initiator: 'owner',
      ownerWantsToFinish: false,
      opponentWantsToFinish: false
    }

    const populated = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(challengeDoc)
    }
    challengeFindByIdMock.mockReturnValue(populated as any)

    logFindMock
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ habit: 'ho', user: 'owner', date: new Date('2024-03-02T00:00:00Z'), value: 5 }]) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ habit: 'hc', user: 'op', date: new Date('2024-03-02T00:00:00Z'), value: 2 }]) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ habit: 'ho2', user: 'owner', date: new Date('2024-03-01T00:00:00Z'), value: 1 }]) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([{ habit: 'hc2', user: 'op', date: new Date('2024-03-02T00:00:00Z'), value: 1 }]) })

    const summary = await getChallengeSummary('c-friend-draw', 'owner')

    expect(summary.disciplines[0].winner).toBe('owner')
    expect(summary.disciplines[1].winner).toBe('draw')
    expect(summary.overallWinner).toBe('draw')

    vi.useRealTimers()
  })

  it('prevents viewing challenge summaries when not participant', async () => {
    challengeFindByIdMock.mockReturnValueOnce({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null)
    })

    await expect(getChallengeSummary('c7', 'user')).rejects.toThrow(/Challenge not found/)

    challengeFindByIdMock.mockReturnValueOnce({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: 'c8',
        type: 'friend',
        owner: { _id: 'owner' },
        opponent: { _id: 'op' },
        disciplines: [],
        startDate: new Date(),
        endDate: null,
        status: 'active',
        awaitingUser: null,
        initiator: 'owner',
        ownerWantsToFinish: false,
        opponentWantsToFinish: false
      })
    })

    await expect(getChallengeSummary('c8', 'stranger')).rejects.toThrow(/Not allowed/)
  })

  it('builds challenge summary with friend discipline scores and draws', async () => {
    vi.setSystemTime(new Date('2024-02-05T00:00:00Z'))

    const challengeDoc: any = {
      _id: 'c9',
      title: 'Duelos',
      type: 'friend',
      status: 'active',
      owner: { _id: 'owner', username: 'Owner', profile: { avatar: '/o.png' } },
      opponent: { _id: 'op', username: 'Opp', profile: { avatar: '/p.png' } },
      startDate: new Date('2024-02-01T00:00:00Z'),
      endDate: null,
      disciplines: [{
        _id: 'd1',
        type: 'friend',
        ownerHabit: { _id: 'ho', name: 'Run', type: 'time', unit: 'h', emoji: '', color: 'sky' },
        challengerHabit: { _id: 'hc', name: 'Run too', type: 'time', unit: 'h', emoji: '', color: 'sky' },
        pendingChallengerHabit: null,
        dailyGoal: 2
      }],
      awaitingUser: null,
      initiator: 'owner',
      ownerWantsToFinish: false,
      opponentWantsToFinish: false
    }

    const populated = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(challengeDoc)
    }
    challengeFindByIdMock.mockReturnValue(populated as any)

    logFindMock
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([
        { habit: 'ho', user: 'owner', date: new Date('2024-02-04T00:00:00Z'), value: 2 },
        { habit: 'ho', user: 'owner', date: new Date('2024-02-03T00:00:00Z'), value: 2 }
      ]) })
      .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([
        { habit: 'hc', user: 'op', date: new Date('2024-02-04T00:00:00Z'), value: 2 }
      ]) })

    const summary = await getChallengeSummary('c9', 'owner')

    expect(summary.disciplines[0].winner).toBe('owner')
    expect(summary.ownerWins).toBeGreaterThan(0)
    expect(summary.opponent?.username).toBe('Opp')
  })

  it('deletes challenge and cascades habit comparisons', async () => {
    challengeFindByIdMock.mockResolvedValueOnce({
      _id: 'c10',
      owner: '507f1f77bcf86cd799439011',
      opponent: '507f1f77bcf86cd799439012',
      disciplines: ['hc1'],
      status: 'active'
    })

    await deleteChallenge('c10', '507f1f77bcf86cd799439012')

    expect(habitChallengeDeleteManyMock).toHaveBeenCalledWith({ _id: { $in: ['hc1'] } })
    expect(challengeDeleteOneMock).toHaveBeenCalled()
  })
})
