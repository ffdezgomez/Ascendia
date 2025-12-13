import { Schema, model } from "mongoose";
import type { IHabit } from "../types/habit"

const HabitSchema = new Schema<IHabit>({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  unit: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  logs: [{ type: Schema.Types.ObjectId, ref: 'Log' }],
  category: {
    type: String,
    enum: [
      'fitness',
      'study',
      'health',
      'personal',
      'work',
      'creativity',
      'spirituality',
      'home',
    ],
    default: 'personal',
  },
  emoji: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    enum: [
      'zinc',
      'emerald',
      'sky',
      'amber',
      'violet',
      'rose',
      'teal',
      'indigo',
      'lime',
      'orange',
    ],
    default: 'zinc',
  },
}, { strict: true });

export default model<IHabit>('Habit', HabitSchema);