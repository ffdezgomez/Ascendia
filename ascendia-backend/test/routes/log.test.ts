import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import logRouter from '../../src/routes/log'

const controllerMock = vi.hoisted(() => ({
  createLog: vi.fn((_req: any, res: any) => res.status(201).json({ route: 'create' })),
  getLogs: vi.fn((_req: any, res: any) => res.json({ route: 'list' })),
  getLogById: vi.fn((_req: any, res: any) => res.json({ route: 'detail' })),
  updateLog: vi.fn((_req: any, res: any) => res.json({ route: 'update' })),
  deleteLog: vi.fn((_req: any, res: any) => res.json({ route: 'delete' }))
}))

vi.mock('../../src/controllers/logController', () => controllerMock)

function buildApp(session?: any) {
  const app = express()
  app.use(express.json())
  if (session !== undefined) {
    app.use((req: any, _res, next) => {
      req.session = session
      next()
    })
  }
  app.use('/log', logRouter)
  return app
}

describe('log router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires authentication', async () => {
    const app = buildApp()
    const res = await request(app).get('/log')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No autenticado' })
    expect(controllerMock.getLogs).not.toHaveBeenCalled()
  })

  it('routes requests to the proper controller when authenticated', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })

    await request(app).post('/log').send({ habitId: 'h1' })
    await request(app).get('/log')
    await request(app).get('/log/10')
    await request(app).put('/log/10').send({ value: 20 })
    await request(app).delete('/log/10')

    expect(controllerMock.createLog).toHaveBeenCalled()
    expect(controllerMock.getLogs).toHaveBeenCalled()
    expect(controllerMock.getLogById).toHaveBeenCalled()
    expect(controllerMock.updateLog).toHaveBeenCalled()
    expect(controllerMock.deleteLog).toHaveBeenCalled()
  })
})