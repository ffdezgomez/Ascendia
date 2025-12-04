import { Router } from "express";
import crypto from "crypto";
import bcryptjs from "bcryptjs";
import User from "../models/user.js";
import { sendResetPasswordEmail } from "../services/emailService.js";
import { saltRoundsNum } from "../config.js";

const r = Router();

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * POST /auth/forgot-password
 * Body: { emailOrUsername }
 */
r.post("/forgot-password", async (req, res, next) => {
  try {
    const { emailOrUsername } = req.body ?? {};
    if (!emailOrUsername) {
      return res.status(400).json({ error: "emailOrUsername requerido" });
    }

    const emailOrUserStr = String(emailOrUsername);

    const user = await User.findOne({
      $or: [
        { email: emailOrUserStr.toLowerCase() },
        { username: emailOrUserStr },
      ],
    });

    // Respuesta siempre genérica por seguridad
    if (!user) {
      return res.json({
        message: "Si existe la cuenta, te hemos enviado un correo con instrucciones.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + 20 * 60 * 1000); // 20 min
    await user.save();

    try {
      await sendResetPasswordEmail({
        to: user.email,
        username: user.username,
        token,
      });
    } catch {
      return res.status(500).json({
        error: "No se pudo enviar el correo de recuperación. Revisa configuración SMTP.",
      });
    }

    const response: any = {
      message: "Si existe la cuenta, te hemos enviado un correo con instrucciones.",
    };

    return res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/reset-password
 * Body: { token, newPassword }
 */
r.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body ?? {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: "token y newPassword requeridos" });
    }

    const tokenHash = hashToken(String(token));

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    const hashedPassword = await bcryptjs.hash(String(newPassword), saltRoundsNum);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/verify-email
 * Body: { token }
 */
r.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body ?? {};
    if (!token) {
      return res.status(400).json({ error: "Token requerido" });
    }

    // Buscar usuario con ese token y que no haya expirado
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    // Verificar usuario
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.json({ message: "Email verificado correctamente. Ya puedes iniciar sesión." });
  } catch (err) {
    next(err);
  }
});

export default r;