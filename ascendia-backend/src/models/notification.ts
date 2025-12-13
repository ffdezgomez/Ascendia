import { Schema, model } from 'mongoose'
import type { INotification } from '../types/notification'

const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['challenge_invite', 'challenge_finish_request', 'challenge_finished', 'friend_request_received', 'friend_request_accepted'],
    required: true
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  readAt: { type: Date, default: null }
}, {
  timestamps: true
})

NotificationSchema.index({ user: 1, createdAt: -1 })
NotificationSchema.index({ user: 1, readAt: 1, createdAt: -1 })

export default model<INotification>('Notification', NotificationSchema)
