import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLog, getLogs, deleteLog } from '../../src/controllers/logController'

const habitModelMock = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
  updateMany: vi.fn()
}))

const logModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn()
}))

vi.mock('../../src/models/habit', () => ({
  default: habitModelMock
}))

vi.mock('../../src/models/log', () => ({
  default: logModelMock
}))

function createRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('logController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    logModelMock.findOne.mockResolvedValue(null)
    logModelMock.findOneAndUpdate.mockResolvedValue(null)
  })

  it('requires habitId when creating log', async () => {
    const req: any = { currentUserId: 'u1', body: { value: 1 } }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'habitId es requerido' })
    expect(next).not.toHaveBeenCalled()
  })

  it('forwards errors from habit lookup', async () => {
    const boom = new Error('db')
    habitModelMock.findOne.mockRejectedValue(boom)

    const req: any = { currentUserId: 'u1', body: { habitId: 'h1', value: 1 } }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(next).toHaveBeenCalledWith(boom)
  })

  it('rejects non-positive or invalid values', async () => {
    habitModelMock.findOne.mockResolvedValue({ _id: 'h1', type: 'number' })

    const req: any = { currentUserId: 'u1', body: { habitId: 'h1', value: 'abc' } }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'value debe ser un número positivo' })
  })

  it('rejects invalid dates', async () => {
    habitModelMock.findOne.mockResolvedValue({ _id: 'h1', type: 'number' })

    const req: any = { currentUserId: 'u1', body: { habitId: 'h1', value: 2, date: 'bad' } }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Fecha inválida' })
  })

  it('validates habit existence before creating a log', async () => {
    habitModelMock.findOne.mockResolvedValue(null)

    const req: any = {
      currentUserId: 'user-55',
      body: { habitId: 'h1', value: 10 }
    }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(habitModelMock.findOne).toHaveBeenCalledWith({ _id: 'h1', user: 'user-55' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Hábito no encontrado' })
    expect(logModelMock.create).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('creates a log converting values to numbers and pushes into the habit', async () => {
    habitModelMock.findOne.mockResolvedValue({ _id: 'h2', type: 'number' })
    const createdLog = { _id: 'log1' }
    logModelMock.create.mockResolvedValue(createdLog)
    habitModelMock.updateOne.mockResolvedValue(null)

    const req: any = {
      currentUserId: 'user-99',
      body: { habitId: 'h2', value: '15.5', note: 'ok' }
    }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(logModelMock.create).toHaveBeenCalledWith(expect.objectContaining({
      user: 'user-99',
      habit: 'h2',
      value: 15.5,
      note: 'ok'
    }))
    expect(habitModelMock.updateOne).toHaveBeenCalledWith(
      { _id: 'h2', user: 'user-99' },
      { $push: { logs: createdLog._id } }
    )
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(createdLog)
    expect(next).not.toHaveBeenCalled()
  })

  it('prevents duplicate boolean logs within the same day', async () => {
    habitModelMock.findOne.mockResolvedValue({ _id: 'hb', type: 'boolean' })
    logModelMock.findOne.mockResolvedValue({ _id: 'existing-log' })

    const req: any = {
      currentUserId: 'user-10',
      body: { habitId: 'hb', value: 1 }
    }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(logModelMock.create).not.toHaveBeenCalled()
    expect(logModelMock.findOneAndUpdate).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ error: 'Este hábito ya fue registrado hoy' })
  })

  it('updates existing numeric log instead of creating a new entry', async () => {
    habitModelMock.findOne.mockResolvedValue({ _id: 'hn', type: 'number' })
    logModelMock.findOne.mockResolvedValue({ _id: 'log-xyz' })
    const updatedDoc = { _id: 'log-xyz', value: 22 }
    logModelMock.findOneAndUpdate.mockResolvedValue(updatedDoc)

    const req: any = {
      currentUserId: 'user-20',
      body: { habitId: 'hn', value: 22 }
    }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(logModelMock.create).not.toHaveBeenCalled()
    expect(habitModelMock.updateOne).not.toHaveBeenCalled()
    expect(logModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'log-xyz' },
      expect.objectContaining({ value: 22 }),
      { new: true }
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith(updatedDoc)
  })

  it('updates existing numeric log and keeps note when provided', async () => {
    habitModelMock.findOne.mockResolvedValue({ _id: 'hn', type: 'number' })
    logModelMock.findOne.mockResolvedValue({ _id: 'log-note' })
    const updatedDoc = { _id: 'log-note', value: 10, note: 'hi' }
    logModelMock.findOneAndUpdate.mockResolvedValue(updatedDoc)

    const req: any = {
      currentUserId: 'user-21',
      body: { habitId: 'hn', value: 10, note: 'hi' }
    }
    const res = createRes()
    const next = vi.fn()

    await createLog(req, res as any, next)

    expect(logModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'log-note' },
      expect.objectContaining({ value: 10, note: 'hi' }),
      { new: true }
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('retrieves logs filtered by habit when query parameter is present', async () => {
    const docs = [{ _id: 'l1' }]
    const sortMock = vi.fn().mockResolvedValue(docs)
    logModelMock.find.mockReturnValue({ sort: sortMock })

    const req: any = {
      currentUserId: 'user-5',
      query: { habit: 'habit-10' }
    }
    const res = createRes()
    const next = vi.fn()

    await getLogs(req, res as any, next)

    expect(logModelMock.find).toHaveBeenCalledWith({ user: 'user-5', habit: 'habit-10' })
    expect(sortMock).toHaveBeenCalledWith({ date: -1 })
    expect(res.json).toHaveBeenCalledWith(docs)
    expect(next).not.toHaveBeenCalled()
  })

  it('filters logs by day when a day query is provided', async () => {
    const docs = []
    const sortMock = vi.fn().mockResolvedValue(docs)
    logModelMock.find.mockReturnValue({ sort: sortMock })

    const req: any = {
      currentUserId: 'user-7',
      query: { habit: 'habit-77', day: '2025-01-05T10:00:00.000Z' }
    }
    const res = createRes()
    const next = vi.fn()

    await getLogs(req, res as any, next)

    expect(logModelMock.find).toHaveBeenCalled()
    const filterArg = logModelMock.find.mock.calls[0][0]
    expect(filterArg).toMatchObject({ user: 'user-7', habit: 'habit-77' })
    expect(filterArg.date).toEqual({
      $gte: expect.any(Date),
      $lt: expect.any(Date)
    })
    expect(sortMock).toHaveBeenCalledWith({ date: -1 })
  })

  it('retrieves logs without filters when no query provided', async () => {
    const docs = [{ _id: 'l2' }]
    const sortMock = vi.fn().mockResolvedValue(docs)
    logModelMock.find.mockReturnValue({ sort: sortMock })

    const req: any = { currentUserId: 'user-8', query: {} }
    const res = createRes()
    const next = vi.fn()

    await getLogs(req, res as any, next)

    expect(logModelMock.find).toHaveBeenCalledWith({ user: 'user-8' })
    expect(res.json).toHaveBeenCalledWith(docs)
  })

  it('returns 404 when reading a missing log', async () => {
    logModelMock.findOne.mockResolvedValue(null)

    const req: any = { currentUserId: 'u1', params: { id: 'missing' } }
    const res = createRes()
    const next = vi.fn()

    const { getLogById } = await import('../../src/controllers/logController')
    await getLogById(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Log no encontrado' })
  })

  it('returns a log when it exists', async () => {
    const logDoc = { _id: 'log-1' }
    logModelMock.findOne.mockResolvedValue(logDoc)

    const req: any = { currentUserId: 'u1', params: { id: 'log-1' } }
    const res = createRes()
    const next = vi.fn()

    const { getLogById } = await import('../../src/controllers/logController')
    await getLogById(req, res as any, next)

    expect(res.json).toHaveBeenCalledWith(logDoc)
  })

  it('returns 404 when deleting a missing log', async () => {
    logModelMock.findOneAndDelete.mockResolvedValue(null)

    const req: any = { currentUserId: 'u1', params: { id: 'missing' } }
    const res = createRes()
    const next = vi.fn()

    await deleteLog(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Log no encontrado' })
  })

  it('forwards errors when deleting', async () => {
    const boom = new Error('delete')
    logModelMock.findOneAndDelete.mockRejectedValue(boom)

    const req: any = { currentUserId: 'u1', params: { id: 'log-err' } }
    const res = createRes()
    const next = vi.fn()

    await deleteLog(req, res as any, next)

    expect(next).toHaveBeenCalledWith(boom)
  })

  it('updates a log and returns it when found', async () => {
    const updated = { _id: 'log-10', value: 5 }
    logModelMock.findOneAndUpdate.mockResolvedValue(updated)

    const req: any = { currentUserId: 'u2', params: { id: 'log-10' }, body: { value: 5 } }
    const res = createRes()
    const next = vi.fn()

    const { updateLog } = await import('../../src/controllers/logController')
    await updateLog(req, res as any, next)

    expect(logModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'log-10', user: 'u2' },
      { date: undefined, value: 5, note: undefined },
      { new: true }
    )
    expect(res.json).toHaveBeenCalledWith(updated)
  })

  it('returns 404 when updating a missing log', async () => {
    logModelMock.findOneAndUpdate.mockResolvedValue(null)

    const req: any = { currentUserId: 'u2', params: { id: 'log-404' }, body: {} }
    const res = createRes()
    const next = vi.fn()

    const { updateLog } = await import('../../src/controllers/logController')
    await updateLog(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Log no encontrado' })
  })

  it('removes logs and cleans up references when deleting', async () => {
    const logDoc = { _id: 'log-20' }
    logModelMock.findOneAndDelete.mockResolvedValue(logDoc)
    habitModelMock.updateMany.mockResolvedValue(null)

    const req: any = {
      currentUserId: 'user-1',
      params: { id: 'log-20' }
    }
    const res = createRes()
    const next = vi.fn()

    await deleteLog(req, res as any, next)

    expect(logModelMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'log-20', user: 'user-1' })
    expect(habitModelMock.updateMany).toHaveBeenCalledWith({ logs: logDoc._id }, { $pull: { logs: logDoc._id } })
    expect(res.json).toHaveBeenCalledWith({ success: true })
    expect(next).not.toHaveBeenCalled()
  })
})