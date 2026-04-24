export type OwnerDbRecord = Record<string, unknown> & { id: string };

function dbKey(storageKey: string) {
  return storageKey.replace(/^print-admin\./, 'owner-').replace(/\./g, '-');
}

function readLocal<T>(storageKey: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(storageKey: string, rows: T[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(rows));
}

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Internal owner records API failed.');
  return payload;
}

export function createOwnerDbBackedService<T extends OwnerDbRecord>(storageKey: string, seed: T[]) {
  const key = dbKey(storageKey);
  const endpoint = `/api/internal/config/${encodeURIComponent(key)}/items`;

  return {
    async list(): Promise<T[]> {
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        const payload = await parseResponse(response);
        const rows = payload?.data?.items;
        if (Array.isArray(rows) && rows.length) {
          writeLocal(storageKey, rows as T[]);
          return rows as T[];
        }
        return readLocal(storageKey, seed);
      } catch {
        return readLocal(storageKey, seed);
      }
    },

    async save(record: T): Promise<T> {
      try {
        const response = await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
        await parseResponse(response);
      } catch {
        // Keep a local fallback copy if the tenant DB/internal API is temporarily unavailable.
      }
      const rows = readLocal<T>(storageKey, seed);
      const next = rows.some((item) => item.id === record.id)
        ? rows.map((item) => (item.id === record.id ? record : item))
        : [record, ...rows];
      writeLocal(storageKey, next);
      return record;
    },

    async delete(id: string): Promise<void> {
      try {
        const response = await fetch(`${endpoint}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        await parseResponse(response);
      } catch {
        // Keep local fallback updated even when DB/API delete fails.
      }
      writeLocal(storageKey, readLocal<T>(storageKey, seed).filter((item) => item.id !== id));
    },

    async reset(): Promise<T[]> {
      const rows = seed.map((item) => ({ ...item }));
      try {
        await Promise.all(rows.map((item) => fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }).then(parseResponse)));
      } catch {
        // Browser fallback remains the safety net.
      }
      writeLocal(storageKey, rows);
      return rows;
    },
  };
}
