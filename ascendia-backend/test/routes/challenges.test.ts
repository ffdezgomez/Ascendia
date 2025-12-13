import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import challengesRouter from '../../src/routes/challenges'

const controllerMock = vi.hoisted(() => ({
  getChallenges: vi.fn((_req: any, res: any) => res.json({ ok: true })),
  getChallenge: vi.fn((_req: any, res: any) => res.json({ ok: true })),
  createChallengeHandler: vi.fn((_req: any, res: any) => res.status(201).json({})),
  respondChallengeHandler: vi.fn((_req: any, res: any) => res.json({})),
  requestFinishHandler: vi.fn((_req: any, res: any) => res.json({})),
  declineFinishHandler: vi.fn((_req: any, res: any) => res.json({})),
  deleteChallengeHandler: vi.fn((_req: any, res: any) => res.status(204).send())
}))

vi.mock('../../src/controllers/challengeController', () => controllerMock)

function buildApp(session?: any) {
  const app = express()
  app.use(express.json())
  if (session !== undefined) {
    app.use((req: any, _res, next) => {
      req.session = session
      next()
    })
  }
  app.use('/challenges', challengesRouter)
  return app
}

describe('challenges router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests', async () => {
    const app = buildApp()
    const res = await request(app).get('/challenges')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No autenticado' })
    expect(controllerMock.getChallenges).not.toHaveBeenCalled()
  })

  it('delegates to controller when authenticated', async () => {
    const app = buildApp({ user: { userId: 'user-1' } })

    await request(app).get('/challenges')
    await request(app).get('/challenges/abc')
    await request(app).post('/challenges').send({})
    await request(app).post('/challenges/abc/respond').send({ action: 'accept' })
    await request(app).post('/challenges/abc/finish')
    await request(app).post('/challenges/abc/finish/decline')
    await request(app).delete('/challenges/abc')

    expect(controllerMock.getChallenges).toHaveBeenCalled()
    expect(controllerMock.getChallenge).toHaveBeenCalled()
    expect(controllerMock.createChallengeHandler).toHaveBeenCalled()
    expect(controllerMock.respondChallengeHandler).toHaveBeenCalled()
    expect(controllerMock.requestFinishHandler).toHaveBeenCalled()
    expect(controllerMock.declineFinishHandler).toHaveBeenCalled()
    expect(controllerMock.deleteChallengeHandler).toHaveBeenCalled()
  })
})
