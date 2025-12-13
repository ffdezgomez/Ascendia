import type { Server as HTTPServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from '../config'

let io: Server | null = null

function parseCookies(header?: string): Record<string, string> {
  if (!header) return {}
  return header.split(';').reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rest] = chunk.split('=')
    if (!rawKey) return acc
    const key = rawKey.trim()
    const value = rest.join('=').trim()
    if (!key) return acc
    try {
      acc[key] = decodeURIComponent(value)
    } catch {
      acc[key] = value
    }
    return acc
  }, {})
}

function extractUserIdFromCookies(cookieHeader?: string): string | null {
  const cookies = parseCookies(cookieHeader)
  const token = cookies['access_token']
  if (!token) {
    return null
  }
  try {
    const payload = jwt.verify(token, SECRET_JWT_KEY) as { userId?: string }
    return payload.userId ?? null
  } catch {
    return null
  }
}

export function initSocketServer(server: HTTPServer, options: { allowedOrigins: string[] }) {
  io = new Server(server, {
    cors: {
      origin: options.allowedOrigins,
      credentials: true
    }
  })

  io.use((socket, next) => {
    const userId = extractUserIdFromCookies(socket.handshake.headers.cookie)
    if (!userId) {
      return next(new Error('No autenticado'))
    }
    socket.data.userId = userId
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined
    if (!userId) {
      socket.disconnect(true)
      return
    }
    socket.join(`user:${userId}`)
  })

  return io
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io aún no está inicializado')
  }
  return io
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  if (!io) return
  io.to(`user:${userId}`).emit(event, payload)
}
