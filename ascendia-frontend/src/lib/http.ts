// src/lib/http.ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type HttpOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: RequestCredentials; // por defecto 'include'
};

const RAW_BASE =
  process.env.REACT_APP_API_URL || // <--- usamos esta
  process.env.REACT_APP_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  process.env.API_BASE_URL ||
  '';

const BASE = RAW_BASE.replace(/\/+$/, ''); // quita barras finales

function buildUrl(path: string): string {
  // si path ya es absoluta, respétala
  if (/^https?:\/\//i.test(path)) return path;

  // si BASE es absoluta, concatenamos tal cual
  if (/^https?:\/\//i.test(BASE)) {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${BASE}${p}`;
  }

  // BASE relativa (p.ej. '/api') o vacía => anteponer origin
  const origin = window.location.origin.replace(/\/+$/, '');
  const b = BASE ? (BASE.startsWith('/') ? BASE : `/${BASE}`) : '';
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${b}${p}`;
}

export async function http<T = unknown>(path: string, options: HttpOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const {
    method = 'GET',
    body,
    headers = {},
    credentials = 'include', // cookies del JWT a través del proxy
  } = options;

  const isJson = body !== undefined;

  const res = await fetch(url, {
    method,
    credentials,
    headers: {
      ...(isJson ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'application/json',
      ...headers,
    },
    body: isJson ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (undefined as T);

  if (!res.ok) {
    const msg =
      (data as any)?.error ||
      (data as any)?.message ||
      `${res.status} ${res.statusText}`;
    throw new Error(msg);
  }
  return data as T;
}