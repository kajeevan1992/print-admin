import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { ApiAccessProfile, ApiKeyRecord, MerchantAccount, OrganizationRecord } from '@/modules/settings/types';

type PlatformResource = 'organizations' | 'merchant-accounts' | 'api-access-profiles';
type PlatformPayload<T> = { ok?: boolean; data?: { items?: Array<{ id: string; metadataJson?: T }> }; error?: string };
async function fetchRecords<T extends { id: string }>(resource: PlatformResource, search?: string): Promise<PaginatedResponse<T>> { const qs = new URLSearchParams({ resource }); if (search) qs.set('search', search); const response = await fetch(`/api/internal/platform/records?${qs.toString()}`, { cache: 'no-store' }); const payload = (await response.json().catch(() => ({}))) as PlatformPayload<T>; if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Platform records could not load.'); const items = (payload.data?.items || []).map((row) => ({ ...(row.metadataJson || {}), id: row.id }) as T); return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 }); }
async function saveRecord<T extends { id: string }>(resource: PlatformResource, record: T): Promise<ApiResponse<T>> { const response = await fetch('/api/internal/platform/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource, record }) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Platform record could not be saved.'); return ok(record); }
async function deleteRecord(resource: PlatformResource, id: string): Promise<ApiResponse<{ success: boolean }>> { const qs = new URLSearchParams({ resource, id }); const response = await fetch(`/api/internal/platform/records?${qs.toString()}`, { method: 'DELETE' }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Platform record could not be deleted.'); return ok({ success: true }); }
async function credentialList(search?: string): Promise<PaginatedResponse<ApiKeyRecord>> { const response = await fetch(`/api/internal/platform/credentials/health${search ? `?search=${encodeURIComponent(search)}` : ''}`, { cache: 'no-store' }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Credentials could not load.'); const items = payload.data?.items || []; return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 }); }
async function credentialCreate(record: ApiKeyRecord): Promise<ApiResponse<ApiKeyRecord & { secret?: string }>> { const response = await fetch('/api/internal/platform/token-factory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Credential could not be created.'); const items = payload.data?.items || []; return ok({ ...(items[0] || record), secret: payload.data?.secret }); }

export const platformAdminService = {
  listApiAccessProfiles: (search?: string) => fetchRecords<ApiAccessProfile>('api-access-profiles', search),
  getApiAccessProfile: async (id: string) => { const rows = await fetchRecords<ApiAccessProfile>('api-access-profiles'); const item = rows.data.items.find((entry) => entry.id === id); if (!item) throw new Error('Record not found'); return ok(item); },
  saveApiAccessProfile: (record: ApiAccessProfile) => saveRecord<ApiAccessProfile>('api-access-profiles', record),
  deleteApiAccessProfile: (id: string) => deleteRecord('api-access-profiles', id),
  listApiKeys: credentialList,
  saveApiKey: credentialCreate,
  deleteApiKey: async (id: string) => { const response = await fetch('/api/internal/platform/token-off', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const payload = await response.json().catch(() => ({})); if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Credential could not be disabled.'); return ok({ success: true }); },
  listOrganizations: (search?: string) => fetchRecords<OrganizationRecord>('organizations', search),
  saveOrganization: (record: OrganizationRecord) => saveRecord<OrganizationRecord>('organizations', record),
  deleteOrganization: (id: string) => deleteRecord('organizations', id),
  listMerchantAccounts: (search?: string) => fetchRecords<MerchantAccount>('merchant-accounts', search),
  saveMerchantAccount: (record: MerchantAccount) => saveRecord<MerchantAccount>('merchant-accounts', record),
  deleteMerchantAccount: (id: string) => deleteRecord('merchant-accounts', id)
};
