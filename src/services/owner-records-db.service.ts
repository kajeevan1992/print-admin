export type OwnerDbRecord = Record<string, unknown> & { id: string };

function resourceFromStorageKey(storageKey: string) {
  return storageKey.replace(/^print-admin\./, '').replace(/\./g, '-');
}

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || payload?.error || 'Internal owner records API failed.');
  }
  return payload;
}

function titleFromRecord(record: OwnerDbRecord) {
  return String(
    (record as any).title ||
    (record as any).label ||
    (record as any).name ||
    (record as any).tenant ||
    record.id
  );
}

function statusFromRecord(record: OwnerDbRecord) {
  return String((record as any).status || (record as any).state || 'active');
}

export function createOwnerDbBackedService<T extends OwnerDbRecord>(storageKey: string, seed: T[]) {
  const resource = resourceFromStorageKey(storageKey);
  const endpoint = `/api/internal/platform/owner-control-records?resource=${encodeURIComponent(resource)}`;

  return {
    async list(): Promise<T[]> {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await parseResponse(response);
      const rows = payload?.data?.items;

      if (!Array.isArray(rows)) return [];

      return rows.map((item: any) => ({
        id: item.recordId,
        ...(item.metadataJson || {}),
      })) as T[];
    },

    async save(record: T): Promise<T> {
      const response = await fetch('/api/internal/platform/owner-control-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `${resource}-${record.id}`,
          resource,
          recordId: record.id,
          title: titleFromRecord(record),
          status: statusFromRecord(record),
          scope: (record as any).scope || null,
          tenantId: (record as any).tenantId || null,
          metadataJson: record,
        }),
      });
      await parseResponse(response);
      return record;
    },

    async delete(id: string): Promise<void> {
      const response = await fetch(`/api/internal/platform/owner-control-records?id=${encodeURIComponent(`${resource}-${id}`)}`, {
        method: 'DELETE',
      });
      await parseResponse(response);
    },

    async reset(): Promise<T[]> {
      await Promise.all(seed.map((record) => this.save(record)));
      return seed;
    },
  };
}
