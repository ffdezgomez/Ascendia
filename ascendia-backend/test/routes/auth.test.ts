import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const userMock = {
  findOne: vi.fn(),
  save: vi.fn(),
}

vi.mock('../../src/models/user.js', () => ({
  __esModule: true,
  default: userMock
}))

const sendResetPasswordEmail = vi.fn()
vi.mock('../../src/services/emailService.js', () => ({
  __esModule: true,
  sendResetPasswordEmail
}))

const hashMock = vi.fn(async (val: string) => `hashed-${val}`)
vi.mock('bcryptjs', () => ({
  default: { hash: hashMock },
  hash: hashMock
}))

vi.mock('../../src/config.js', () => ({
  saltRoundsNum: 10
}))

const buildApp = async () => {
  const router = (await import('../../src/routes/auth')).default
  const app = express()
  app.use(express.json())
  app.use('/auth', router)
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({ error: err?.message || 'error' })
  })
  return app
}

const resetMocks = () => {
  userMock.findOne.mockReset()
  userMock.save.mockReset()
  sendResetPasswordEmail.mockReset()
  hashMock.mockClear()
}

describe('auth routes', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('rejects forgot-password without email', async () => {
    const app = await buildApp()

    const res = await request(app).post('/auth/forgot-password').send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('emailOrUsername requerido')
  })

  it('returns generic message when user not found in forgot-password', async () => {
    const app = await buildApp()
    userMock.findOne.mockResolvedValue(null)

    const res = await request(app).post('/auth/forgot-password').send({ emailOrUsername: 'nobody' })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Si existe la cuenta/)
    expect(sendResetPasswordEmail).not.toHaveBeenCalled()
  })

  it('sends reset email and stores hashed token', async () => {
    const app = await buildApp()
    const savedUser: any = {
      email: 'a@a.com',
      username: 'alice',
      save: vi.fn().mockResolvedValue(undefined)
    }
    userMock.findOne.mockResolvedValue(savedUser)

    const res = await request(app).post('/auth/forgot-password').send({ emailOrUsername: 'alice' })

    expect(res.status).toBe(200)
    expect(savedUser.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/)
    expect(savedUser.resetPasswordExpires).toBeInstanceOf(Date)
    expect(sendResetPasswordEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@a.com', username: 'alice', token: expect.any(String) }))
  })

  it('returns 500 if email sending fails', async () => {
    const app = await buildApp()
    const savedUser: any = {
      email: 'b@b.com',
      username: 'bob',
      save: vi.fn().mockResolvedValue(undefined)
    }
    userMock.findOne.mockResolvedValue(savedUser)
    sendResetPasswordEmail.mockRejectedValue(new Error('smtp down'))

    const res = await request(app).post('/auth/forgot-password').send({ emailOrUsername: 'bob' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/No se pudo enviar/)
  })

  it('rejects reset-password with missing params', async () => {
    const app = await buildApp()
    const res = await request(app).post('/auth/reset-password').send({})
    expect(res.status).toBe(400)
  })

  it('rejects reset-password with invalid or expired token', async () => {
    const app = await buildApp()
    userMock.findOne.mockResolvedValue(null)

    const res = await request(app).post('/auth/reset-password').send({ token: 'x', newPassword: 'Password1' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Token inválido o expirado')
  })

  it('updates password on valid reset', async () => {
    const app = await buildApp()
    const savedUser: any = {
      save: vi.fn().mockResolvedValue(undefined),
      resetPasswordToken: 'old',
      resetPasswordExpires: new Date()
    }
    userMock.findOne.mockResolvedValue(savedUser)

    const res = await request(app).post('/auth/reset-password').send({ token: 'valid', newPassword: 'Password1' })

    expect(res.status).toBe(200)
    expect(savedUser.password).toBe('hashed-Password1')
    expect(savedUser.resetPasswordToken).toBeUndefined()
    expect(savedUser.resetPasswordExpires).toBeUndefined()
  })

  it('rejects verify-email without token', async () => {
    const app = await buildApp()
    const res = await request(app).post('/auth/verify-email').send({})
    expect(res.status).toBe(400)
  })

  it('rejects verify-email with invalid token', async () => {
    const app = await buildApp()
    userMock.findOne.mockResolvedValue(null)

    const res = await request(app).post('/auth/verify-email').send({ token: 'bad' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Token inválido o expirado')
  })

  it('verifies user and clears token on valid verify-email', async () => {
    const app = await buildApp()
    const user: any = {
      isVerified: false,
      verificationToken: 't',
      verificationTokenExpires: new Date(),
      save: vi.fn().mockResolvedValue(undefined)
    }
    userMock.findOne.mockResolvedValue(user)

    const res = await request(app).post('/auth/verify-email').send({ token: 't' })

    expect(res.status).toBe(200)
    expect(user.isVerified).toBe(true)
    expect(user.verificationToken).toBeUndefined()
    expect(user.verificationTokenExpires).toBeUndefined()
  })
})
