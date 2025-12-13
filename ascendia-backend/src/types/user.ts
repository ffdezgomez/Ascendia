// types/User.ts
import { Document, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;

  /** Puede ser null si el perfil no está creado aún */
  profile?: Types.ObjectId | null;

  friends: Types.ObjectId[];

  habits?: Types.ObjectId[];

  googleId?: string;

  /** Token hash almacenado para recuperación de contraseña */
  resetPasswordToken?: string | null;

  /** Fecha de expiración del token */
  resetPasswordExpires?: Date | null;

  /** Email verification */
  isVerified: boolean;
  verificationToken?: string | null;
  verificationTokenExpires?: Date | null;
}