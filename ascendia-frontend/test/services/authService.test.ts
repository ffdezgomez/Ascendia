import { authService } from '../../src/services/authService'

const fetchMock = jest.fn()

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch
})

let dispatchSpy: jest.SpyInstance

beforeEach(() => {
  fetchMock.mockReset()
  dispatchSpy = jest.spyOn(window, 'dispatchEvent')
})

afterEach(() => {
  dispatchSpy.mockRestore()
})

describe('authService', () => {
  it('logs in and dispatches a success event', async () => {
    const payload = { token: 'abc', user: { username: 'neo' } }
    fetchMock.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(payload)
    })

    const result = await authService.login({ username: 'neo', password: 'matrix' })

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'neo', password: 'matrix' })
    }))

    expect(result).toEqual(payload)
    expect(dispatchSpy).toHaveBeenCalledTimes(1)

    const event = dispatchSpy.mock.calls[0][0] as CustomEvent<{ authenticated: boolean }>
    expect(event.type).toBe('auth:changed')
    expect(event.detail).toEqual({ authenticated: true })
  })

  it('emits a logout event when auth check fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: jest.fn()
    })

    await expect(authService.checkAuth()).rejects.toThrow('No autenticado')

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/profile', expect.objectContaining({
      credentials: 'include'
    }))

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    const event = dispatchSpy.mock.calls[0][0] as CustomEvent<{ authenticated: boolean }>
    expect(event.type).toBe('auth:changed')
    expect(event.detail).toEqual({ authenticated: false })
  })
})