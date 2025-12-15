// src/services/authService.ts

// Base del backend (con o sin /api en la env)
const RAW_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = RAW_API_URL.replace(/\/$/, '');

// Simplifica el helper
function api(path: string) {
  // Si ya tiene /api, no duplicar
  if (API_URL.endsWith('/api')) {
    return `${API_URL}${path}`;
  }
  return `${API_URL}/api${path}`;
}

type ApiError = Error & { response?: { data: { message: string } } };

function createApiError(message: string): ApiError {
  const error = new Error(message) as ApiError;
  // Compatibilidad: en algunas pantallas se lee data.error y en otras data.message
  error.response = { data: { message, error: message } as any };
  return error;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 15_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Para avisar al frontend cuando cambia el estado de auth
class AuthEventTarget extends EventTarget {
  emit(authenticated: boolean) {
    const event = new CustomEvent('auth:changed', { detail: { authenticated } });
    window.dispatchEvent(event);
  }
}

export const authEvents = new AuthEventTarget();

// =========================================================
// ====================== AUTH SERVICE ======================
// =========================================================

export const authService = {
  /* ================================
   * LOGIN
   * ================================ */
  async login(credentials: { username: string; password: string }) {
    const response = await fetch(api('/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error || 'Error al iniciar sesión';
      throw createApiError(message);
    }

    if (json.token) {
      localStorage.setItem('token', json.token);
    }

    authEvents.emit(true);
    return json;
  },

  /* ================================
   * REGISTER
   * ================================ */
  async register(data: { username: string; email: string; password: string }) {
    const response = await fetch(api('/register'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error || 'Error al registrarse';
      throw createApiError(message);
    }

    // authEvents.emit(true); // Don't auto-login on register
    return json;
  },

  /* ================================
   * CHECK AUTH
   * ================================ */
  async checkAuth() {
    const response = await fetch(api('/profile'), {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      authEvents.emit(false);
      throw new Error('No autenticado');
    }

    const json = await response.json();
    authEvents.emit(true);
    return json;
  },

  /* ================================
   * LOGOUT
   * ================================ */
  async logout() {
    const response = await fetch(api('/logout'), {
      method: 'POST',
      credentials: 'include',
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error || 'No se pudo cerrar sesión';
      throw createApiError(message);
    }

    localStorage.removeItem('token');
    authEvents.emit(false);
    return json;
  },

  /* ================================
   * SOLICITAR RECUPERACIÓN POR EMAIL
   * ================================ */
  async forgotPassword(emailOrUsername: string) {
    const response = await fetchWithTimeout(api('/auth/forgot-password'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername }),
      timeoutMs: 20_000,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error || 'No se pudo enviar el correo de recuperación';
      throw createApiError(message);
    }

    return json; // En dev puede incluir token
  },

  /* ================================
   * RESET PASSWORD CON TOKEN
   * ================================ */
  async resetPassword(token: string, newPassword: string) {
    const response = await fetch(api('/auth/reset-password'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error || 'No se pudo cambiar la contraseña';
      throw createApiError(message);
    }

    return json;
  },

  /* ================================
   * VERIFICAR EMAIL
   * ================================ */
  async verifyEmail(token: string) {
    const response = await fetch(api('/auth/verify-email'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error || 'No se pudo verificar el email';
      throw createApiError(message);
    }

    return json;
  },
};