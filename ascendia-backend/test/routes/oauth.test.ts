import express from 'express'
import request from 'supertest'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const buildApp = async () => {
  const router = (await import('../../src/routes/oauth')).default
  const app = express()
  app.use('/oauth', router)
  return app
}

const userRepoMock = { findOrCreateByGoogleId: vi.fn() }
vi.mock('../../src/models/user', () => ({ UserRepository: userRepoMock }))

const mockConfig = (overrides: any = {}) => {
  vi.doMock('../../src/config', () => ({
    __esModule: true,
    GOOGLE_CLIENT_ID: 'cid',
    GOOGLE_CLIENT_SECRET: 'secret',
    GOOGLE_REDIRECT_URI: 'http://localhost/callback',
    SECRET_JWT_KEY: 'jwt-secret',
    FRONTEND_URL: 'http://frontend',
    NODE_ENV: 'test',
    ...overrides
  }))
}

describe('oauth routes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    userRepoMock.findOrCreateByGoogleId.mockReset()
  })

  it('returns 500 when google creds are missing', async () => {
    mockConfig({ GOOGLE_CLIENT_ID: undefined })
    const app = await buildApp()

    const res = await request(app).get('/oauth/google')
    expect(res.status).toBe(500)
  })

  it('redirects to Google auth when configured', async () => {
    mockConfig()
    const app = await buildApp()

    const res = await request(app).get('/oauth/google')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('accounts.google.com')
  })

  it('redirects to login error when callback has no code', async () => {
    mockConfig()
    const app = await buildApp()

    const res = await request(app).get('/oauth/google/callback')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=oauth_failed')
  })

  it('handles token fetch failure', async () => {
    mockConfig()
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'bad' }) })) as any
    const app = await buildApp()

    const res = await request(app).get('/oauth/google/callback?code=abc')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=oauth_token_failed')
  })

  it('handles user info failure', async () => {
    mockConfig()
    const tokenRes = { ok: true, json: async () => ({ access_token: 'a', id_token: 'id' }) }
    const userRes = { ok: false, json: async () => ({ error: 'user' }) }
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(tokenRes as any)
    fetchMock.mockResolvedValueOnce(userRes as any)
    global.fetch = fetchMock as any
    const app = await buildApp()

    const res = await request(app).get('/oauth/google/callback?code=abc')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('error=oauth_user_failed')
  })

  it('sets cookie and redirects on successful OAuth', async () => {
    mockConfig()
    const tokenRes = { ok: true, json: async () => ({ access_token: 'a', id_token: 'id' }) }
    const userRes = { ok: true, json: async () => ({ id: 'gid', email: 'u@e.com', name: 'Test User' }) }
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(tokenRes as any)
    fetchMock.mockResolvedValueOnce(userRes as any)
    global.fetch = fetchMock as any

    userRepoMock.findOrCreateByGoogleId.mockResolvedValue({ _id: 'u1', username: 'test_user' })
    const jwtSign = vi.fn(() => 'jwt-token')
    vi.doMock('jsonwebtoken', () => ({ default: { sign: jwtSign }, sign: jwtSign }))

    const app = await buildApp()

    const res = await request(app).get('/oauth/google/callback?code=abc')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('http://frontend/')
    expect(res.headers['set-cookie']?.[0]).toContain('access_token')
    expect(userRepoMock.findOrCreateByGoogleId).toHaveBeenCalledWith(expect.objectContaining({ googleId: 'gid' }))
  })
})
