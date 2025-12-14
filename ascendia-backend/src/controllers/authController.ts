// src/controllers/authController.ts
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "../models/user.js";
import type { Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";

const RESET_TOKEN_EXP_MINUTES = 30;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, // tu gmail real
    pass: process.env.MAIL_PASS, // app password de gmail
  },
});

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { emailOrUsername } = req.body;

    if (!emailOrUsername || typeof emailOrUsername !== "string") {
      return res.status(400).json({ error: "emailOrUsername es requerido" });
    }

    const value = emailOrUsername.trim().toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: value },
        { username: value },
      ],
    });

    // Por seguridad: siempre responde OK aunque no exista el usuario
    if (!user) {
      return res.json({ message: "Si existe una cuenta, te llegará un correo." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXP_MINUTES * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.FRONT_URL}/recover/reset?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await transporter.sendMail({
      from: `"Ascendia" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Recupera tu contraseña",
      html: `
        <p>Hola ${user.username},</p>
        <p>Has pedido restablecer tu contraseña.</p>
        <p>Entra aquí para cambiarla (válido ${RESET_TOKEN_EXP_MINUTES} min):</p>
        <a href="${resetLink}">${resetLink}</a>
      `,
    });

    return res.json({ message: "Correo enviado. Revisa tu bandeja." });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, newPassword, email } = req.body;

    if (!token || !newPassword || !email) {
      return res.status(400).json({ error: "token, newPassword y email son requeridos" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido o caducado" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Contraseña actualizada con éxito" });
  } catch (err) {
    next(err);
  }
}