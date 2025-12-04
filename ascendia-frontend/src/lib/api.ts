// src/lib/api.ts
type FetchOpts = RequestInit & { json?: unknown };

const RAW = (process.env.REACT_APP_API_URL || '').trim();
let BASE = '';

try {
  if (RAW) {
    // Normaliza y quita barra final
    BASE = new URL(RAW).href.replace(/\/+$/, '');
  }
} catch (e) {
  console.warn('[api] REACT_APP_API_URL inválida:', RAW, e);
  BASE = ''; // fallback a same-origin
}

function buildUrl(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  // Si BASE está definida, la usamos; si no, pedimos al mismo host
  return BASE ? `${BASE}${p}` : p;
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: HeadersInit = { Accept: 'application/json' };
  let body: BodyInit | undefined;

  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }

  const res = await fetch(buildUrl(path), { ...opts, headers, body });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = text;
    try {
      const j = JSON.parse(text);
      detail = j.error || j.message || text;
    } catch {}
    throw new Error(`${res.status} ${res.statusText}${detail ? ` – ${detail}` : ''}`);
  }
  return (await res.json()) as T;
}

// Endpoints específicos
export const Api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, json?: unknown) => request<T>(p, { method: 'POST', json }),
  put:  <T>(p: string, json?: unknown) => request<T>(p, { method: 'PUT',  json }),
};

// Perfil
export const ProfileApi = {
  get:   () => Api.get('/api/profile'),
  update:(body: { name: string; avatar?: string }) => Api.put('/api/profile', body),
};