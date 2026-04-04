import { ApiError } from './errors';

type Query = Record<string, string | number | boolean | undefined>;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  query?: Query;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

const toQueryString = (query?: Query) => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    params.set(key, String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!baseUrl) {
    throw new ApiError('UNKNOWN_ERROR', 'NEXT_PUBLIC_API_BASE_URL is not configured', 500);
  }

  const response = await fetch(`${baseUrl}${path}${toQueryString(options.query)}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store'
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError('UNKNOWN_ERROR', 'Invalid API response format', response.status);
  }

  if (!response.ok) {
    const message = (payload as { message?: string })?.message ?? `Request failed with ${response.status}`;
    throw new ApiError('UNKNOWN_ERROR', message, response.status);
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body })
};
