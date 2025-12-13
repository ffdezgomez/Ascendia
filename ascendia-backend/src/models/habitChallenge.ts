import { Schema, model } from 'mongoose'
import type { IHabitChallenge } from '../types/habitChallenge'

const PendingHabitSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  unit: { type: String, required: true },
  category: { type: String, default: 'personal' },
  emoji: { type: String, default: '' },
  color: { type: String, default: 'zinc' },
  description: { type: String }
}, { _id: false })

const HabitChallengeSchema = new Schema<IHabitChallenge>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  challenger: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  ownerHabit: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
  challengerHabit: { type: Schema.Types.ObjectId, ref: 'Habit', default: null },
  pendingChallengerHabit: { type: PendingHabitSchema, default: null },
  dailyGoal: { type: Number, required: true },
  type: { type: String, enum: ['personal', 'friend'], required: true }
}, { timestamps: true })

export default model<IHabitChallenge>('HabitChallenge', HabitChallengeSchema)
