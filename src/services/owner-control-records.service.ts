export type OwnerControlResource =
  | 'owner-api-keys'
  | 'owner-feature-flags'
  | 'owner-webhooks'
  | 'owner-notifications'
  | 'owner-environments'
  | 'owner-billing-plans'
  | 'owner-compliance-controls'
  | 'owner-usage-limits'
  | 'owner-backups'
  | 'owner-sso-configs'
  | 'owner-domains'
  | 'owner-incidents'
  | 'owner-maintenance-windows';

export type OwnerControlStoredRecord<T extends { id: string } = { id: string }> = T & {
  id: string;
  resource?: OwnerControlResource;
  status?: string;
  scope?: string | null;
  tenant?: string | null;
  tenantId?: string | null;
  updatedAt?: string;
  createdAt?: string;
};

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

function titleFor(record: Record<string, any>) {
  return record.label || record.name || record.title || record.domain || record.planName || record.id;
}

function statusFor(record: Record<string, any>) {
  return record.status || (record.enabled === false ? 'inactive' : 'active');
}

function toClientRecord<T extends { id: string }>(item: any): OwnerControlStoredRecord<T> {
  return {
    id: item.recordId,
    resource: item.resource,
    status: item.status,
    scope: item.scope,
    tenantId: item.tenantId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...(item.metadataJson || {}),
  };
}

export async function listOwnerControlRecords<T extends { id: string }>(resource: OwnerControlResource): Promise<OwnerControlStoredRecord<T>[]> {
  const data = await fetchJson(`/api/internal/platform/owner-control-records?resource=${resource}`);
  return (data.items || []).map(toClientRecord<T>);
}

export async function listOwnerControlRecordGroup<T extends { id: string }>(resources: OwnerControlResource[]): Promise<OwnerControlStoredRecord<T>[]> {
  const params = new URLSearchParams();
  params.set('resources', resources.join(','));
  const data = await fetchJson(`/api/internal/platform/owner-control-records?${params.toString()}`);
  return (data.items || []).map(toClientRecord<T>);
}

export async function saveOwnerControlRecord<T extends { id: string }>(resource: OwnerControlResource, record: T) {
  await fetchJson('/api/internal/platform/owner-control-records', {
    method: 'POST',
    body: JSON.stringify({
      id: `${resource}-${record.id}`,
      resource,
      recordId: record.id,
      title: titleFor(record as Record<string, any>),
      status: statusFor(record as Record<string, any>),
      scope: (record as any).scope || null,
      tenantId: (record as any).tenantId || (record as any).tenant || null,
      metadataJson: record,
    }),
  });

  return record;
}

export async function deleteOwnerControlRecord(resource: OwnerControlResource, id: string) {
  const params = new URLSearchParams({ resource, recordId: id, id: `${resource}-${id}` });
  await fetchJson(`/api/internal/platform/owner-control-records?${params.toString()}`, {
    method: 'DELETE',
  });
}

export function createOwnerControlRecordsService<T extends { id: string }>(resource: OwnerControlResource) {
  return {
    async list(): Promise<OwnerControlStoredRecord<T>[]> {
      return listOwnerControlRecords<T>(resource);
    },

    async save(record: T) {
      return saveOwnerControlRecord(resource, record);
    },

    async delete(id: string) {
      await deleteOwnerControlRecord(resource, id);
    },
  };
}
