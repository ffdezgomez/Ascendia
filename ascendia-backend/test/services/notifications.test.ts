import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification
} from '../../src/services/notifications'

const createMock = vi.hoisted(() => vi.fn())
const findMock = vi.hoisted(() => vi.fn())
const countDocumentsMock = vi.hoisted(() => vi.fn())
const findOneAndUpdateMock = vi.hoisted(() => vi.fn())
const findOneMock = vi.hoisted(() => vi.fn())
const updateManyMock = vi.hoisted(() => vi.fn())
const deleteOneMock = vi.hoisted(() => vi.fn())
const emitMock = vi.hoisted(() => vi.fn())

vi.mock('../../src/models/notification', () => ({
  default: {
    create: createMock,
    find: findMock,
    countDocuments: countDocumentsMock,
    findOneAndUpdate: findOneAndUpdateMock,
    findOne: findOneMock,
    updateMany: updateManyMock,
    deleteOne: deleteOneMock
  }
}))

vi.mock('../../src/realtime/socket', () => ({
  emitToUser: emitMock
}))

function buildLeanQuery<T>(value: T) {
  const limitSpy = vi.fn().mockReturnThis()
  const sortSpy = vi.fn().mockReturnThis()
  const leanSpy = vi.fn().mockResolvedValue(value)
  return {
    sort: sortSpy,
    limit: limitSpy,
    lean: leanSpy,
    get sortSpy() {
      return sortSpy
    },
    get limitSpy() {
      return limitSpy
    }
  }
}

describe('notifications service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates notification clamping text and emits socket event', async () => {
    const longTitle = 't'.repeat(200)
    const longMessage = 'm'.repeat(400)
    createMock.mockImplementation((payload: any) => ({
      ...payload,
      _id: 'n-1',
      toObject: () => ({ ...payload, _id: 'n-1' })
    }))

    const dto = await createNotification({
      userId: 'user-1',
      type: 'friend_request_received',
      title: longTitle,
      message: longMessage,
      metadata: { foo: 'bar' }
    } as any)

    const payload = createMock.mock.calls[0][0]
    expect(payload.title.length).toBe(120)
    expect(payload.message.length).toBe(280)
    expect(emitMock).toHaveBeenCalledWith('user-1', 'notification:new', dto)
  })

  it('lists notifications with capped limit and unread count', async () => {
    const query = buildLeanQuery([
      {
        _id: 'n-1',
        type: 'generic',
        title: 'hello',
        message: 'world',
        metadata: {},
        readAt: null,
        createdAt: new Date('2024-01-02T00:00:00Z')
      }
    ])
    findMock.mockReturnValue(query)
    countDocumentsMock.mockResolvedValue(3)

    const result = await listNotifications('user-1', { limit: 100 })

    expect(query.limitSpy).toHaveBeenCalledWith(50)
    expect(result.notifications[0].id).toBe('n-1')
    expect(result.unreadCount).toBe(3)
  })

  it('marks notification read and emits update when state changes', async () => {
    const updated = {
      _id: 'n-1',
      type: 'generic',
      title: 't',
      message: 'm',
      metadata: {},
      readAt: new Date('2024-01-02T00:00:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z')
    }
    findOneAndUpdateMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) })

    const dto = await markNotificationRead('user-1', 'n-1')

    expect(dto?.read).toBe(true)
    expect(emitMock).toHaveBeenCalledWith('user-1', 'notification:update', dto)
  })

  it('returns existing notification when no update happens', async () => {
    findOneAndUpdateMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
    findOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue({
      _id: 'n-2',
      type: 'generic',
      title: 'hello',
      message: 'world',
      metadata: {},
      readAt: null,
      createdAt: new Date('2024-01-01T00:00:00Z')
    }) })

    const dto = await markNotificationRead('user-1', 'n-2')

    expect(dto?.id).toBe('n-2')
    expect(emitMock).not.toHaveBeenCalled()
  })

  it('marks all notifications read and emits bulk event when something changed', async () => {
    updateManyMock.mockResolvedValue({ modifiedCount: 2 })

    const res = await markAllNotificationsRead('user-1')

    expect(res.updated).toBe(2)
    expect(emitMock).toHaveBeenCalledWith('user-1', 'notification:bulk_read', expect.any(Object))
  })

  it('returns unchanged count when nothing was marked read', async () => {
    updateManyMock.mockResolvedValue({ modifiedCount: 0 })

    const res = await markAllNotificationsRead('user-2')

    expect(res.updated).toBe(0)
    expect(emitMock).not.toHaveBeenCalled()
  })

  it('deletes notification and emits delete event', async () => {
    deleteOneMock.mockResolvedValue({ deletedCount: 1 })

    const ok = await deleteNotification('user-1', 'n-3')

    expect(ok).toBe(true)
    expect(emitMock).toHaveBeenCalledWith('user-1', 'notification:delete', { id: 'n-3' })
  })

  it('returns false when delete does not remove anything', async () => {
    deleteOneMock.mockResolvedValue({ deletedCount: 0 })

    const ok = await deleteNotification('user-9', 'n-x')

    expect(ok).toBe(false)
    expect(emitMock).not.toHaveBeenCalled()
  })

  it('maps notification dates and null results', async () => {
    findOneAndUpdateMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })
    findOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

    const dto = await markNotificationRead('user-1', 'missing')
    expect(dto).toBeNull()

    const query = buildLeanQuery([
      { _id: 'n-4', type: 'generic', title: 't', message: 'm', metadata: null, readAt: null, createdAt: '2024-01-01T00:00:00Z' }
    ])
    findMock.mockReturnValue(query)
    countDocumentsMock.mockResolvedValue(0)

    const result = await listNotifications('user-1', { limit: 1 })
    expect(result.notifications[0].read).toBe(false)
    expect(result.notifications[0].createdAt).toBeInstanceOf(Date)
  })
})
