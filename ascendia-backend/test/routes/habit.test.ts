import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import habitRouter from '../../src/routes/habit'

const controllerMock = vi.hoisted(() => ({
  createHabit: vi.fn((_req: any, res: any) => res.status(201).json({ route: 'create' })),
  getHabits: vi.fn((_req: any, res: any) => res.json({ route: 'list' })),
  getHabitById: vi.fn((_req: any, res: any) => res.json({ route: 'detail' })),
  updateHabit: vi.fn((_req: any, res: any) => res.json({ route: 'update' })),
  deleteHabit: vi.fn((_req: any, res: any) => res.json({ route: 'delete' }))
}))

vi.mock('../../src/controllers/habitController', () => controllerMock)

function buildApp(session?: any) {
  const app = express()
  app.use(express.json())
  if (session !== undefined) {
    app.use((req: any, _res, next) => {
      req.session = session
      next()
    })
  }
  app.use('/habit', habitRouter)
  return app
}

describe('habit router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated access', async () => {
    const app = buildApp()
    const res = await request(app).get('/habit')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No autenticado' })
    expect(controllerMock.getHabits).not.toHaveBeenCalled()
  })

  it('delegates to controller handlers when authenticated', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })

    await request(app).post('/habit').send({ name: 'Read' })
    await request(app).get('/habit')
    await request(app).get('/habit/123')
    await request(app).put('/habit/123').send({ name: 'Gym' })
    await request(app).delete('/habit/123')

    expect(controllerMock.createHabit).toHaveBeenCalled()
    expect(controllerMock.getHabits).toHaveBeenCalled()
    expect(controllerMock.getHabitById).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything())
    expect(controllerMock.updateHabit).toHaveBeenCalled()
    expect(controllerMock.deleteHabit).toHaveBeenCalled()
  })
})