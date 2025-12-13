import { Schema, model } from "mongoose"
import type { ILog } from "../types/log"

const LogSchema = new Schema<ILog>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  habit: { type: Schema.Types.ObjectId, ref: 'Habit', required: true },
  date: { type: Date, required: true },
  value: { type: Number, required: true },
  note: { type: String },
}, { strict: true })

export default model<ILog>("Log", LogSchema)
