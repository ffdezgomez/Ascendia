// models/Profile.ts
import { Schema, model } from "mongoose"
import type { IProfile } from "../types/profile"

const ProfileSchema = new Schema<IProfile>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  avatar: { type: String, default: "" },
  bio: { type: String, maxlength: 200 },
  habits: [{ type: String }],
  stats: {
    readingHours: { type: Number, default: 0 },
    workoutHours: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
  }
})

export default model<IProfile>("Profile", ProfileSchema)