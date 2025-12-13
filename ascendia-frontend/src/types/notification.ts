export type NotificationType =
  | 'challenge_invite'
  | 'challenge_finish_request'
  | 'challenge_finished'
  | 'friend_request_received'
  | 'friend_request_accepted'

export type NotificationPayload = {
  id: string
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown>
  read: boolean
  readAt: string | null
  createdAt: string
}

export type NotificationListResponse = {
  notifications: NotificationPayload[]
  unreadCount: number
}
