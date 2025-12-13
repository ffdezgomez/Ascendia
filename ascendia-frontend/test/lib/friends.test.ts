export {}

const ORIGINAL_ENV = { ...process.env }
const originalFetch = global.fetch

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  global.fetch = originalFetch
  jest.resetModules()
  jest.clearAllMocks()
})

async function loadApi() {
  const mod = await import('../../src/lib/friends')
  return mod.FriendsApi
}

describe('FriendsApi', () => {
  it('calls overview endpoint with shared headers', async () => {
    process.env.REACT_APP_API_URL = 'https://api.ascendia.dev'
    const payload = { friends: [] }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload)
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const FriendsApi = await loadApi()
    const data = await FriendsApi.overview()

    expect(fetchMock).toHaveBeenCalledWith('https://api.ascendia.dev/friends/overview', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({ Accept: 'application/json' })
    }))
    expect(data).toEqual(payload)
  })

  it('propagates API errors with message detail', async () => {
    delete process.env.REACT_APP_API_URL
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      text: () => Promise.resolve('{"error":"Ya son amigos"}')
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const FriendsApi = await loadApi()

    await expect(FriendsApi.removeFriend('123')).rejects.toThrow('Ya son amigos')
    expect(fetchMock).toHaveBeenCalledWith('/api/friends/123', expect.any(Object))
  })

  it('fetches comparison candidates scoped by habit id', async () => {
    process.env.REACT_APP_API_URL = 'http://localhost:5000/api'
    const payload = { habits: [] }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload)
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const FriendsApi = await loadApi()
    await FriendsApi.comparisonCandidates('friend-1', 'habit-9')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5000/api/friends/friend-1/comparisons/candidates?friendHabitId=habit-9',
      expect.objectContaining({ credentials: 'include' })
    )
  })
})