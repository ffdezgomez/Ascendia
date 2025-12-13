import { Document, Types } from 'mongoose'

export interface IProfile extends Document {
  user: Types.ObjectId
  avatar: string
  bio: string
  habits: string[]
  stats: {
    readingHours: number
    workoutHours: number
    streak: number
  }
}
