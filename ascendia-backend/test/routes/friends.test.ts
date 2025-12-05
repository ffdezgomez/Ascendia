import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import friendsRouter from '../../src/routes/friends'

function mockQuery<T>(value: T) {
  return {
    select: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value)
  }
}

const userModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findOne: vi.fn(),
  findByIdAndUpdate: vi.fn()
}))

const friendRequestModelMock = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn(),
  deleteMany: vi.fn()
}))

const profileModelMock = vi.hoisted(() => ({
  find: vi.fn()
}))

const habitModelMock = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn()
}))

const habitComparisonModelMock = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn()
}))

const buildSummaryMock = vi.hoisted(() => vi.fn())
const buildHabitSummariesMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/models/user.js', () => ({
  default: userModelMock
}))

vi.mock('../../src/models/friendRequest.js', () => ({
  default: friendRequestModelMock
}))

vi.mock('../../src/models/profile.js', () => ({
  default: profileModelMock
}))

vi.mock('../../src/models/habit.js', () => ({
  default: habitModelMock
}))

vi.mock('../../src/models/habitComparison.js', () => ({
  default: habitComparisonModelMock
}))

vi.mock('../../src/services/dashboardSummary.js', () => ({
  buildDashboardSummary: buildSummaryMock,
  buildHabitSummaries: buildHabitSummariesMock
}))

function buildApp(session?: any) {
  const app = express()
  app.use(express.json())
  if (session !== undefined) {
    app.use((req: any, _res, next) => {
      req.session = session
      next()
    })
  }
  app.use(friendsRouter)
  return app
}

describe('friends router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    habitComparisonModelMock.find.mockReturnValue(mockQuery([]))
    habitComparisonModelMock.findOne.mockReturnValue(mockQuery(null))
    habitComparisonModelMock.findById.mockReturnValue(mockQuery(null))
    habitComparisonModelMock.create.mockResolvedValue(null)
    habitComparisonModelMock.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 })
    habitModelMock.find.mockReturnValue(mockQuery([]))
    habitModelMock.findOne.mockReturnValue(mockQuery(null))
    buildHabitSummariesMock.mockResolvedValue([])
    friendRequestModelMock.deleteOne.mockResolvedValue({ acknowledged: true, deletedCount: 1 })
    friendRequestModelMock.deleteMany.mockResolvedValue({ acknowledged: true, deletedCount: 1 })
  })

  it('returns overview data combining friends and requests', async () => {
    const user = {
      _id: 'user-1',
      friends: [{ _id: 'friend-1', username: 'ana', profile: { avatar: '/a.png' } }]
    }

    const incoming = [{ _id: 'req-1', from: { _id: 'user-2', username: 'ben', profile: { avatar: '' } } }]
    const outgoing = [{ _id: 'req-2', to: { _id: 'user-3', username: 'caro', profile: { avatar: '' } } }]

    userModelMock.findById.mockReturnValueOnce(mockQuery(user))

    friendRequestModelMock.find
      .mockImplementationOnce(() => mockQuery(incoming))
      .mockImplementationOnce(() => mockQuery(outgoing))

    profileModelMock.find.mockReturnValue(mockQuery([]))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/friends/overview')

    expect(res.status).toBe(200)
    expect(res.body.friends).toHaveLength(1)
    expect(res.body.incoming[0].id).toBe('req-1')
    expect(res.body.outgoing[0].id).toBe('req-2')
  })

  it('prevents dashboard access when users are not friends', async () => {
    userModelMock.findById
      .mockReturnValueOnce(mockQuery({ friends: [] }))
      .mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/friends/friend-1/dashboard')

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'No puedes ver el dashboard de este usuario' })
    expect(buildSummaryMock).not.toHaveBeenCalled()
  })

  it('returns friend dashboard when relationship exists', async () => {
    userModelMock.findById
      .mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
      .mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))

    buildSummaryMock.mockResolvedValue({ habits: [] })
    habitComparisonModelMock.find.mockReturnValue(mockQuery([]))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/friends/friend-1/dashboard')

    expect(res.status).toBe(200)
    expect(buildSummaryMock).toHaveBeenCalledWith('friend-1')
    expect(res.body).toEqual({ habits: [], comparisons: [] })
  })

  it('includes comparison payloads in dashboard response', async () => {
    userModelMock.findById
      .mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
      .mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))

    const friendHabitSummary = {
      id: 'fh1',
      name: 'Correr',
      emoji: '💪',
      color: 'zinc',
      category: 'fitness',
      type: 'time' as const,
      unit: 'h',
      totalThisMonth: 5,
      hoursThisMonth: 5,
      completedToday: false,
      streak: 2,
      history: []
    }

    buildSummaryMock.mockResolvedValue({ habits: [friendHabitSummary] })

    const comparisonDoc = { _id: 'cmp-1', ownerHabit: 'oh1', friendHabit: 'fh1', createdAt: new Date('2024-01-01') }
    habitComparisonModelMock.find.mockReturnValue(mockQuery([comparisonDoc]))

    const ownerHabitSummary = {
      ...friendHabitSummary,
      id: 'oh1',
      name: 'Mis carreras',
      totalThisMonth: 8,
      hoursThisMonth: 8
    }
    buildHabitSummariesMock.mockResolvedValueOnce([ownerHabitSummary])

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/friends/friend-1/dashboard')

    expect(res.status).toBe(200)
    expect(res.body.comparisons).toHaveLength(1)
    expect(res.body.comparisons[0].deltaThisMonth).toBe(3)
    expect(res.body.comparisons[0].ownerHabit.name).toBe('Mis carreras')
  })

  it('creates comparison when compatible habits are provided', async () => {
    userModelMock.findById
      .mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
      .mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))

    habitModelMock.findOne
      .mockReturnValueOnce(mockQuery({ _id: 'fh1', unit: 'h', type: 'time' }))
      .mockReturnValueOnce(mockQuery({ _id: 'oh1', unit: 'h', type: 'time' }))

    const comparisonDoc = { _id: 'cmp-1', ownerHabit: 'oh1', friendHabit: 'fh1', createdAt: new Date('2024-01-02') }
    habitComparisonModelMock.create.mockResolvedValue(comparisonDoc)

    const ownerSummary = {
      id: 'oh1',
      name: 'Mis carreras',
      emoji: '💪',
      color: 'zinc',
      category: 'fitness',
      type: 'time' as const,
      unit: 'h',
      totalThisMonth: 6,
      hoursThisMonth: 6,
      completedToday: true,
      streak: 4,
      history: []
    }

    const friendSummary = { ...ownerSummary, id: 'fh1', name: 'Correr', totalThisMonth: 4, hoursThisMonth: 4 }

    buildHabitSummariesMock
      .mockResolvedValueOnce([ownerSummary])
      .mockResolvedValueOnce([friendSummary])

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: 'fh1', ownerHabitId: 'oh1' })

    expect(res.status).toBe(201)
    expect(res.body.comparison.ownerHabit.id).toBe('oh1')
    expect(res.body.comparison.unit).toBe('h')
    expect(res.body.comparison.deltaThisMonth).toBe(2)
  })

  it('returns comparison candidates matching friend habit unit and type', async () => {
    userModelMock.findById
      .mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
      .mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))

    habitModelMock.findOne
      .mockReturnValueOnce(mockQuery({ _id: 'fh1', unit: 'h', type: 'time' }))

    habitModelMock.find.mockReturnValueOnce(mockQuery([{ _id: 'oh1' }]))

    const ownerCandidates = [
      {
        id: 'oh1',
        name: 'Leer',
        emoji: '📚',
        color: 'zinc',
        category: 'study',
        type: 'time' as const,
        unit: 'h',
        totalThisMonth: 4,
        hoursThisMonth: 4,
        completedToday: false,
        streak: 1,
        history: []
      }
    ]

    buildHabitSummariesMock.mockResolvedValueOnce(ownerCandidates)

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app)
      .get('/friends/friend-1/comparisons/candidates?friendHabitId=fh1')

    expect(res.status).toBe(200)
    expect(res.body.unit).toBe('h')
    expect(res.body.habits).toHaveLength(1)
    expect(res.body.habits[0].id).toBe('oh1')
  })

  it('rejects comparison creation when habits differ in unit or type', async () => {
    userModelMock.findById
      .mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
      .mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))

    habitModelMock.findOne
      .mockReturnValueOnce(mockQuery({ _id: 'fh1', unit: 'km', type: 'distance' }))
      .mockReturnValueOnce(mockQuery({ _id: 'oh1', unit: 'h', type: 'time' }))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: 'fh1', ownerHabitId: 'oh1' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Ambos hábitos deben compartir unidad y tipo')
  })

  it('allows owners to delete comparisons they created', async () => {
    habitComparisonModelMock.findById.mockReturnValueOnce(mockQuery({
      _id: 'cmp-1',
      owner: 'user-1',
      friend: 'friend-1'
    }))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).delete('/friends/friend-1/comparisons/cmp-1')

    expect(res.status).toBe(204)
    expect(habitComparisonModelMock.deleteOne).toHaveBeenCalledWith({ _id: 'cmp-1' })
  })

  it('prevents deleting comparisons owned by another user', async () => {
    habitComparisonModelMock.findById.mockReturnValueOnce(mockQuery({
      _id: 'cmp-2',
      owner: 'other-user',
      friend: 'friend-1'
    }))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).delete('/friends/friend-1/comparisons/cmp-2')

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('No puedes modificar esta comparación')
    expect(habitComparisonModelMock.deleteOne).not.toHaveBeenCalled()
  })

  it('validates usernames on search endpoint and forbids self lookup', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })
    const missingRes = await request(app).get('/friends/search')
    expect(missingRes.status).toBe(400)
    expect(missingRes.body.error).toBe('Username es requerido')

    userModelMock.findById.mockReturnValue(mockQuery({ _id: 'user-1', friends: [] }))
    userModelMock.findOne.mockReturnValue(mockQuery({ _id: 'user-1', username: 'self', profile: { avatar: '' } }))
    friendRequestModelMock.findOne.mockReturnValue(mockQuery(null))
    profileModelMock.find.mockReturnValue(mockQuery([]))

    const selfRes = await request(app).get('/friends/search?username=self')
    expect(selfRes.status).toBe(400)
    expect(selfRes.body.error).toBe('No puedes buscarte a ti mismo')
  })

  it('returns search result metadata when another user is found', async () => {
    userModelMock.findById.mockReturnValue(mockQuery({ _id: 'user-1', friends: [] }))
    userModelMock.findOne.mockReturnValue(mockQuery({ _id: 'user-2', username: 'neo', profile: { avatar: '/a.png' } }))
    friendRequestModelMock.findOne.mockReturnValue(mockQuery(null))
    profileModelMock.find.mockReturnValue(mockQuery([]))

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/friends/search?username=neo')

    expect(res.status).toBe(200)
    expect(res.body.user?.username).toBe('neo')
    expect(res.body.alreadyFriends).toBe(false)
    expect(res.body.pendingDirection).toBeNull()
  })

  it('validates comparison candidate preconditions', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })
    const missingRes = await request(app).get('/friends/friend-1/comparisons/candidates')
    expect(missingRes.status).toBe(400)

    userModelMock.findById.mockReturnValueOnce(mockQuery(null))
    const notFoundRes = await request(app).get('/friends/friend-1/comparisons/candidates?friendHabitId=h1')
    expect(notFoundRes.status).toBe(404)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ friends: [] }))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'fh1', unit: 'h', type: 'time' }))
    const notFriendsRes = await request(app).get('/friends/friend-1/comparisons/candidates?friendHabitId=h1')
    expect(notFriendsRes.status).toBe(403)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery(null))
    const missingHabitRes = await request(app).get('/friends/friend-1/comparisons/candidates?friendHabitId=h1')
    expect(missingHabitRes.status).toBe(404)
  })

  it('checks comparison creation edge cases', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })
    const missingRes = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: '', ownerHabitId: '' })
    expect(missingRes.status).toBe(400)

    userModelMock.findById.mockReturnValueOnce(mockQuery(null))
    const notFoundRes = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: 'fh1', ownerHabitId: 'oh1' })
    expect(notFoundRes.status).toBe(404)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ friends: [] }))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'fh1', unit: 'h', type: 'time' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'oh1', unit: 'h', type: 'time' }))
    const notFriendsRes = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: 'fh1', ownerHabitId: 'oh1' })
    expect(notFriendsRes.status).toBe(403)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery(null))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'oh1', unit: 'h', type: 'time' }))
    const missingHabitRes = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: 'fh1', ownerHabitId: 'oh1' })
    expect(missingHabitRes.status).toBe(404)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ friends: ['friend-1'] }))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'fh1', unit: 'h', type: 'time' }))
    habitModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'oh1', unit: 'h', type: 'time' }))
    habitComparisonModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'cmp-1' }))
    const existingRes = await request(app)
      .post('/friends/friend-1/comparisons')
      .send({ friendHabitId: 'fh1', ownerHabitId: 'oh1' })
    expect(existingRes.status).toBe(409)
  })

  it('returns 404 when deleting a missing comparison', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })
    habitComparisonModelMock.findById.mockReturnValueOnce(mockQuery(null))
    const res = await request(app).delete('/friends/friend-1/comparisons/cmp-404')
    expect(res.status).toBe(404)
  })

  it('handles missing users in search and request flows', async () => {
    userModelMock.findById.mockReturnValueOnce(mockQuery(null))
    const app = buildApp({ user: { userId: 'user-1' } })
    const searchRes = await request(app).get('/friends/search?username=neo')
    expect(searchRes.status).toBe(404)

    const missingUsername = await request(app).post('/friends/requests').send({})
    expect(missingUsername.status).toBe(400)
  })

  it('covers friend request edge cases', async () => {
    const app = buildApp({ user: { userId: 'user-1', username: 'neo' } })

    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'user-1', friends: [] }))
    userModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'user-1', username: 'neo', profile: { avatar: '' } }))
    friendRequestModelMock.findOne.mockReturnValue(mockQuery(null))
    profileModelMock.find.mockReturnValue(mockQuery([]))
    const selfRes = await request(app).post('/friends/requests').send({ username: 'neo' })
    expect(selfRes.status).toBe(400)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'user-1', friends: ['user-2'] }))
    userModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'user-2', username: 'morpheus', profile: { avatar: '' } }))
    const alreadyFriends = await request(app).post('/friends/requests').send({ username: 'morpheus' })
    expect(alreadyFriends.status).toBe(409)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'user-1', friends: [] }))
    userModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'user-3', username: 'trinity', profile: { avatar: '' } }))
    friendRequestModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'pending-1' }))
    const pendingRes = await request(app).post('/friends/requests').send({ username: 'trinity' })
    expect(pendingRes.status).toBe(409)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'user-1', friends: [] }))
    userModelMock.findOne.mockReturnValueOnce(mockQuery({ _id: 'user-4', username: 'smith', profile: { avatar: '' } }))
    friendRequestModelMock.findOne.mockReturnValueOnce(mockQuery(null))
    friendRequestModelMock.create.mockRejectedValueOnce({ code: 11000 })
    const duplicateRes = await request(app).post('/friends/requests').send({ username: 'smith' })
    expect(duplicateRes.status).toBe(409)
  })

  it('validates accept/decline flows', async () => {
    const app = buildApp({ user: { userId: 'user-1', username: 'neo' } })

    friendRequestModelMock.findById.mockResolvedValueOnce(null)
    const missingReq = await request(app).post('/friends/requests/req-1/accept')
    expect(missingReq.status).toBe(404)

    friendRequestModelMock.findById.mockResolvedValueOnce({ _id: 'req-2', from: 'user-2', to: 'user-3' })
    const forbiddenAccept = await request(app).post('/friends/requests/req-2/accept')
    expect(forbiddenAccept.status).toBe(403)

    friendRequestModelMock.findById.mockResolvedValueOnce({
      _id: 'req-3',
      from: 'user-2',
      to: 'user-3',
      deleteOne: vi.fn().mockResolvedValue(undefined)
    })
    const forbiddenDecline = await request(app).post('/friends/requests/req-3/decline')
    expect(forbiddenDecline.status).toBe(403)
  })

  it('handles delete friendship errors', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })

    userModelMock.findById.mockReturnValueOnce(mockQuery(null))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1', friends: [] }))
    const notFoundRes = await request(app).delete('/friends/friend-1')
    expect(notFoundRes.status).toBe(404)

    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'user-1', friends: [] }))
    userModelMock.findById.mockReturnValueOnce(mockQuery({ _id: 'friend-1', friends: [] }))
    const notFriendsRes = await request(app).delete('/friends/friend-1')
    expect(notFriendsRes.status).toBe(400)
  })
})