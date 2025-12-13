import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHabit, updateHabit, deleteHabit, getHabits, getHabitById } from '../../src/controllers/habitController'

const habitModelMock = vi.hoisted(() => ({
  create: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn()
}))

const userModelMock = vi.hoisted(() => ({
  findByIdAndUpdate: vi.fn()
}))

vi.mock('../../src/models/habit', () => ({
  default: habitModelMock
}))

vi.mock('../../src/models/user', () => ({
  default: userModelMock
}))

function createMockRes() {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

function chainPopulate(value: any) {
  return {
    populate: vi.fn().mockResolvedValue(value)
  }
}

describe('habitController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a habit normalizing category and updates the user reference', async () => {
    const habitDoc = { _id: 'h1', name: 'Leer', category: 'personal' }
    habitModelMock.create.mockResolvedValue(habitDoc)
    userModelMock.findByIdAndUpdate.mockResolvedValue(null)

    const req: any = {
      currentUserId: 'user-1',
      body: {
        name: 'Leer',
        description: '30m',
        type: 'time',
        unit: 'min',
        category: 'unknown'
      }
    }
    const res = createMockRes()
    const next = vi.fn()

    await createHabit(req, res as any, next)

    expect(habitModelMock.create).toHaveBeenCalledWith({
      name: 'Leer',
      description: '30m',
      type: 'time',
      unit: 'min',
      category: 'personal',
      user: 'user-1'
    })
    expect(userModelMock.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { $push: { habits: habitDoc._id } })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(habitDoc)
    expect(next).not.toHaveBeenCalled()
  })

  it('updates a habit respecting ownership and payload fields', async () => {
    const updatedDoc = { _id: 'h42', name: 'Gym', category: 'fitness', color: 'emerald' }
    habitModelMock.findOneAndUpdate.mockResolvedValue(updatedDoc)

    const req: any = {
      currentUserId: 'user-9',
      params: { id: 'h42' },
      body: {
        category: 'fitness',
        color: 'emerald',
        unit: 'reps'
      }
    }
    const res = createMockRes()
    const next = vi.fn()

    await updateHabit(req, res as any, next)

    expect(habitModelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'h42', user: 'user-9' },
      { color: 'emerald', unit: 'reps', category: 'fitness' },
      { new: true }
    )
    expect(res.json).toHaveBeenCalledWith(updatedDoc)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 404 when deleting a habit that does not belong to the user', async () => {
    habitModelMock.findOneAndDelete.mockResolvedValue(null)

    const req: any = {
      currentUserId: 'user-3',
      params: { id: 'missing' }
    }
    const res = createMockRes()
    const next = vi.fn()

    await deleteHabit(req, res as any, next)

    expect(habitModelMock.findOneAndDelete).toHaveBeenCalledWith({ _id: 'missing', user: 'user-3' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Hábito no encontrado' })
    expect(userModelMock.findByIdAndUpdate).not.toHaveBeenCalled()
    expect(next).not.toHaveBeenCalled()
  })

  it('lists the current user habits including populated logs', async () => {
    const docs = [{ _id: 'h1' }]
    habitModelMock.find.mockReturnValue(chainPopulate(docs))

    const req: any = { currentUserId: 'user-1' }
    const res = createMockRes()
    const next = vi.fn()

    await getHabits(req, res as any, next)

    expect(habitModelMock.find).toHaveBeenCalledWith({ user: 'user-1' })
    expect(res.json).toHaveBeenCalledWith(docs)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 404 when requesting a habit that does not belong to the user', async () => {
    habitModelMock.findOne.mockReturnValue(chainPopulate(null))

    const req: any = { currentUserId: 'user-7', params: { id: 'h404' } }
    const res = createMockRes()
    const next = vi.fn()

    await getHabitById(req, res as any, next)

    expect(habitModelMock.findOne).toHaveBeenCalledWith({ _id: 'h404', user: 'user-7' })
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Hábito no encontrado o no autorizado' })
    expect(next).not.toHaveBeenCalled()
  })
})