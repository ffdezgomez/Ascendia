import { describe, it, expect, vi, afterAll, afterEach, beforeEach } from 'vitest'

const connectMock = vi.fn()
const onMock = vi.fn()
const closeMock = vi.fn()

vi.mock('mongoose', () => ({
  default: {
    connect: connectMock,
    connection: {
      on: onMock,
      close: closeMock
    }
  }
}))

const originalEnv = { ...process.env }

const resetEnv = (overrides: Record<string, string | undefined> = {}) => {
  process.env = { ...originalEnv, ...overrides }
}

describe('db/mongoose', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    resetEnv({ MONGODB_URI: 'mongodb://test', MONGODB_DBNAME: 'db' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('throws when MONGODB_URI is missing', async () => {
    vi.resetModules()
    resetEnv({ MONGODB_URI: undefined, MONGODB_DBNAME: undefined })

    await expect(import('../../src/db/mongoose')).rejects.toThrow(/MONGODB_URI is required/)
  })

  it('connects with uri, dbName and registers error listener', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const module = await import('../../src/db/mongoose')

    connectMock.mockResolvedValue(undefined)

    await module.connectDB()

    expect(connectMock).toHaveBeenCalledWith('mongodb://test', expect.objectContaining({
      dbName: 'db',
      serverSelectionTimeoutMS: 10_000
    }))
    expect(onMock).toHaveBeenCalledWith('error', expect.any(Function))

    const handler = onMock.mock.calls[0][1] as (e: Error) => void
    const err = new Error('boom')
    handler(err)
    expect(consoleSpy).toHaveBeenCalledWith('❌ [DB] error:', err)
  })

  it('closes the connection on disconnectDB', async () => {
    const module = await import('../../src/db/mongoose')
    closeMock.mockResolvedValue(undefined)

    await module.disconnectDB()

    expect(closeMock).toHaveBeenCalled()
  })

  it('registers signal handlers that disconnect and exit', async () => {
    const handlers: Record<string, (...args: any[]) => any> = {}
    const onSpy = vi.spyOn(process, 'on').mockImplementation((event: any, handler: any) => {
      handlers[event] = handler
      return process as any
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    await import('../../src/db/mongoose')

    expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function))
    expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function))

    closeMock.mockResolvedValue(undefined)
    await handlers['SIGINT']?.()

    expect(closeMock).toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(0)

    onSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
