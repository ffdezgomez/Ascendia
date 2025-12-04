// src/lib/profile.ts
import type { Profile } from '../types/profile'

const BASE = (process.env.REACT_APP_API_URL || '/api').replace(/\/+$/, '')

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

export const ProfileApi = {
  async get(): Promise<Profile> {
    const res = await fetch(`${BASE}/profile`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include', 
      cache: 'no-store'
    })
    return handle<Profile>(res)
  },

  async update(payload: { user: string; avatar?: string; bio?: string, habits?: string[]; }): Promise<Profile> {
    const res = await fetch(`${BASE}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      credentials: 'include', 
      body: JSON.stringify(payload)
    })
    return handle<Profile>(res)
  },

    async uploadAvatar(file: File): Promise<Profile> {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch(`${BASE}/profile/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData, // NO poner Content-Type, lo pone el navegador
    });

    return handle<Profile>(res);
  },
}