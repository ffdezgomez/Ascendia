import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createChallengeHandler,
  respondChallengeHandler,
  requestFinishHandler,
  declineFinishHandler,
  deleteChallengeHandler,
  getChallenges,
  getChallenge
} from '../../src/controllers/challengeController'

const challengesServiceMock = vi.hoisted(() => ({
  createChallenge: vi.fn(),
  deleteChallenge: vi.fn(),
  getChallengeSummary: vi.fn(),
  listUserChallenges: vi.fn(),
  declineFinishChallenge: vi.fn(),
  requestFinishChallenge: vi.fn(),
  respondToChallenge: vi.fn()
}))

const notificationsMock = vi.hoisted(() => ({
  createNotification: vi.fn()
}))

const userModelMock = vi.hoisted(() => ({
  findById: vi.fn()
}))

vi.mock('../../src/services/challenges', () => challengesServiceMock)
vi.mock('../../src/services/notifications', () => notificationsMock)
vi.mock('../../src/models/user.js', () => ({ default: userModelMock }))

function mockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  res.send = vi.fn().mockReturnValue(res)
  return res
}

function mockFriends(friends: string[]) {
  const select = vi.fn().mockReturnThis()
  const lean = vi.fn().mockResolvedValue({ friends })
  userModelMock.findById.mockReturnValue({ select, lean } as any)
}

describe('challengeController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createChallengeHandler validations', () => {
    it('rejects invalid startDate', async () => {
      const req: any = {
        currentUserId: 'u1',
        body: { startDate: 'bad-date', disciplines: [{}] }
      }
      const res = mockRes()
      const next = vi.fn()

      await createChallengeHandler(req, res as any, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'startDate no es válida' })
      expect(challengesServiceMock.createChallenge).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    it('requires at least one discipline', async () => {
      const req: any = {
        currentUserId: 'u1',
        body: { type: 'friend', opponentId: 'u2', disciplines: [] }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Debes añadir al menos una disciplina al reto' })
    })

    it('requires opponent for friend challenges', async () => {
      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2' }]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Debes indicar el amigo a retar' })
    })

    it('blocks challenges against non-friends', async () => {
      mockFriends([])

      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          opponentId: 'u2',
          disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2' }]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith({ error: 'Solo puedes retar a tus amigos' })
    })

    it('rejects self-challenges', async () => {
      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          opponentId: 'u1',
          disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2' }]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'No puedes retarte a ti mismo' })
    })

    it('requires a challenger habit or draft', async () => {
      mockFriends(['u2'])

      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          opponentId: 'u2',
          disciplines: [{ ownerHabitId: 'h1' }]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Cada disciplina debe incluir un hábito del amigo, existente o nuevo' })
    })

    it('rejects incomplete challenger drafts', async () => {
      mockFriends(['u2'])

      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          opponentId: 'u2',
          disciplines: [
            { ownerHabitId: 'h1', challengerHabitId: 'h2', challengerNewHabit: { name: 'Run' } }
          ]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Completa todos los campos del nuevo hábito del amigo' })
    })

    it('rejects providing both existing and new owner habit', async () => {
      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          opponentId: 'u2',
          disciplines: [
            {
              ownerHabitId: 'h1',
              ownerNewHabit: { name: 'Gym', type: 'reps', unit: 'rep' },
              challengerHabitId: 'h2'
            }
          ]
        }
      }
      mockFriends(['u2'])
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Selecciona un hábito existente o crea uno nuevo, pero no ambos' })
    })

    it('rejects invalid dailyGoal values', async () => {
      mockFriends(['u2'])

      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'friend',
          opponentId: 'u2',
          disciplines: [
            { ownerHabitId: 'h1', challengerHabitId: 'h2', dailyGoal: 0 }
          ]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Cada disciplina necesita un objetivo diario válido' })
    })

    it('validates dates and goals when modifying', async () => {
      const res = mockRes()

      const reqInvalidStart: any = {
        params: { challengeId: 'c1' },
        currentUserId: 'u1',
        body: { action: 'modify', startDate: 'bad', disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2' }] }
      }
      await respondChallengeHandler(reqInvalidStart, res as any, vi.fn())
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'startDate no es válida' })

      const res2 = mockRes()
      const reqInvalidGoal: any = {
        params: { challengeId: 'c1' },
        currentUserId: 'u1',
        body: {
          action: 'modify',
          disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2', dailyGoal: 0 }]
        }
      }
      await respondChallengeHandler(reqInvalidGoal, res2 as any, vi.fn())
      expect(res2.status).toHaveBeenCalledWith(400)
      expect(res2.json).toHaveBeenCalledWith({ error: 'Cada disciplina necesita un objetivo diario válido' })
    })

    it('creates a personal challenge with owner draft and skips notifications', async () => {
      challengesServiceMock.createChallenge.mockResolvedValue({ _id: 'c-per' })
      challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c-per', title: 'Solo' })

      const req: any = {
        currentUserId: 'u1',
        body: {
          type: 'personal',
          startDate: null,
          endDate: undefined,
          disciplines: [
            {
              ownerNewHabit: { name: 'Leer', type: 'time', unit: 'min' },
              challengerHabitId: undefined
            }
          ]
        }
      }
      const res = mockRes()

      await createChallengeHandler(req, res as any, vi.fn())

      expect(challengesServiceMock.createChallenge).toHaveBeenCalledWith('u1', expect.objectContaining({ type: 'personal' }))
      expect(notificationsMock.createNotification).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('accepts modify with valid dates and disciplines', async () => {
      challengesServiceMock.respondToChallenge.mockResolvedValue({ _id: 'c1' })
      challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c1', title: 'Mod' })

      const req: any = {
        params: { challengeId: 'c1' },
        currentUserId: 'u1',
        body: {
          action: 'modify',
          startDate: '2025-02-01',
          endDate: '2025-02-10',
          disciplines: [{ ownerHabitId: 'h1', challengerHabitId: 'h2', dailyGoal: 3 }]
        }
      }
      const res = mockRes()

      await respondChallengeHandler(req, res as any, vi.fn())

      expect(challengesServiceMock.respondToChallenge).toHaveBeenCalledWith(
        'c1',
        'u1',
        expect.objectContaining({
          action: 'modify',
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          disciplines: [expect.objectContaining({ ownerHabitId: 'h1', challengerHabitId: 'h2', dailyGoal: 3 })]
        })
      )
      expect(res.json).toHaveBeenCalledWith({ viewerId: 'u1', challenge: { id: 'c1', title: 'Mod' } })
    })
  })

  it('returns summary even when finish request does not change status', async () => {
    challengesServiceMock.requestFinishChallenge.mockResolvedValue({ _id: 'c3', owner: 'u1', opponent: 'u2', status: 'active' })
    challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c3', title: 'Activo' })

    const req: any = { params: { challengeId: 'c3' }, currentUserId: 'u1', session: { user: { username: 'A' } } }
    const res = mockRes()

    await requestFinishHandler(req, res as any, vi.fn())

    expect(notificationsMock.createNotification).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ viewerId: 'u1', challenge: { id: 'c3', title: 'Activo' } })
  })

  it('creates a friend challenge, builds summary and notifies opponent', async () => {
    mockFriends(['u2'])

    challengesServiceMock.createChallenge.mockResolvedValue({ _id: 'c1' })
    challengesServiceMock.getChallengeSummary.mockResolvedValue({
      id: 'c1',
      title: 'Reto semanal',
      owner: { username: 'Alice' },
      ownerWins: 1,
      opponentWins: 0,
      draws: 0
    })

    const req: any = {
      currentUserId: 'u1',
      session: { user: { username: 'Alice' } },
      body: {
        type: 'friend',
        opponentId: 'u2',
        title: 'Reto semanal',
        disciplines: [
          { ownerHabitId: 'h1', challengerHabitId: 'h2', dailyGoal: 2 }
        ],
        startDate: '2025-01-01',
        endDate: '2025-01-05'
      }
    }
    const res = mockRes()

    await createChallengeHandler(req, res as any, vi.fn())

    expect(challengesServiceMock.createChallenge).toHaveBeenCalledWith('u1', expect.any(Object))
    expect(challengesServiceMock.getChallengeSummary).toHaveBeenCalledWith('c1', 'u1')
    expect(notificationsMock.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u2',
      type: 'challenge_invite',
      metadata: { challengeId: 'c1' }
    }))
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ viewerId: 'u1', challenge: expect.any(Object) })
  })

  it('lists challenges filtering by status and returns summaries', async () => {
    challengesServiceMock.listUserChallenges.mockResolvedValue([{ _id: 'c1' }])
    challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c1' })

    const req: any = { currentUserId: 'u1', query: { status: 'active' } }
    const res = mockRes()

    await getChallenges(req as any, res as any, vi.fn())

    expect(challengesServiceMock.listUserChallenges).toHaveBeenCalledWith('u1', 'active')
    expect(res.json).toHaveBeenCalledWith({ viewerId: 'u1', challenges: [{ id: 'c1' }] })
  })

  it('retrieves a single challenge summary', async () => {
    challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c9' })
    const req: any = { params: { challengeId: 'c9' }, currentUserId: 'u5' }
    const res = mockRes()

    await getChallenge(req as any, res as any, vi.fn())

    expect(challengesServiceMock.getChallengeSummary).toHaveBeenCalledWith('c9', 'u5')
    expect(res.json).toHaveBeenCalledWith({ viewerId: 'u5', challenge: { id: 'c9' } })
  })

  describe('respondChallengeHandler', () => {
    it('rejects invalid actions', async () => {
      const req: any = { params: { challengeId: 'c1' }, currentUserId: 'u1', body: { action: 'noop' } }
      const res = mockRes()

      await respondChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Acción inválida' })
    })

    it('requires both habits when modifying disciplines', async () => {
      const req: any = {
        params: { challengeId: 'c1' },
        currentUserId: 'u1',
        body: { action: 'modify', disciplines: [{ ownerHabitId: 'h1' }] }
      }
      const res = mockRes()

      await respondChallengeHandler(req, res as any, vi.fn())

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Cada disciplina debe incluir ambos hábitos' })
    })

    it('processes a response and returns updated summary', async () => {
      challengesServiceMock.respondToChallenge.mockResolvedValue({ _id: 'c1' })
      challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c1', title: 'Ok' })

      const req: any = {
        params: { challengeId: 'c1' },
        currentUserId: 'u1',
        body: { action: 'accept' }
      }
      const res = mockRes()

      await respondChallengeHandler(req, res as any, vi.fn())

      expect(challengesServiceMock.respondToChallenge).toHaveBeenCalledWith('c1', 'u1', { action: 'accept' })
      expect(res.json).toHaveBeenCalledWith({ viewerId: 'u1', challenge: { id: 'c1', title: 'Ok' } })
    })
  })

  describe('finish handlers', () => {
    it('notifies opponent when marking pending finish', async () => {
      challengesServiceMock.requestFinishChallenge.mockResolvedValue({
        _id: 'c1',
        owner: 'u1',
        opponent: 'u2',
        status: 'pending_finish'
      })
      challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c1', title: 'Final', ownerWins: 1, opponentWins: 0 })

      const req: any = { params: { challengeId: 'c1' }, currentUserId: 'u1', session: { user: { username: 'Alice' } } }
      const res = mockRes()

      await requestFinishHandler(req, res as any, vi.fn())

      expect(notificationsMock.createNotification).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'u2',
        type: 'challenge_finish_request'
      }))
      expect(res.json).toHaveBeenCalledWith({ viewerId: 'u1', challenge: expect.any(Object) })
    })

    it('notifies both sides when finished', async () => {
      challengesServiceMock.requestFinishChallenge.mockResolvedValue({
        _id: 'c2',
        owner: 'u1',
        opponent: 'u2',
        status: 'finished'
      })
      challengesServiceMock.getChallengeSummary.mockResolvedValue({
        id: 'c2',
        title: 'Liga',
        ownerWins: 2,
        opponentWins: 1,
        draws: 1,
        overallWinner: 'u1'
      })

      const req: any = { params: { challengeId: 'c2' }, currentUserId: 'u2', session: { user: { username: 'Bob' } } }
      const res = mockRes()

      await requestFinishHandler(req, res as any, vi.fn())

      expect(notificationsMock.createNotification).toHaveBeenCalledTimes(2)
      expect(res.json).toHaveBeenCalledWith({ viewerId: 'u2', challenge: expect.any(Object) })
    })

    it('declines finish requests and returns summary', async () => {
      challengesServiceMock.declineFinishChallenge.mockResolvedValue({ _id: 'c3' })
      challengesServiceMock.getChallengeSummary.mockResolvedValue({ id: 'c3' })

      const req: any = { params: { challengeId: 'c3' }, currentUserId: 'u5' }
      const res = mockRes()

      await declineFinishHandler(req, res as any, vi.fn())

      expect(challengesServiceMock.declineFinishChallenge).toHaveBeenCalledWith('c3', 'u5')
      expect(res.json).toHaveBeenCalledWith({ viewerId: 'u5', challenge: { id: 'c3' } })
    })
  })

  it('deletes a challenge and returns 204', async () => {
    const req: any = { params: { challengeId: 'c9' }, currentUserId: 'u9' }
    const res = mockRes()

    await deleteChallengeHandler(req, res as any, vi.fn())

    expect(challengesServiceMock.deleteChallenge).toHaveBeenCalledWith('c9', 'u9')
    expect(res.status).toHaveBeenCalledWith(204)
    expect(res.send).toHaveBeenCalled()
  })
})
