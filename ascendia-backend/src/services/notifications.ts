import Notification from '../models/notification'
import type { NotificationDTO, NotificationMetadata, NotificationType } from '../types/notification'
import { emitToUser } from '../realtime/socket'

const TITLE_LIMIT = 120
const MESSAGE_LIMIT = 280

function clamp(value: string, limit: number): string {
  const sanitized = String(value ?? '').trim()
  return sanitized.slice(0, limit)
}

function mapNotification(doc: any): NotificationDTO {
  return {
    id: String(doc._id),
    type: doc.type,
    title: doc.title,
    message: doc.message,
    metadata: doc.metadata ?? {},
    readAt: doc.readAt ?? null,
    read: Boolean(doc.readAt),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)
  }
}

export type CreateNotificationInput = {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: NotificationMetadata
}

export async function createNotification(input: CreateNotificationInput): Promise<NotificationDTO> {
  const doc = await Notification.create({
    user: input.userId,
    type: input.type,
    title: clamp(input.title, TITLE_LIMIT),
    message: clamp(input.message, MESSAGE_LIMIT),
    metadata: input.metadata ?? {},
    readAt: null
  })

  const dto = mapNotification(doc.toObject())
  emitToUser(input.userId, 'notification:new', dto)
  return dto
}

export async function listNotifications(userId: string, options?: { limit?: number }) {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50)
  const [items, unreadCount] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ user: userId, readAt: null })
  ])
  return {
    notifications: items.map(mapNotification),
    unreadCount
  }
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const updated = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean()

  if (updated) {
    const dto = mapNotification(updated)
    emitToUser(userId, 'notification:update', dto)
    return dto
  }

  const existing = await Notification.findOne({ _id: notificationId, user: userId }).lean()
  return existing ? mapNotification(existing) : null
}

export async function markAllNotificationsRead(userId: string) {
  const now = new Date()
  const result = await Notification.updateMany({ user: userId, readAt: null }, { $set: { readAt: now } })
  if (result.modifiedCount > 0) {
    emitToUser(userId, 'notification:bulk_read', { readAt: now })
  }
  return { updated: result.modifiedCount }
}

export async function deleteNotification(userId: string, notificationId: string) {
  const result = await Notification.deleteOne({ _id: notificationId, user: userId })
  if (result.deletedCount) {
    emitToUser(userId, 'notification:delete', { id: notificationId })
  }
  return result.deletedCount > 0
}
