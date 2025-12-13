import type { Types } from "mongoose";

export interface ILog extends Document {
  user: Types.ObjectId
  habit: Types.ObjectId
  date: Date
  value: number
  note?: string
}