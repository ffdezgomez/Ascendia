import { Schema, model } from "mongoose"
import type { IFriendRequest } from "../types/friendRequest.js"

const FriendRequestSchema = new Schema<IFriendRequest>({
  from: { type: Schema.Types.ObjectId, ref: "User", required: true },
  to: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, {
  timestamps: true
})

FriendRequestSchema.index({ from: 1, to: 1 }, { unique: true })

export default model<IFriendRequest>("FriendRequest", FriendRequestSchema)
