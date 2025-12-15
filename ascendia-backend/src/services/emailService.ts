// src/services/emailService.ts
import nodemailer from "nodemailer";
import { smtpConfig, emailFrom, FRONTEND_URL, NODE_ENV } from "../config.js";

type ResetEmailArgs = {
  to: string;
  username: string;
  token: string;
};

function createTransporter() {
  // Si falta config, lo dejamos claro con error controlado.
  if (!smtpConfig.host || !smtpConfig.auth?.user || !smtpConfig.auth?.pass) {
    throw new Error(
      "SMTP no configurado. Revisa SMTP_HOST/SMTP_USER/SMTP_PASS en .env"
    );
  }

  return nodemailer.createTransport({
    ...smtpConfig,
    // Evita que la petición HTTP se quede colgada si SMTP no responde.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export async function sendResetPasswordEmail({ to, username, token }: ResetEmailArgs) {
  const transporter = createTransporter();

  const resetUrl = `${FRONTEND_URL}/recover/reset?token=${token}`;

  const subject = "Recuperación de contraseña - Ascendia";
  const text = `
Hola ${username},

Has solicitado restablecer tu contraseña.

Enlace para cambiarla:
${resetUrl}

Este enlace caduca en 20 minutos.
Si no fuiste tú, ignora este correo.

— Ascendia
`.trim();

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial; line-height:1.5; color:#111;">
    <h2 style="margin:0 0 8px;">Hola ${username} 👋</h2>
    <p>Has solicitado restablecer tu contraseña.</p>
    <p>
      <a href="${resetUrl}" 
         style="display:inline-block;padding:10px 14px;border-radius:10px;background:#111;color:#fff;text-decoration:none;">
        Restablecer contraseña
      </a>
    </p>
    <p style="font-size:12px;color:#555;margin-top:14px;">
      Este enlace caduca en 20 minutos. Si no fuiste tú, ignora este correo.
    </p>
    <p style="margin-top:18px;font-size:12px;color:#777;">— Ascendia</p>
  </div>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      text,
      html,
    });

    if (NODE_ENV !== "production") {
      console.log("[email] Reset enviado:", info.messageId);
    }

    return info;
  } catch (err) {
    console.error("[email] Error enviando reset:", err);
    throw err;
  }
}

export async function sendVerificationEmail({ to, username, token }: { to: string; username: string; token: string }) {
  const transporter = createTransporter();

  // URL del frontend para verificar
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

  const subject = "Verifica tu correo - Ascendia";
  const text = `
Hola ${username},

Gracias por registrarte en Ascendia.
Para activar tu cuenta, por favor verifica tu correo electrónico haciendo clic en el siguiente enlace:

${verifyUrl}

Este enlace caduca en 24 horas.

— Ascendia
`.trim();

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial; line-height:1.5; color:#111;">
    <h2 style="margin:0 0 8px;">Bienvenido a Ascendia, ${username} 🚀</h2>
    <p>Gracias por registrarte. Para activar tu cuenta, verifica tu correo electrónico.</p>
    <p>
      <a href="${verifyUrl}" 
         style="display:inline-block;padding:10px 14px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none;">
        Verificar mi correo
      </a>
    </p>
    <p style="font-size:12px;color:#555;margin-top:14px;">
      Este enlace caduca en 24 horas.
    </p>
    <p style="margin-top:18px;font-size:12px;color:#777;">— Ascendia</p>
  </div>
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      text,
      html,
    });

    if (NODE_ENV !== "production") {
      console.log("[email] Verificación enviada:", info.messageId);
      console.log("[email] URL:", verifyUrl);
    }

    return info;
  } catch (err) {
    console.error("[email] Error enviando verificación:", err);
    throw err;
  }
}