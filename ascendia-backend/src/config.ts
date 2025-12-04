// src/config.ts
export const {
  PORT = "5000",
  SALT_ROUNDS = "10",
  SECRET_JWT_KEY = "2e6037bd4c21449adc9177194b94fb602edf5ed44733f0812aca5b3b7a09c54e",
  MONGODB_URI = "mongodb+srv://admin:spqr1453@ascendiadb.ayvxbwm.mongodb.net",
  NODE_ENV = "development",
  MONGODB_DBNAME = "ascendia-db",
  FRONTEND_URL = "http://localhost:3000",

  // === Email ===
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = "465",
  SMTP_SECURE = "true",
  SMTP_USER = "pruebareact02@gmail.com",
  SMTP_PASS = "xonsduxskfzppdyc",
  EMAIL_FROM = "Ascendia <pruebareact02@gmail.com>",

  // === OAuth ===
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
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