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
  const mod = await import('../../src/lib/habits')
  return mod.HabitsApi
}

describe('HabitsApi', () => {
  it('creates habits using configured API base', async () => {
    process.env.REACT_APP_API_URL = 'https://api.ascendia.dev'
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'h1' })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const HabitsApi = await loadApi()
    await HabitsApi.create({ name: 'Leer', type: 'time', unit: 'h' })

    expect(fetchMock).toHaveBeenCalledWith('https://api.ascendia.dev/habits', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: 'Leer', type: 'time', unit: 'h' })
    }))
  })

  it('throws when remove endpoint responds with an error body', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
      text: () => Promise.resolve('boom')
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const HabitsApi = await loadApi()

    await expect(HabitsApi.remove('bad')).rejects.toThrow('boom')
  })
})