import { contentRecordsSeed, htmlSnippetsSeed, type ContentKind, type ContentRecord, type HtmlSnippet } from '@/data/content';

const CONTENT_KEY = 'print-admin-content-records';
const SNIPPETS_KEY = 'print-admin-html-snippets';
const CONTENT_API_KEY = 'content-records';
const SNIPPETS_API_KEY = 'content-html-snippets';

const isBrowser = typeof window !== 'undefined';

type ServiceState = 'db' | 'local' | 'seed';
type ServiceResult<T> = { items: T[]; source: ServiceState; message: string };

function readLocal<T>(key: string, seed: T[]): T[] {
  if (!isBrowser) return seed;
  const raw = window.localStorage.getItem(key);
  if (!raw) return seed;
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : seed;
  } catch {
    return seed;
  }
}

function writeLocal<T>(key: string, items: T[]) {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

async function fetchItems<T>(apiKey: string, localKey: string, seed: T[]): Promise<ServiceResult<T>> {
  if (!isBrowser) return { items: seed, source: 'seed', message: 'Server render seed data.' };
  try {
    const response = await fetch(`/api/internal/config/${encodeURIComponent(apiKey)}/items`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal content API failed.');
    const rows = payload?.data?.items;
    if (Array.isArray(rows) && rows.length > 0) {
      writeLocal(localKey, rows as T[]);
      return { items: rows as T[], source: 'db', message: 'Connected to database through internal API.' };
    }
    return { items: [], source: 'db', message: 'Connected to database. No records found yet.' };
  } catch (error) {
    const fallback = readLocal(localKey, seed);
    return {
      items: fallback,
      source: 'local',
      message: `Internal API unavailable, using browser fallback: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

async function saveItem<T extends { id: string }>(apiKey: string, localKey: string, seed: T[], item: T): Promise<T> {
  if (isBrowser) {
    const local = readLocal(localKey, seed);
    writeLocal(localKey, local.some((row) => row.id === item.id) ? local.map((row) => (row.id === item.id ? item : row)) : [item, ...local]);
  }

  const response = await fetch(`/api/internal/config/${encodeURIComponent(apiKey)}/items`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal content API save failed.');
  return (payload?.item ?? item) as T;
}

async function removeItem(apiKey: string, localKey: string, id: string) {
  if (isBrowser) {
    const local = readLocal<any>(localKey, []);
    writeLocal(localKey, local.filter((row) => String(row.id) !== id));
  }
  const response = await fetch(`/api/internal/config/${encodeURIComponent(apiKey)}/items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal content API delete failed.');
}

export const contentService = {
  async list(kind: ContentKind): Promise<ServiceResult<ContentRecord>> {
    const result = await fetchItems<ContentRecord>(CONTENT_API_KEY, CONTENT_KEY, contentRecordsSeed);
    return {
      ...result,
      items: result.items.filter((item) => item.kind === kind).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    };
  },
  async save(record: Omit<ContentRecord, 'id' | 'updatedAt'> & { id?: string }): Promise<ContentRecord> {
    const next: ContentRecord = {
      ...record,
      id: record.id ?? `cnt-${record.kind}-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    return saveItem(CONTENT_API_KEY, CONTENT_KEY, contentRecordsSeed, next);
  },
  async remove(id: string) {
    return removeItem(CONTENT_API_KEY, CONTENT_KEY, id);
  },
};

export const htmlSnippetsService = {
  async list(): Promise<ServiceResult<HtmlSnippet>> {
    const result = await fetchItems<HtmlSnippet>(SNIPPETS_API_KEY, SNIPPETS_KEY, htmlSnippetsSeed);
    return {
      ...result,
      items: result.items.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    };
  },
  async save(snippet: Omit<HtmlSnippet, 'id' | 'updatedAt'> & { id?: string }): Promise<HtmlSnippet> {
    const next: HtmlSnippet = {
      ...snippet,
      id: snippet.id ?? `snippet-${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    return saveItem(SNIPPETS_API_KEY, SNIPPETS_KEY, htmlSnippetsSeed, next);
  },
  async remove(id: string) {
    return removeItem(SNIPPETS_API_KEY, SNIPPETS_KEY, id);
  },
};
