const JSON_HEADERS = { 'Content-Type': 'application/json' };

type RecordWithId = { id: string };

function canUseBrowser() {
  return typeof window !== 'undefined';
}

function readFallback<T>(storageKey: string, fallback: T[]): T[] {
  if (!canUseBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[] | { items?: T[] };
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeFallback<T>(storageKey: string, next: T[]) {
  if (!canUseBrowser()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function normaliseItems<T extends RecordWithId>(items: unknown, fallback: T[]): T[] {
  if (!Array.isArray(items)) return fallback;
  return items.filter((item): item is T => Boolean(item && typeof item === 'object' && 'id' in item));
}

export function createInternalConfigRecordsService<T extends RecordWithId>({
  configKey,
  storageKey,
  seed,
}: {
  configKey: string;
  storageKey: string;
  seed: T[];
}) {
  const endpoint = `/api/internal/config/${encodeURIComponent(configKey)}/items`;

  async function list(): Promise<T[]> {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal config items API failed.');
      const items = normaliseItems<T>(payload?.data?.items, []);
      if (items.length) {
        writeFallback(storageKey, items);
        return items;
      }
      return readFallback<T>(storageKey, seed);
    } catch {
      return readFallback<T>(storageKey, seed);
    }
  }

  async function save(record: T): Promise<T> {
    const current = await list();
    const next = current.some((item) => item.id === record.id)
      ? current.map((item) => (item.id === record.id ? record : item))
      : [record, ...current];
    writeFallback(storageKey, next);

    try {
      await fetch(endpoint, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(record),
      });
    } catch {
      // Browser fallback is already updated. The page can continue working offline.
    }

    return record;
  }

  async function deleteRecord(id: string): Promise<void> {
    const next = (await list()).filter((item) => item.id !== id);
    writeFallback(storageKey, next);

    try {
      await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch {
      // Browser fallback is already updated.
    }
  }

  async function reset(): Promise<T[]> {
    writeFallback(storageKey, seed);
    try {
      await fetch(`/api/internal/config/${encodeURIComponent(configKey)}`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          title: configKey,
          description: 'Owner platform records reset from seed data.',
          items: seed,
          values: { count: String(seed.length), resetAt: new Date().toISOString() },
        }),
      });
    } catch {
      // Browser fallback is already reset.
    }
    return seed;
  }

  return { list, save, delete: deleteRecord, reset };
}
