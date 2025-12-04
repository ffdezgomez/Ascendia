// src/lib/habits.ts
export type HabitCategory = 'all' | 'fitness' | 'study' | 'health' | 'personal';

export type HabitSummary = {
  id: string;
  name: string;
  emoji: string;
  category: HabitCategory;
  hoursThisMonth: number;
  completedToday: boolean;
  streak: number;
  history: { date: string; completed: boolean }[];
};

// Payload mínimo para crear/editar hábitos
export type HabitPayload = {
  name: string;
  description?: string;
  type: string; // p.ej. "time"
  unit: string; // p.ej. "h"
};

const API_BASE = process.env.REACT_APP_API_URL ?? 'http://localhost:5000';

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const HabitsApi = {
  async create(payload: HabitPayload) {
    const res = await fetch(`${API_BASE}/habits`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleJson<any>(res);
  },

  async update(id: string, payload: Partial<HabitPayload>) {
    const res = await fetch(`${API_BASE}/habits/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleJson<any>(res);
  },

  async remove(id: string) {
    const res = await fetch(`${API_BASE}/habits/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    // puede devolver 200 o 204, lo tratamos igual
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `${res.status} ${res.statusText}`);
    }
    return true;
  },
};