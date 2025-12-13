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