export type OwnerDbRecord = Record<string, unknown> & { id: string };

const RESOURCE_ALIASES: Record<string, string> = {
  'owner-sso-config': 'owner-sso-configs',
  'owner-compliance-center': 'owner-compliance-controls',
};

function canonicalResource(resource: string) {
  return RESOURCE_ALIASES[resource] || resource;
}

function resourceFromStorageKey(storageKey: string) {
  return canonicalResource(storageKey.replace(/^print-admin\./, '').replace(/\./g, '-'));
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
    (record as any).domain ||
    (record as any).providerName ||
    (record as any).tenant ||
    record.id
  );
}

function statusFromRecord(record: OwnerDbRecord) {
  return String((record as any).status || (record as any).state || 'active');
}

function tenantFromRecord(record: OwnerDbRecord) {
  return String((record as any).tenantId || (record as any).tenant || '').trim() || null;
}

function toClientRecord<T extends OwnerDbRecord>(item: any) {
  return {
    id: item.recordId,
    ...(item.metadataJson || {}),
    ownerControlResource: item.resource,
    ownerControlStatus: item.status,
    ownerControlUpdatedAt: item.updatedAt,
  } as T;
}

export function createOwnerDbBackedService<T extends OwnerDbRecord>(storageKey: string, seed: T[], resourceOverride?: string) {
  const resource = canonicalResource(resourceOverride || resourceFromStorageKey(storageKey));
  const endpoint = `/api/internal/platform/owner-control-records?resource=${encodeURIComponent(resource)}`;

  return {
    async list(): Promise<T[]> {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const payload = await parseResponse(response);
      const rows = payload?.data?.items;

      if (!Array.isArray(rows)) return [];

      return rows.map(toClientRecord<T>);
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
          tenantId: tenantFromRecord(record),
          metadataJson: record,
        }),
      });
      await parseResponse(response);
      return record;
    },

    async delete(id: string): Promise<void> {
      const params = new URLSearchParams({ resource, recordId: id, id: `${resource}-${id}` });
      const response = await fetch(`/api/internal/platform/owner-control-records?${params.toString()}`, {
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
