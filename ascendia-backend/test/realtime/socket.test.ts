import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyMock = vi.hoisted(() => vi.fn())
const emitSpy = vi.hoisted(() => vi.fn())
const toSpy = vi.hoisted(() => vi.fn(() => ({ emit: emitSpy })))
const serverState = vi.hoisted(() => ({ lastInstance: null as any }))

vi.mock('jsonwebtoken', () => ({
  default: { verify: verifyMock },
  verify: verifyMock
}))

vi.mock('../../src/config', () => ({
  SECRET_JWT_KEY: 'secret'
}))

vi.mock('socket.io', () => {
  class MockServer {
    corsOpts: any
    middleware: any
    connectionHandler: any
    constructor(_srv: any, opts: any) {
      this.corsOpts = opts
      serverState.lastInstance = this
    }
    use(fn: any) {
      this.middleware = fn
    }
    on(event: string, handler: any) {
      if (event === 'connection') {
        this.connectionHandler = handler
      }
    }
    to(room: string) {
      return toSpy(room)
    }
  }
  return { Server: MockServer }
})

async function loadModule() {
  return import('../../src/realtime/socket')
}

describe('socket realtime server', () => {
  beforeEach(() => {
    vi.resetModules()
    emitSpy.mockClear()
    toSpy.mockClear()
    verifyMock.mockReset()
    serverState.lastInstance = null
  })

  it('initializes socket server with cors and stores instance', async () => {
    const mod = await loadModule()
    const io = mod.initSocketServer({} as any, { allowedOrigins: ['http://allowed'] })

    expect(io).toBe(serverState.lastInstance)
    expect(serverState.lastInstance?.corsOpts.cors.origin).toEqual(['http://allowed'])
    expect(serverState.lastInstance?.corsOpts.cors.credentials).toBe(true)
    expect(mod.getIO()).toBe(io)
  })

  it('middleware rejects missing auth token', async () => {
    const mod = await loadModule()
    mod.initSocketServer({} as any, { allowedOrigins: [] })

    const mw = serverState.lastInstance!.middleware
    const next = vi.fn()
    mw({ handshake: { headers: {} }, data: {} } as any, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
    expect(next.mock.calls[0][0].message).toContain('No autenticado')
  })

  it('middleware extracts userId from JWT cookie', async () => {
    const mod = await loadModule()
    mod.initSocketServer({} as any, { allowedOrigins: [] })

    verifyMock.mockReturnValue({ userId: 'user-1' })
    const mw = serverState.lastInstance!.middleware
    const next = vi.fn()
    const socket: any = { handshake: { headers: { cookie: 'access_token=token123' } }, data: {} }

    mw(socket, next)

    expect(socket.data.userId).toBe('user-1')
    expect(next).toHaveBeenCalledWith()
  })

  it('connection handler joins user room and disconnects when missing id', async () => {
    const mod = await loadModule()
    mod.initSocketServer({} as any, { allowedOrigins: [] })

    const handler = serverState.lastInstance!.connectionHandler

    const joinSpy = vi.fn()
    handler({ data: { userId: 'abc' }, join: joinSpy, disconnect: vi.fn() } as any)
    expect(joinSpy).toHaveBeenCalledWith('user:abc')

    const disconnectSpy = vi.fn()
    handler({ data: {}, join: vi.fn(), disconnect: disconnectSpy } as any)
    expect(disconnectSpy).toHaveBeenCalledWith(true)
  })

  it('emits to user rooms when initialized', async () => {
    const mod = await loadModule()
    mod.initSocketServer({} as any, { allowedOrigins: [] })

    mod.emitToUser('abc', 'ping', { ok: true })

    expect(toSpy).toHaveBeenCalledWith('user:abc')
    expect(emitSpy).toHaveBeenCalledWith('ping', { ok: true })
  })

  it('silently skips emit when server not initialized', async () => {
    const mod = await loadModule()
    mod.emitToUser('ghost', 'ev', { foo: 'bar' })
    expect(toSpy).not.toHaveBeenCalled()
  })

  it('throws when getIO called before init', async () => {
    const mod = await loadModule()
    expect(() => mod.getIO()).toThrow(/aún no está inicializado/)
  })
})
