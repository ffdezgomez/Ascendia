import { Document, Types } from "mongoose"

export interface IFriendRequest extends Document {
  from: Types.ObjectId
  to: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}
