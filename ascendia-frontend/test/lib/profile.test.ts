export {}

const ORIGINAL_ENV = { ...process.env }
const originalFetch = global.fetch
const originalFormData = global.FormData

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  global.fetch = originalFetch
  global.FormData = originalFormData as typeof FormData
  jest.resetModules()
  jest.clearAllMocks()
})

async function loadApi() {
  const mod = await import('../../src/lib/profile')
  return mod.ProfileApi
}

describe('ProfileApi', () => {
  it('fetches profile with credentials and cache busting', async () => {
    process.env.REACT_APP_API_URL = 'https://api.ascendia.dev'
    const payload = { user: 'neo' }
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload)
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const ProfileApi = await loadApi()
    const profile = await ProfileApi.get()

    expect(fetchMock).toHaveBeenCalledWith('https://api.ascendia.dev/profile', expect.objectContaining({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    }))
    expect(profile).toEqual(payload)
  })

  it('sends JSON payloads when updating profile', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: 'trinity' })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const ProfileApi = await loadApi()
    await ProfileApi.update({ user: 'trinity', habits: ['a'] })

    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'PUT',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ user: 'trinity', habits: ['a'] })
    })
  })

  it('uploads avatars using FormData without overriding headers', async () => {
    const appendSpy = jest.fn()
    class MockFormData {
      append = appendSpy
    }
    global.FormData = MockFormData as any

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const file = new File(['img'], 'avatar.png', { type: 'image/png' })
    const ProfileApi = await loadApi()
    await ProfileApi.uploadAvatar(file)

    expect(appendSpy).toHaveBeenCalledWith('avatar', file)
    const options = fetchMock.mock.calls[0][1]!
    expect(options).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(options!.headers).toBeUndefined()
  })
})