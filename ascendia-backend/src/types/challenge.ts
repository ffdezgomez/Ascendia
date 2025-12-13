import type { Document, Types } from 'mongoose'
import type { IHabitChallenge } from './habitChallenge'

export type ChallengeType = 'personal' | 'friend'

export type ChallengeStatus =
  | 'pending'
  | 'active'
  | 'pending_finish'
  | 'finished'
  | 'rejected'
  | 'cancelled'

export interface IChallenge extends Document {
  title: string
  owner: Types.ObjectId
  opponent: Types.ObjectId | null
  type: ChallengeType
  status: ChallengeStatus
  initiator: Types.ObjectId
  awaitingUser: Types.ObjectId | null
  disciplines: Array<Types.ObjectId | IHabitChallenge>
  startDate: Date
  endDate: Date | null
  ownerWantsToFinish: boolean
  opponentWantsToFinish: boolean
  createdAt: Date
  updatedAt: Date
}
