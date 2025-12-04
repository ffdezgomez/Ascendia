import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import profileRouter from '../../src/routes/profile'

const userModelMock = vi.hoisted(() => ({
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn()
}))

const profileModelMock = vi.hoisted(() => ({
  findOne: vi.fn(),
  create: vi.fn()
}))

const avatarModelMock = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn().mockResolvedValue({})
}))

const fsMock = vi.hoisted(() => ({ mkdirSync: vi.fn() }))

const multerInstanceMock = vi.hoisted(() => {
  const middleware = (_field: string) => (req: any, _res: any, next: any) => {
    if (!Object.prototype.hasOwnProperty.call(req, '__mockFile')) {
      req.file = { filename: 'avatar.png', buffer: Buffer.from('fake'), mimetype: 'image/png' }
    } else {
      req.file = req.__mockFile ?? undefined
    }
    next()
  }

  const fn = vi.fn(() => ({ single: middleware })) as any
  fn.diskStorage = vi.fn(() => ({}))
  return fn
})

vi.mock('../../src/models/user.js', () => ({
  default: userModelMock
}))

vi.mock('../../src/models/profile.js', () => ({
  default: profileModelMock
}))

vi.mock('../../src/models/avatar.js', () => ({
  default: avatarModelMock
}))

vi.mock('fs', () => ({
  default: fsMock
}))

vi.mock('multer', () => ({
  default: multerInstanceMock,
  memoryStorage: vi.fn(() => ({}))
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
  app.use(profileRouter)
  return app
}

function createUserDoc(overrides: Partial<any> = {}) {
  return {
    _id: 'user-1',
    username: 'neo',
    email: 'neo@matrix.io',
    profile: 'profile-1',
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

function createProfileDoc(overrides: Partial<any> = {}) {
  return {
    _id: 'profile-1',
    avatar: '/avatar.png',
    bio: 'bio',
    habits: [],
    stats: { readingHours: 0, workoutHours: 0, streak: 0 },
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
}

describe('profile router', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when session is missing', async () => {
    const app = buildApp()
    const res = await request(app).get('/profile')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No autenticicado' })
  })

  it('returns persisted profile data when it already exists', async () => {
    const user = createUserDoc()
    const profile = createProfileDoc()
    userModelMock.findById.mockResolvedValue(user)
    profileModelMock.findOne.mockResolvedValue(profile)

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/profile')

    expect(res.status).toBe(200)
    expect(res.body.user).toBe('neo')
    expect(res.body.avatar).toBe('/avatar.png')
    expect(profileModelMock.create).not.toHaveBeenCalled()
    expect(user.save).not.toHaveBeenCalled()
  })

  it('creates a profile when missing and links it to the user', async () => {
    const user = createUserDoc({ profile: null })
    const createdProfile = createProfileDoc({ _id: 'profile-new' })
    userModelMock.findById.mockResolvedValue(user)
    profileModelMock.findOne.mockResolvedValueOnce(null)
    profileModelMock.create.mockResolvedValue(createdProfile)

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app).get('/profile')

    expect(profileModelMock.create).toHaveBeenCalled()
    expect(user.save).toHaveBeenCalled()
    expect(res.body.avatar).toBe('/avatar.png')
  })

  it('updates user and profile fields via PUT /profile', async () => {
    const updatedUser = createUserDoc({ username: 'trinity', profile: null })
    const profile = createProfileDoc({ avatar: '', bio: '' })
    updatedUser.save = vi.fn().mockResolvedValue(undefined)

    userModelMock.findByIdAndUpdate.mockResolvedValue(updatedUser)
    profileModelMock.findOne.mockResolvedValue(profile)

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app)
      .put('/profile')
      .send({ user: 'trinity', avatar: '/new.png', bio: 'hola', habits: ['h1'] })

    expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-1',
      { $set: { username: 'trinity' } },
      { new: true }
    )
    expect(profile.save).toHaveBeenCalled()
    expect(updatedUser.save).toHaveBeenCalled()
    expect(res.body.user).toBe('trinity')
    expect(res.body.avatar).toBe('/new.png')
  })

  it('uploads avatar file and stores relative url', async () => {
    const user = createUserDoc({ profile: null })
    const profile = createProfileDoc({ avatar: '', save: vi.fn().mockResolvedValue(undefined) })
    userModelMock.findById.mockResolvedValue(user)
    profileModelMock.findOne.mockResolvedValue(profile)

    const app = buildApp({ user: { userId: 'user-1' } })
    const res = await request(app)
      .post('/profile/avatar')
      .field('__noop', '1')

    expect(profile.save).toHaveBeenCalled()
    expect(res.status).toBe(200)
    // Depending on storage (disk vs memory->DB) the route sets either a uploads path
    // or an API avatar URL. Accept both formats.
    expect(res.body.avatar).toMatch(/(\/uploads\/avatars\/|\/api\/profile\/avatar\/)/)
  })
})