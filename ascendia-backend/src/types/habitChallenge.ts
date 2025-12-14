import type { Document, Types } from 'mongoose'
import type { ChallengeType } from './challenge.js'
import type { IHabit } from './habit.js'

export type HabitChallengeSide = 'owner' | 'challenger'

export interface PendingHabitDraft {
  name: string
  type: string
  unit: string
  category?: IHabit['category']
  emoji?: string
  color?: IHabit['color']
  description?: string
}

export interface IHabitChallenge extends Document {
  owner: Types.ObjectId
  challenger: Types.ObjectId | null
  ownerHabit: Types.ObjectId
  challengerHabit: Types.ObjectId | null
  pendingChallengerHabit?: PendingHabitDraft | null
  dailyGoal: number
  type: ChallengeType
  createdAt: Date
  updatedAt: Date
}
