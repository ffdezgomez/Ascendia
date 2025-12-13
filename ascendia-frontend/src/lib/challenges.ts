import type {
  ChallengeListResponse,
  ChallengeResponse,
  CreateChallengePayload,
  RespondChallengePayload
} from '../types/challenges'

const BASE = (process.env.REACT_APP_API_URL || '/api').replace(/\/+$/, '')

async function request<T>(path: string, init: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers
    },
    ...init
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    try {
      const json = JSON.parse(text)
      throw new Error(json.error || json.message || text || `${res.status} ${res.statusText}`)
    } catch {
      throw new Error(text || `${res.status} ${res.statusText}`)
    }
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

export const ChallengesApi = {
  list: () => request<ChallengeListResponse>('/challenges'),
  detail: (challengeId: string) => request<ChallengeResponse>(`/challenges/${challengeId}`),
  create: (payload: CreateChallengePayload) =>
    request<ChallengeResponse>('/challenges', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  respond: (challengeId: string, payload: RespondChallengePayload) =>
    request<ChallengeResponse>(`/challenges/${challengeId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  requestFinish: (challengeId: string) =>
    request<ChallengeResponse>(`/challenges/${challengeId}/finish`, { method: 'POST' }),
  declineFinish: (challengeId: string) =>
    request<ChallengeResponse>(`/challenges/${challengeId}/finish/decline`, { method: 'POST' }),
  remove: (challengeId: string) => request<void>(`/challenges/${challengeId}`, { method: 'DELETE' })
}
