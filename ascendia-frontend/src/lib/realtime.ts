import type { Socket } from 'socket.io-client'

let socket: Socket | null = null
let socketPromise: Promise<Socket | null> | null = null

function normalizeBaseUrl(raw?: string | null): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.pathname.endsWith('/api')) {
      url.pathname = url.pathname.replace(/\/api\/?$/, '/')
    }
    return url.href.replace(/\/$/, '')
  } catch (err) {
    console.warn('[realtime] URL inválida:', raw, err)
    return null
  }
}

const ENV_SOCKET_URL = normalizeBaseUrl(process.env.REACT_APP_SOCKET_URL ?? null)
const API_BASE_URL = normalizeBaseUrl(process.env.REACT_APP_API_URL ?? null)

function resolveSocketUrl(): string | undefined {
  if (ENV_SOCKET_URL) return ENV_SOCKET_URL
  if (API_BASE_URL) return API_BASE_URL
  if (typeof window !== 'undefined') return window.location.origin
  return undefined
}

async function createSocketInstance(): Promise<Socket | null> {
  try {
    const { io } = await import('socket.io-client')
    const url = resolveSocketUrl()
    socket = io(url, {
      withCredentials: true,
      transports: ['websocket'],
    })

    if (process.env.NODE_ENV !== 'test') {
      socket.on('connect_error', (error) => {
        console.warn('[realtime] connect_error', error.message)
      })
    }

    return socket
  } catch (error) {
    console.warn('[realtime] failed to initialize socket', error)
    socket = null
    return null
  }
}

export async function getSocket(): Promise<Socket | null> {
  if (typeof window === 'undefined') return null
  if (socket) {
    return socket
  }

  if (!socketPromise) {
    socketPromise = createSocketInstance().finally(() => {
      socketPromise = null
    })
  }

  return socketPromise
}

export async function disconnectSocket(): Promise<void> {
  if (socketPromise) {
    await socketPromise
  }

  if (socket) {
    socket.disconnect()
    socket = null
  }

  socketPromise = null
}
