// src/config.ts
export const {
  PORT = "5000",
  SALT_ROUNDS = "10",
  SECRET_JWT_KEY = "",
  MONGODB_URI = "",
  NODE_ENV = "development",
  MONGODB_DBNAME = "ascendia-db",
  FRONTEND_URL = "http://localhost:3000",

  // === Email ===
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "465",
  SMTP_SECURE = "true",
  SMTP_USER = "",
  SMTP_PASS = "",
  EMAIL_FROM = "",

  // === OAuth ===
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  GOOGLE_REDIRECT_URI = "http://localhost:5000/auth/google/callback"
} = process.env;

export const smtpConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT ? Number(SMTP_PORT) : 465,
  secure: SMTP_SECURE === "true" || SMTP_SECURE === "1",
  auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
};

export const emailFrom = EMAIL_FROM || `Ascendia <${SMTP_USER}>`;
export const saltRoundsNum = Number(SALT_ROUNDS);