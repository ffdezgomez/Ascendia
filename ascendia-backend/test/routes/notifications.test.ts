import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import notificationsRouter from '../../src/routes/notifications'
import Notification from '../../src/models/notification'

describe('notifications router', () => {
  let mongo: MongoMemoryServer
  const app = express()
  const userId = new mongoose.Types.ObjectId().toString()

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri())

    app.use(express.json())
    app.use((req: any, _res, next) => {
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
    await Notification.create({
      user: userId,
      type: 'friend_request_received',
      title: 'Nueva solicitud',
      message: 'Tienes una invitación pendiente',
      metadata: {},
      readAt: null
    })

    const response = await request(app).get('/notifications')

    expect(response.status).toBe(200)
    expect(response.body.notifications).toHaveLength(1)
    expect(response.body.unreadCount).toBe(1)
    expect(response.body.notifications[0].title).toBe('Nueva solicitud')
  })
})
