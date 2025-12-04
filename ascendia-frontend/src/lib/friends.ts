import type {
  ComparisonCandidatesResponse,
  FriendDashboard,
  FriendsOverview,
  HabitComparisonSummary,
  SearchFriendResult
} from '../types/friends'

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
    let detail = text
    try {
      const json = JSON.parse(text)
      detail = json.error || json.message || text
    } catch {}
    throw new Error(detail || `${res.status} ${res.statusText}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}

export const FriendsApi = {
  overview: () => request<FriendsOverview>('/friends/overview'),
  search: (username: string) => request<SearchFriendResult>(`/friends/search?username=${encodeURIComponent(username)}`),
  sendRequest: (username: string) =>
    request('/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ username })
    }),
  acceptRequest: (requestId: string) =>
    request(`/friends/requests/${requestId}/accept`, { method: 'POST' }),
  declineRequest: (requestId: string) =>
    request(`/friends/requests/${requestId}/decline`, { method: 'POST' }),
  removeFriend: (friendId: string) =>
    request(`/friends/${friendId}`, { method: 'DELETE' }),
  dashboard: (friendId: string) =>
    request<FriendDashboard>(`/friends/${friendId}/dashboard`),
  comparisonCandidates: (friendId: string, friendHabitId: string) =>
    request<ComparisonCandidatesResponse>(
      `/friends/${friendId}/comparisons/candidates?friendHabitId=${encodeURIComponent(friendHabitId)}`
    ),
  createComparison: (friendId: string, body: { friendHabitId: string; ownerHabitId: string }) =>
    request<{ comparison: HabitComparisonSummary }>(`/friends/${friendId}/comparisons`, {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  deleteComparison: (friendId: string, comparisonId: string) =>
    request<void>(`/friends/${friendId}/comparisons/${comparisonId}`, { method: 'DELETE' })
}
