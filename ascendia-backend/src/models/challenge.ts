import { Schema, model } from 'mongoose'
import type { IChallenge } from '../types/challenge.js'

const ChallengeSchema = new Schema<IChallenge>({
  title: { type: String, default: '' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  opponent: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  type: { type: String, enum: ['personal', 'friend'], required: true },
  status: {
    type: String,
    enum: ['pending', 'active', 'pending_finish', 'finished', 'rejected', 'cancelled'],
    default: 'pending'
  },
  initiator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  awaitingUser: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  disciplines: [{ type: Schema.Types.ObjectId, ref: 'HabitChallenge', required: true }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, default: null },
  ownerWantsToFinish: { type: Boolean, default: false },
  opponentWantsToFinish: { type: Boolean, default: false }
}, { timestamps: true })

export default model<IChallenge>('Challenge', ChallengeSchema)
