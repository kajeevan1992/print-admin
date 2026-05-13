export type OwnerControlResource =
  | 'owner-api-keys'
  | 'owner-feature-flags'
  | 'owner-webhooks'
  | 'owner-notifications'
  | 'owner-environments';

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.ok === false) {
    throw new Error(json?.error?.message || 'Owner control API request failed.');
  }

  return json?.data;
}

export function createOwnerControlRecordsService<T extends { id: string }>(resource: OwnerControlResource) {
  return {
    async list(): Promise<T[]> {
      const data = await fetchJson(`/api/internal/platform/owner-control-records?resource=${resource}`);
      return (data.items || []).map((item: any) => ({
        id: item.recordId,
        ...(item.metadataJson || {}),
      }));
    },

    async save(record: T) {
      await fetchJson('/api/internal/platform/owner-control-records', {
        method: 'POST',
        body: JSON.stringify({
          id: `${resource}-${record.id}`,
          resource,
          recordId: record.id,
          title: (record as any).label || (record as any).name || record.id,
          status: (record as any).status || 'active',
          scope: (record as any).scope || null,
          tenantId: (record as any).tenant || null,
          metadataJson: record,
        }),
      });

      return record;
    },

    async delete(id: string) {
      await fetchJson(`/api/internal/platform/owner-control-records?id=${resource}-${id}`, {
        method: 'DELETE',
      });
    },
  };
}
