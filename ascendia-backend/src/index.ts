import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'node:http'

import { PORT, SECRET_JWT_KEY, FRONTEND_URL, NODE_ENV } from './config.js'
import { connectDB } from './db/mongoose.js'
import { UserRepository } from './models/user.js'
import { sendVerificationEmail } from './services/emailService.js'
import { initSocketServer } from './realtime/socket.js'

import profileRouter from './routes/profile.js'
import dashboardRouter from './routes/dashboard.js'
import friendsRouter from './routes/friends.js'
import habitRouter from './routes/habit.js'
import logRouter from './routes/log.js'
import metricsRouter from './routes/metrics.js'
import authRouter from './routes/auth.js'
import challengesRouter from './routes/challenges.js'
import oauthRouter from './routes/oauth.js'
import notificationsRouter from './routes/notifications.js'

// Esto dejarlo, es para que el usuario pueda subir la imagen de perfil
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// ================== CORS ==================
const allowedOrigins = new Set<string>(
  [
    FRONTEND_URL,
    process.env.CORS_ALLOWED_ORIGINS,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000'
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(','))
    .map(origin => origin.trim())
    .filter(Boolean)
)
  const allowedOriginsArray = Array.from(allowedOrigins)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`Origin ${origin} no permitido`))
  },
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

// Permitir prefix /api en modo desarrollo (proxy CRA)
app.use((req, _res, next) => {
  if (req.url === '/api') {
    req.url = '/'
  } else if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4) || '/'
  }
  next()
})

// ================== AUTH MIDDLEWARE ==================
app.use((req: any, _res, next) => {
  const token = req.cookies?.access_token
  req.session = { user: null }

  if (token) {
    try {
      const data = jwt.verify(token, SECRET_JWT_KEY) as any
      req.session.user = data
    } catch {
      req.session.user = null
    }
  }

  next()
})

// ================== ENDPOINTS BASE ==================
app.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body
    const newUser = await UserRepository.create({ username, email, password })

    // Enviar correo de verificación
    if (newUser.verificationToken) {
      try {
        await sendVerificationEmail({
          to: newUser.email,
          username: newUser.username,
          token: newUser.verificationToken
        })
      } catch (err) {
        console.error('Error enviando verificación:', err)
      }
    }

    res.status(201).json({
      ...newUser,
      message: 'Usuario creado. Por favor verifica tu correo electrónico.'
    })
  } catch (error) {
    next(error)
  }
})

app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body
    const user = await UserRepository.login({ username, password })

    // Verificar si el email está verificado
    const User = (await import('./models/user.js')).default
    const fullUser = await User.findById(user._id)

    if (!fullUser?.isVerified) {
      return res.status(403).json({ error: 'Por favor verifica tu correo electrónico antes de iniciar sesión.' })
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      SECRET_JWT_KEY,
      { expiresIn: '1h' }
    )

    res
      .cookie('access_token', token, {
        httpOnly: true,
        secure: NODE_ENV === 'production', // HTTPS SOLO en prod
        sameSite: 'lax',                  // evita problemas en dev
        maxAge: 1000 * 60 * 60
      })
      .status(200)
      .json({ user, token })
  } catch (error) {
    next(error)
  }
})

// ================== ROUTERS ==================
app.use('/auth', authRouter)
app.use('/auth', oauthRouter)
app.use(profileRouter)
app.use(dashboardRouter)
app.use(friendsRouter)
app.use('/habit', habitRouter)
app.use('/log', logRouter)
app.use('/metrics', metricsRouter)
app.use('/challenges', challengesRouter)
app.use('/notifications', notificationsRouter)

// ================== LOGOUT ==================
app.post('/logout', (_req, res) => {
  res.clearCookie('access_token').json({
    success: true,
    message: 'Sesión cerrada'
  })
})

// ================== STATIC UPLOADS ==================
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ================== ERROR HANDLER ==================
app.use((error: unknown, _req: any, res: any, _next: any) => {
  // Zod
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: 'errors' in error ? (error as any).errors : undefined
    })
  }

  // Mongo duplicate
  if (error && typeof error === 'object' && 'code' in error && (error as any).code === 11000) {
    const field =
      'keyPattern' in error
        ? Object.keys((error as any).keyPattern)[0]
        : 'campo'
    return res.status(409).json({ error: `${field} ya está en uso` })
  }

  // Mongoose validation
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: (error as any).message
    })
  }

  // DB connection errors
  if (
    error &&
    typeof error === 'object' &&
    'name' in error &&
    ((error as any).name === 'MongoNetworkError' || (error as any).name === 'MongoServerError')
  ) {
    console.error('Error de BD:', error)
    return res.status(503).json({ error: 'Servicio temporalmente no disponible' })
  }

  // Generic
  console.error('Error inesperado:', error)
  return res.status(500).json({
    error: (error as any)?.message ?? 'Error interno'
  })
})

// ================== START ==================
export async function start() {
  await connectDB()
  const server = http.createServer(app)
  initSocketServer(server, { allowedOrigins: allowedOriginsArray })
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`)
  })
}

const isVitest = process.env.VITEST === 'true' || process.env.VITEST_WORKER_ID !== undefined

if (!isVitest) {
  start().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}

export { app }