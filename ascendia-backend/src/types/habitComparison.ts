import type { Document, Types } from 'mongoose'

export interface IHabitComparison extends Document {
  owner: Types.ObjectId
  friend: Types.ObjectId
  ownerHabit: Types.ObjectId
  friendHabit: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
