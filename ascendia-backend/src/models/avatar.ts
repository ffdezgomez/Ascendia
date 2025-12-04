import { Schema, model } from "mongoose";

export interface IAvatar {
    user: Schema.Types.ObjectId;
    data: Buffer;
    contentType: string;
}

const AvatarSchema = new Schema<IAvatar>({
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
});

export default model<IAvatar>("Avatar", AvatarSchema);
