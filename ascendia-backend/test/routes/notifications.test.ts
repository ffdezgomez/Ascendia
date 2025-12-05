import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import notificationsRouter from '../../src/routes/notifications'
import Notification from '../../src/models/notification'
import { listNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../../src/services/notifications'

vi.mock('../../src/services/notifications', () => ({
  listNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  deleteNotification: vi.fn()
}))

describe('notifications router', () => {
  let mongo: MongoMemoryServer
  const app = express()
  const userId = new mongoose.Types.ObjectId().toString()

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri())

    app.use(express.json())
    app.use((req: any, _res, next) => {
      if (req.headers['x-no-session']) return next()
      req.session = { user: { userId } }
      next()
    })
    app.use('/notifications', notificationsRouter)
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(500).json({ error: err?.message ?? 'error' })
    })
  }, 180000)

  afterEach(async () => {
    await Notification.deleteMany({})
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongo) {
      await mongo.stop()
    }
  }, 180000)

  it('returns stored notifications for the authenticated user', async () => {
    ;(listNotifications as any as vi.Mock).mockResolvedValue({ notifications: [{ id: 'n1', title: 'Nueva solicitud' }], unreadCount: 1 })

    const response = await request(app).get('/notifications')

    expect(response.status).toBe(200)
    expect(listNotifications).toHaveBeenCalledWith(userId, expect.objectContaining({ limit: expect.any(Number) }))
    expect(response.body.notifications).toHaveLength(1)
    expect(response.body.unreadCount).toBe(1)
    expect(response.body.notifications[0].title).toBe('Nueva solicitud')
  })

  it('returns 401 if no session user', async () => {
    const res = await request(app).get('/notifications').unset('Cookie').set('x-no-session', '1')
    expect(res.status).toBe(401)
  })

  it('marks a notification as read or 404 if missing', async () => {
    ;(markNotificationRead as any as vi.Mock).mockResolvedValueOnce({ id: 'n1' })
    const okRes = await request(app).post('/notifications/n1/read')
    expect(okRes.status).toBe(200)
    expect(okRes.body.notification).toEqual({ id: 'n1' })

    ;(markNotificationRead as any as vi.Mock).mockResolvedValueOnce(null)
    const notFound = await request(app).post('/notifications/none/read')
    expect(notFound.status).toBe(404)
  })

  it('marks all notifications as read', async () => {
    ;(markAllNotificationsRead as any as vi.Mock).mockResolvedValue({ updated: 3 })
    const res = await request(app).post('/notifications/read-all')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ updated: 3 })
  })

  it('deletes a notification or returns 404', async () => {
    ;(deleteNotification as any as vi.Mock).mockResolvedValueOnce(true)
    const ok = await request(app).delete('/notifications/n1')
    expect(ok.status).toBe(204)

    ;(deleteNotification as any as vi.Mock).mockResolvedValueOnce(false)
    const notFound = await request(app).delete('/notifications/n2')
    expect(notFound.status).toBe(404)
  })
})
