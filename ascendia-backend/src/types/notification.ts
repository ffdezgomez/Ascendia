import type { Document, Types } from 'mongoose'

export type NotificationType =
  | 'challenge_invite'
  | 'challenge_finish_request'
  | 'challenge_finished'
  | 'friend_request_received'
  | 'friend_request_accepted'

export type NotificationMetadata = Record<string, unknown>

export interface INotification extends Document {
  user: Types.ObjectId
  type: NotificationType
  title: string
  message: string
  metadata?: NotificationMetadata
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type NotificationDTO = {
  id: string
  type: NotificationType
  title: string
  message: string
  metadata: NotificationMetadata
  readAt: Date | null
  read: boolean
  createdAt: Date
}
