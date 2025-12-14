import { Schema, model } from 'mongoose'
import type { IHabitComparison } from '../types/habitComparison.js'

const HabitComparisonSchema = new Schema<IHabitComparison>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  friend: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ownerHabit: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
  friendHabit: { type: Schema.Types.ObjectId, ref: 'Habit', required: true }
}, { timestamps: true })

HabitComparisonSchema.index({ owner: 1, friend: 1, ownerHabit: 1, friendHabit: 1 }, { unique: true })

export default model<IHabitComparison>('HabitComparison', HabitComparisonSchema)
