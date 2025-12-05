import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ZodError } from 'zod'

const findOneQueue: Array<any> = []
const saveInstances: any[] = []
let currentNodeEnv = 'test'

const makeUserClass = () => {
  class FakeUser {
    username: string
    email: string
    password?: string
    googleId?: string
    isVerified?: boolean
    verificationToken?: string
    verificationTokenExpires?: Date

    constructor(data: any) {
      Object.assign(this, data)
    }

    static findOne = vi.fn(async (query: any) => {
      const next = findOneQueue.shift()
      return typeof next === 'function' ? next(query) : next ?? null
    })

    async save() {
      saveInstances.push(this)
      return { ...this, _id: 'user-id' }
    }
  }

  return FakeUser
}

const modelMock = vi.fn((name: string) => {
  if (name !== 'User') return makeUserClass()
  if (!(modelMock as any).__userClass) {
    ;(modelMock as any).__userClass = makeUserClass()
  }
  return (modelMock as any).__userClass
})

vi.mock('mongoose', () => ({
  Schema: class {
    static Types = { ObjectId: class {} }
    Types = { ObjectId: class {} }
  },
  model: modelMock
}))

vi.mock('../../src/config.js', () => ({
  get NODE_ENV() { return currentNodeEnv },
  saltRoundsNum: 10
}))

const hashMock = vi.fn(async () => 'hashed-password')
const compareMock = vi.fn(async () => true)
vi.mock('bcryptjs', () => ({
  default: {
    hash: hashMock,
    compare: compareMock
  },
  hash: hashMock,
  compare: compareMock
}))

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => Buffer.from('token-bytes'))
}))

// Import after mocks
const { UserRepository } = await import('../../src/models/user')

const resetState = () => {
  findOneQueue.length = 0
  saveInstances.length = 0
  hashMock.mockClear()
  compareMock.mockClear()
  modelMock.mockClear()
}

describe('UserRepository', () => {
  beforeEach(() => {
    vi.resetModules()
    resetState()
    currentNodeEnv = 'test'
    process.env.NODE_ENV = 'test'
    process.env.VITEST = 'true'
    delete process.env.VITEST_WORKER_ID
  })

  it('rejects duplicate users on create', async () => {
    findOneQueue.push({ _id: 'existing' })

    await expect(UserRepository.create({ username: 'alice', email: 'a@a.com', password: 'Password1' }))
      .rejects.toThrow('Usuario con ese username o email ya existe')
    expect(hashMock).not.toHaveBeenCalled()
  })

  it('creates user in test env without verification token', async () => {
    findOneQueue.push(null) // findOne for existing user

    const result = await UserRepository.create({ username: 'bob', email: 'b@b.com', password: 'Password1' })

    expect(result).toMatchObject({ username: 'bob', email: 'b@b.com', verificationToken: undefined })
    expect(hashMock).toHaveBeenCalledWith('Password1', expect.any(Number))
    expect(saveInstances[0]?.isVerified).toBe(true)
  })

  it('creates user in prod env generating verification token', async () => {
    currentNodeEnv = 'production'
    process.env.NODE_ENV = 'production'
    delete process.env.VITEST
    delete process.env.VITEST_WORKER_ID
    findOneQueue.push(null)

    const result = await UserRepository.create({ username: 'carol', email: 'c@c.com', password: 'Password1' })

    expect(result.verificationToken).toBe('746f6b656e2d6279746573')
    expect(saveInstances[0]?.isVerified).toBe(false)
    expect(saveInstances[0]?.verificationTokenExpires).toBeInstanceOf(Date)
  })

  it('throws validation errors on invalid create payload', async () => {
    await expect(UserRepository.create({ username: 'a', email: 'bad', password: 'short' }))
      .rejects.toHaveProperty('issues')
  })

  it('finds by googleId or links by email', async () => {
    // First call: googleId hit
    findOneQueue.push({ _id: 'google-user' })
    const existingGoogle = await UserRepository.findOrCreateByGoogleId({ googleId: 'gid1', email: 'x@y.com', username: 'neo' })
    expect(existingGoogle._id).toBe('google-user')

    // Second: no google, found by email -> link
    const emailUser: any = { _id: 'email-user', save: vi.fn(), googleId: undefined }
    findOneQueue.push(null) // google
    findOneQueue.push(emailUser) // email
    const linked = await UserRepository.findOrCreateByGoogleId({ googleId: 'gid2', email: 'x@y.com', username: 'neo' })
    expect(emailUser.googleId).toBe('gid2')
    expect(emailUser.save).toHaveBeenCalled()
    expect(linked).toBe(emailUser)

    // Third: create new, with username collision once
    findOneQueue.push(null) // google
    findOneQueue.push(null) // email
    findOneQueue.push({ username: 'neo' }) // username exists
    findOneQueue.push(null) // username available
    const created = await UserRepository.findOrCreateByGoogleId({ googleId: 'gid3', email: 'z@y.com', username: 'neo' })
    expect(created.username).toBe('neo1')
  })

  it('login validates credentials, errors on missing or bad password', async () => {
    // missing user
    findOneQueue.push(null)
    await expect(UserRepository.login({ username: 'ghost', password: 'Password1' })).rejects.toThrow('Usuario no encontrado')

    // wrong password
    const userRecord: any = { _id: 'u1', username: 'neo', email: 'n@n.com', password: 'hash' }
    compareMock.mockResolvedValueOnce(false)
    findOneQueue.push(userRecord)
    await expect(UserRepository.login({ username: 'neo', password: 'Password2' })).rejects.toThrow('Contraseña incorrecta')

    // success
    compareMock.mockResolvedValueOnce(true)
    findOneQueue.push(userRecord)
    const logged = await UserRepository.login({ username: 'neo', password: 'Password1' })
    expect(logged).toEqual({ _id: 'u1', username: 'neo', email: 'n@n.com' })
  })
})
