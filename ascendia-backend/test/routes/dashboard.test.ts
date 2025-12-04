import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import dashboardRouter from '../../src/routes/dashboard'

const buildSummaryMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/services/dashboardSummary.js', () => ({
  buildDashboardSummary: buildSummaryMock
}))

function buildApp(session?: any) {
  const app = express()
  if (session !== undefined) {
    app.use((req: any, _res, next) => {
      req.session = session
      next()
    })
  }
  app.use(dashboardRouter)
  return app
}

describe('dashboard routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated users with 401', async () => {
    const app = buildApp()
    const res = await request(app).get('/dashboard')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'No autenticado' })
    expect(buildSummaryMock).not.toHaveBeenCalled()
  })

  it('returns dashboard summary for authenticated users', async () => {
    const summary = { habits: [] }
    buildSummaryMock.mockResolvedValue(summary)

    const app = buildApp({ user: { userId: 'user-99' } })

    const res = await request(app).get('/dashboard')

    expect(res.status).toBe(200)
    expect(buildSummaryMock).toHaveBeenCalledWith('user-99')
    expect(res.body).toEqual(summary)
  })
})