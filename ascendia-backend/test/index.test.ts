import type { Express } from 'express'
import express from 'express'
import http from 'node:http'
import mongoose from 'mongoose'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 10000 })

const originalEnv = { ...process.env }
const defaultEnv = {
  FRONTEND_URL: 'http://frontend.test',
  CORS_ALLOWED_ORIGINS: 'http://extra.local, http://frontend.test',
  NODE_ENV: 'test',
  VITEST: 'true',
  MONGODB_URI: 'mongodb://localhost/test',
  MONGODB_DBNAME: 'test-db'
}
const TEST_HEADER = 'x-test-probe'
const TEST_COOKIE = 'access_token=fake-token'

const logIfUnexpected = (label: string, res: request.Response, expected: number) => {
  if (res.status !== expected) {
    // Aid debugging while keeping noise minimal when passing
    console.log(label, res.status, res.body)
  }
}

type ExpressWithStack = Express & {
  _router?: {
    stack: Array<{ handle: (...args: any[]) => void }>
  }
}

const applyDefaultEnv = () => {
  process.env = { ...originalEnv, ...defaultEnv } as NodeJS.ProcessEnv
}

const importIndex = () => import('../src/index')

const resetMongooseModels = () => {
  const connectionModels = (mongoose.connection?.models) ?? {}
  for (const name of Object.keys(connectionModels)) {
    delete mongoose.connection.models[name]
  }

  for (const name of Object.keys(mongoose.models)) {
    delete mongoose.models[name]
  }

  for (const name of Object.keys((mongoose as any).modelSchemas || {})) {
    delete (mongoose as any).modelSchemas[name]
  }
}

const buildTestRouter = () => {
  const router = express.Router()

  router.get('/', (req, res, next) => {
    if (req.headers[TEST_HEADER] === 'root-check') {
      return res.json({ path: req.path })
    }
    next()
  })

  router.get('/_test/session', (req, res) => {
    res.json({ session: req.session ?? null })
  })

  router.get('/_test/errors/zod', (_req, _res, next) => {
    next({ name: 'ZodError', errors: [{ message: 'invalid' }] })
  })

  router.get('/_test/errors/duplicate', (_req, _res, next) => {
    next({ code: 11000, keyPattern: { email: 1 } })
  })

  router.get('/_test/errors/validation', (_req, _res, next) => {
    next({ name: 'ValidationError', message: 'bad data' })
  })

  router.get('/_test/errors/db', (_req, _res, next) => {
    next({ name: 'MongoServerError' })
  })

  router.get('/_test/errors/generic', (_req, _res, next) => {
    next(new Error('boom'))
  })

  return router
}

const loadServer = async () => {
  const module = await importIndex()
  const router = buildTestRouter()
  module.app.use(router)
  module.app.use(module.errorHandler)
  return module
}

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  applyDefaultEnv()
  process.env.SKIP_ERROR_HANDLER = 'true'
  process.env.BYPASS_AUTH = 'true'
  vi.spyOn(jwt, 'verify').mockReturnValue({ userId: 'test-user', username: 'tester' } as any)
  resetMongooseModels()
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  process.env = originalEnv
})

describe('index routes and middleware', () => {
  it('registers users and sends verification emails when needed', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')
    const emailModule = await import('../src/services/emailService')

    vi.spyOn(userModule.UserRepository, 'create').mockResolvedValue({
      _id: 'user-1',
      username: 'alice',
      email: 'alice@example.com',
      verificationToken: 'token-abc'
    } as any)

    const emailSpy = vi.spyOn(emailModule, 'sendVerificationEmail').mockResolvedValue()

    const response = await request(app)
      .post('/register')
      .send({ username: 'alice', email: 'alice@example.com', password: 'Password1' })

    expect(response.status).toBe(201)
    expect(emailSpy).toHaveBeenCalledWith({
      to: 'alice@example.com',
      username: 'alice',
      token: 'token-abc'
    })
  })

  it('skips verification email when no token is generated', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')
    const emailModule = await import('../src/services/emailService')

    vi.spyOn(userModule.UserRepository, 'create').mockResolvedValue({
      _id: 'user-2',
      username: 'bob',
      email: 'bob@example.com',
      verificationToken: undefined
    } as any)

    const emailSpy = vi.spyOn(emailModule, 'sendVerificationEmail').mockResolvedValue()

    const response = await request(app)
      .post('/register')
      .send({ username: 'bob', email: 'bob@example.com', password: 'Password1' })

    expect(response.status).toBe(201)
    expect(emailSpy).not.toHaveBeenCalled()
  })

  it('logs verification failures but still succeeds', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')
    const emailModule = await import('../src/services/emailService')

    vi.spyOn(userModule.UserRepository, 'create').mockResolvedValue({
      _id: 'user-3',
      username: 'carol',
      email: 'carol@example.com',
      verificationToken: 'token-xyz'
    } as any)

    vi.spyOn(emailModule, 'sendVerificationEmail').mockRejectedValue(new Error('smtp down'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(app)
      .post('/register')
      .send({ username: 'carol', email: 'carol@example.com', password: 'Password1' })

    expect(response.status).toBe(201)
    expect(consoleSpy).toHaveBeenCalledWith('Error enviando verificación:', expect.any(Error))
  })

  it('forwards repository errors to the error handler', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')
    vi.spyOn(userModule.UserRepository, 'create').mockRejectedValue({ code: 11000, keyPattern: { email: 1 } })

    const response = await request(app)
      .post('/register')
      .send({ username: 'dave', email: 'dave@example.com', password: 'Password1' })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('email ya está en uso')
  })

  it('blocks login when the user email is not verified', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')

    vi.spyOn(userModule.UserRepository, 'login').mockResolvedValue({
      _id: 'user-4',
      username: 'neo',
      email: 'neo@example.com'
    } as any)

    vi.spyOn(userModule.default as any, 'findById').mockResolvedValue({ isVerified: false })

    const response = await request(app)
      .post('/login')
      .send({ username: 'neo', password: 'Password1' })

    expect(response.status).toBe(403)
    expect(response.body.error).toContain('Por favor verifica tu correo electrónico')
  })

  it('creates a session cookie for verified users', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')

    vi.spyOn(userModule.UserRepository, 'login').mockResolvedValue({
      _id: 'user-5',
      username: 'trinity',
      email: 'trinity@example.com'
    } as any)

    vi.spyOn(userModule.default as any, 'findById').mockResolvedValue({ isVerified: true })
    vi.spyOn(jwt, 'sign').mockReturnValue('signed-token')

    const response = await request(app)
      .post('/login')
      .send({ username: 'trinity', password: 'Password1' })

    expect(response.status).toBe(200)
    expect(response.headers['set-cookie']?.[0]).toContain('access_token=signed-token')
    expect(response.body.token).toBe('signed-token')
  })

  it('propagates login failures to the error middleware', async () => {
    const { app } = await loadServer()
    const userModule = await import('../src/models/user')
    vi.spyOn(userModule.UserRepository, 'login').mockRejectedValue(new Error('invalid credentials'))

    const response = await request(app)
      .post('/login')
      .send({ username: 'smith', password: 'Password1' })

    expect(response.status).toBe(500)
    expect(response.body.error).toBe('invalid credentials')
  })

  it('rewrites /api to /', async () => {
    const { app } = await loadServer()

    const response = await request(app)
      .get('/api')
      .set(TEST_HEADER, 'root-check')

    logIfUnexpected('rewrite /api', response, 200)
    expect(response.status).toBe(200)
    expect(response.body.path).toBe('/')
  })

  it('rewrites /api/* prefixes', async () => {
    const { app } = await loadServer()

    const response = await request(app)
      .get('/api/_test/session')

    logIfUnexpected('rewrite /api/*', response, 200)
    expect(response.status).toBe(200)
    expect(response.body.session).toEqual({ user: null })
  })

  it('attaches the decoded user when the JWT is valid', async () => {
    const { app } = await loadServer()
    vi.spyOn(jwt, 'verify').mockReturnValue({ userId: 'jwt-user', username: 'eve' } as any)

    const response = await request(app)
      .get('/_test/session')
      .set('Cookie', 'access_token=test-token')

    expect(response.status).toBe(200)
    expect(response.body.session.user).toEqual({ userId: 'jwt-user', username: 'eve' })
  })

  it('drops the session when the JWT is invalid', async () => {
    const { app } = await loadServer()
    vi.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('invalid token') })

    const response = await request(app)
      .get('/_test/session')
      .set('Cookie', 'access_token=test-token')

    logIfUnexpected('invalid jwt', response, 200)
    expect(response.status).toBe(200)
    expect(response.body.session.user).toBeNull()
  })

  it('clears the cookie on logout', async () => {
    const { app } = await loadServer()

    const response = await request(app)
      .post('/logout')
      .set('Cookie', TEST_COOKIE)

    logIfUnexpected('logout', response, 200)
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true, message: 'Sesión cerrada' })
  })

  it('rejects disallowed origins through CORS middleware', async () => {
    const { app } = await loadServer()
    const response = await request(app)
      .get('/_test/session')
      .set('Origin', 'http://evil.test')

    expect(response.status).toBe(500)
    expect(response.body.error).toContain('Origin http://evil.test no permitido')
  })

  it('handles Zod errors with a 400', async () => {
    const { app } = await loadServer()

    const response = await request(app).get('/_test/errors/zod')
      .set('Cookie', TEST_COOKIE)

    logIfUnexpected('zod error', response, 400)
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Datos inválidos')
    expect(response.body.details).toBeDefined()
  })

  it('handles duplicate key errors with field hints', async () => {
    const { app } = await loadServer()

    const response = await request(app).get('/_test/errors/duplicate')
      .set('Cookie', TEST_COOKIE)

    logIfUnexpected('duplicate key', response, 409)
    expect(response.status).toBe(409)
    expect(response.body.error).toBe('email ya está en uso')
  })

  it('returns validation errors with details', async () => {
    const { app } = await loadServer()

    const response = await request(app).get('/_test/errors/validation')
      .set('Cookie', TEST_COOKIE)

    logIfUnexpected('validation error', response, 400)
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Datos inválidos')
    expect(response.body.details).toBe('bad data')
  })

  it('reports database connectivity problems as 503', async () => {
    const { app } = await loadServer()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(app).get('/_test/errors/db')
      .set('Cookie', TEST_COOKIE)

    logIfUnexpected('db error', response, 503)
    expect(response.status).toBe(503)
    expect(response.body.error).toBe('Servicio temporalmente no disponible')
    expect(consoleSpy).toHaveBeenCalledWith('Error de BD:', expect.any(Object))
  })

  it('falls back to generic 500 errors', async () => {
    const { app } = await loadServer()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(app).get('/_test/errors/generic')
      .set('Cookie', TEST_COOKIE)

    logIfUnexpected('generic error', response, 500)
    expect(response.status).toBe(500)
    expect(response.body.error).toBe('boom')
    expect(consoleSpy).toHaveBeenCalledWith('Error inesperado:', expect.any(Error))
  })
})

describe('index startup', () => {
  it('starts the HTTP server via start()', async () => {
    resetMongooseModels()
    const connectModule = await import('../src/db/mongoose')
    const socketModule = await import('../src/realtime/socket')
    const connectSpy = vi.spyOn(connectModule, 'connectDB').mockResolvedValue(undefined)
    const socketSpy = vi.spyOn(socketModule, 'initSocketServer').mockImplementation(() => {})

    const listenSpy = vi.fn((_port, _host, cb) => {
      cb?.()
      return {} as http.Server
    })
    const createServerSpy = vi.spyOn(http, 'createServer').mockReturnValue({ listen: listenSpy } as unknown as http.Server)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { start } = await importIndex()
    await start()

    expect(connectSpy).toHaveBeenCalled()
    expect(socketSpy).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ allowedOrigins: expect.arrayContaining(['http://frontend.test', 'http://extra.local']) }))
    expect(createServerSpy).toHaveBeenCalled()
    expect(listenSpy).toHaveBeenCalledWith(5000, '0.0.0.0', expect.any(Function))
    expect(logSpy).toHaveBeenCalled()
  })

  it('boots automatically when the Vitest guards are absent', async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    resetMongooseModels()

    const connectSpy = vi.fn().mockResolvedValue(undefined)
    const socketSpy = vi.fn()
    const listenSpy = vi.fn((_port, _host, cb) => {
      cb?.()
      return {} as http.Server
    })
    const createServerSpy = vi.spyOn(http, 'createServer').mockReturnValue({ listen: listenSpy } as unknown as http.Server)

    vi.doMock('../src/db/mongoose', () => ({ connectDB: connectSpy }))
    vi.doMock('../src/realtime/socket', () => ({ initSocketServer: socketSpy }))

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    const cleanEnv: NodeJS.ProcessEnv = {
      ...originalEnv,
      FRONTEND_URL: 'http://frontend.test',
      NODE_ENV: 'test',
      MONGODB_URI: originalEnv.MONGODB_URI ?? 'mongodb://localhost/test',
      MONGODB_DBNAME: originalEnv.MONGODB_DBNAME ?? 'test-db'
    }
    delete cleanEnv.VITEST
    delete cleanEnv.VITEST_WORKER_ID
    process.env = cleanEnv

    await importIndex()

    expect(connectSpy).toHaveBeenCalled()
    expect(socketSpy).toHaveBeenCalled()
    expect(createServerSpy).toHaveBeenCalled()
    expect(listenSpy).toHaveBeenCalled()
    expect(consoleLog).toHaveBeenCalled()

    vi.doUnmock('../src/db/mongoose')
    vi.doUnmock('../src/realtime/socket')
  })

  it('logs fatals and exits when auto-boot fails', async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    resetMongooseModels()

    const connectSpy = vi.fn().mockRejectedValue(new Error('startup blew up'))
    const socketSpy = vi.fn()
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.doMock('../src/db/mongoose', () => ({ connectDB: connectSpy }))
    vi.doMock('../src/realtime/socket', () => ({ initSocketServer: socketSpy }))

    const cleanEnv: NodeJS.ProcessEnv = {
      ...originalEnv,
      FRONTEND_URL: 'http://frontend.test',
      NODE_ENV: 'test',
      MONGODB_URI: originalEnv.MONGODB_URI ?? 'mongodb://localhost/test',
      MONGODB_DBNAME: originalEnv.MONGODB_DBNAME ?? 'test-db'
    }
    delete cleanEnv.VITEST
    delete cleanEnv.VITEST_WORKER_ID
    process.env = cleanEnv

    await importIndex()
    await Promise.resolve()

    expect(connectSpy).toHaveBeenCalled()
    expect(socketSpy).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('Fatal error:', expect.any(Error))
    expect(exitSpy).toHaveBeenCalledWith(1)

    vi.doUnmock('../src/db/mongoose')
    vi.doUnmock('../src/realtime/socket')
  })
})
