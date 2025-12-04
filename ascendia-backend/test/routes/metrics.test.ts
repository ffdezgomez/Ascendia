import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import mongoose, { model } from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { app } from '../../src/index'
import Habit from '../../src/models/habit.js'
import Log from '../../src/models/log.js'
import { UserRepository } from '../../src/models/user'

describe('Metrics API Integration Tests', () => {
  let authCookie: string
  let userId: string
  let habitId: string
  let testUser
  let mongo: MongoMemoryServer

  beforeAll(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-05-15T12:00:00Z'))

    mongo = await MongoMemoryServer.create()
    await mongoose.connect(mongo.getUri(), { dbName: 'metrics-tests' })

    const username = 'testall_BOX'
    const email = `${username}@matrix.com`
    testUser = await UserRepository.create({
      username,
      email,
      password: 'Password123'
    })
    userId = testUser._id
    const loginRes = await request(app)
      .post('/login')
      .send({ username: testUser.username, password: 'Password123' })

    authCookie = loginRes.headers['set-cookie'][0]
  }, 180000)

  afterAll(async () => {
    vi.useRealTimers()
    const User = model('User')
    await User.deleteOne({ _id: userId })
    await Habit.deleteMany({ user: userId })
    await Log.deleteMany({ habit: habitId })
    await mongoose.disconnect()
    if (mongo) {
      await mongo.stop()
    }
  }, 180000)

  beforeEach(async () => {
    await Log.deleteMany({ habit: habitId });
    await Habit.deleteMany({ user: userId });
      const habitRes = await request(app)
    .post('/habit')
    .set('Cookie', authCookie)
    .send({
      name: 'Ejercicio',
      description: 'Cardio diario',
      type: 'numeric',
      unit: 'minutos'
    });
  habitId = habitRes.body._id;
    // Crear algunos logs
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const twoDaysAgo = new Date(today)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    await request(app)
      .post('/log')
      .set('Cookie', authCookie)
      .send({
        habitId,
        date: twoDaysAgo.toISOString(),
        value: 30,
        note: 'Día 1'
      })

    await request(app)
      .post('/log')
      .set('Cookie', authCookie)
      .send({
        habitId,
        date: yesterday.toISOString(),
        value: 45,
        note: 'Día 2'
      })

    await request(app)
      .post('/log')
      .set('Cookie', authCookie)
      .send({
        habitId,
        date: today.toISOString(),
        value: 60,
        note: 'Día 3'
      })
  })

  describe('GET /metrics/habit/:habitId', () => {
    it('debe retornar métricas de un hábito', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}?period=7d`)
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body).toMatchObject({
        habitId,
        habitName: 'Ejercicio',
        period: '7d',
        metrics: {
          totalLogs: 3,
          totalValue: 135,
          avgValue: 45,
          maxValue: 60,
          minValue: 30,
          currentStreak: 3,
          longestStreak: 3
        }
      })

      expect(res.body.chartData).toBeInstanceOf(Array)
      expect(res.body.chartData.length).toBeGreaterThan(0)
    })

    it('debe aceptar diferentes períodos', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}?period=30d`)
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body.period).toBe('30d')
    })

    it('debe retornar 404 para hábito inexistente', async () => {
      const res = await request(app)
        .get('/metrics/habit/507f1f77bcf86cd799439011')
        .set('Cookie', authCookie)
        .expect(404)

      expect(res.body.error).toBe('Hábito no encontrado')
    })

    it('debe retornar 401 sin autenticación', async () => {
      await request(app)
        .get(`/metrics/habit/${habitId}`)
        .expect(401)
    })

    it('debe calcular tasa de completado correctamente', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}?period=7d`)
        .set('Cookie', authCookie)
        .expect(200)

      // 3 días únicos de 7 = ~43%
      expect(res.body.metrics.completionRate).toBeGreaterThan(40)
      expect(res.body.metrics.completionRate).toBeLessThan(45)
    })
  })

  describe('GET /metrics/habits', () => {
    it('debe retornar resumen de todos los hábitos', async () => {
      const res = await request(app)
        .get('/metrics/habits?period=7d')
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body).toMatchObject({
        period: '7d',
        summary: {
          totalHabits: 1,
          totalLogs: 3,
          mostActive: {
            habitName: 'Ejercicio',
            totalLogs: 3
          }
        }
      })

      expect(res.body.habits).toBeInstanceOf(Array)
      expect(res.body.habits[0]).toMatchObject({
        habitName: 'Ejercicio',
        totalLogs: 3,
        avgValue: 45,
        streak: 3
      })
    })

    it('debe manejar múltiples hábitos', async () => {
      // Crear segundo hábito
      const habit2Res = await request(app)
        .post('/habit')
        .set('Cookie', authCookie)
        .send({
          name: 'Lectura',
          type: 'numeric',
          unit: 'páginas'
        })

      const habit2Id = habit2Res.body._id

      // Crear log para segundo hábito
      await request(app)
        .post('/log')
        .set('Cookie', authCookie)
        .send({
          habitId: habit2Id,
          date: new Date().toISOString(),
          value: 20
        })

      const res = await request(app)
        .get('/metrics/habits')
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body.summary.totalHabits).toBe(2)
      expect(res.body.summary.totalLogs).toBe(4)
      expect(res.body.habits).toHaveLength(2)
    })

    it('debe retornar estructura vacía si no hay hábitos', async () => {
      // Eliminar el hábito creado
      await Habit.deleteMany({ user: userId })

      const res = await request(app)
        .get('/metrics/habits')
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body).toMatchObject({
        summary: {
          totalHabits: 0,
          totalLogs: 0,
          mostActive: null
        },
        habits: []
      })
    })
  })

  describe('GET /metrics/habit/:habitId/compare', () => {
    it('debe comparar métricas semanales y mensuales', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}/compare`)
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body).toMatchObject({
        habitId,
        habitName: 'Ejercicio',
        thisWeek: {
          count: expect.any(Number),
          total: expect.any(Number)
        },
        lastWeek: {
          count: expect.any(Number),
          total: expect.any(Number)
        },
        thisMonth: {
          count: expect.any(Number),
          total: expect.any(Number)
        },
        trend: expect.any(Number)
      })
    })

    it('debe calcular tendencia positiva', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}/compare`)
        .set('Cookie', authCookie)
        .expect(200)

      // Esta semana tiene 3 logs, semana pasada 0, tendencia = 100%
      expect(res.body.trend).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Validación de períodos', () => {
    it('debe usar 7d por defecto si no se especifica período', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}`)
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body.period).toBe('7d')
    })

    it('debe aceptar período 30d', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}?period=30d`)
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body.period).toBe('30d')
      expect(res.body.chartData.length).toBeGreaterThanOrEqual(7)
    })

    it('debe aceptar período 90d', async () => {
      const res = await request(app)
        .get(`/metrics/habit/${habitId}?period=90d`)
        .set('Cookie', authCookie)
        .expect(200)

      expect(res.body.period).toBe('90d')
    })
  })
})