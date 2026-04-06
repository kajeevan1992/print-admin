import { apiAccessProfilesMock, apiKeysMock, merchantAccountsMock, organizationsMock } from '@/data/platform-admin';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { ApiAccessProfile, ApiKeyRecord, MerchantAccount, OrganizationRecord } from '@/modules/settings/types';

const STORAGE_KEYS = {
  access: 'print-admin-platform-access',
  keys: 'print-admin-platform-keys',
  organizations: 'print-admin-platform-organizations',
  merchants: 'print-admin-platform-merchants'
} as const;

const wait = async () => new Promise((resolve) => setTimeout(resolve, 70));

function readStore<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, next: T[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(next));
}

function list<T extends { id: string }>(key: string, fallback: T[], search?: string): PaginatedResponse<T> {
  const term = search?.trim().toLowerCase();
  const items = readStore(key, fallback).filter((item) => !term || JSON.stringify(item).toLowerCase().includes(term));
  return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
}

function getById<T extends { id: string }>(key: string, fallback: T[], id: string): ApiResponse<T> {
  const item = readStore(key, fallback).find((entry) => entry.id === id);
  if (!item) throw new Error('Record not found');
  return ok(item);
}

function upsert<T extends { id: string }>(key: string, fallback: T[], record: T): ApiResponse<T> {
  const items = readStore(key, fallback);
  const exists = items.some((entry) => entry.id === record.id);
  const next = exists ? items.map((entry) => (entry.id === record.id ? record : entry)) : [record, ...items];
  writeStore(key, next);
  return ok(record);
}

function removeById<T extends { id: string }>(key: string, fallback: T[], id: string): ApiResponse<{ success: boolean }> {
  const next = readStore(key, fallback).filter((entry) => entry.id !== id);
  writeStore(key, next);
  return ok({ success: true });
}

export const platformAdminService = {
  listApiAccessProfiles: async (search?: string) => { await wait(); return list<ApiAccessProfile>(STORAGE_KEYS.access, apiAccessProfilesMock, search); },
  getApiAccessProfile: async (id: string) => { await wait(); return getById<ApiAccessProfile>(STORAGE_KEYS.access, apiAccessProfilesMock, id); },
  saveApiAccessProfile: async (record: ApiAccessProfile) => { await wait(); return upsert<ApiAccessProfile>(STORAGE_KEYS.access, apiAccessProfilesMock, record); },
  deleteApiAccessProfile: async (id: string) => { await wait(); return removeById<ApiAccessProfile>(STORAGE_KEYS.access, apiAccessProfilesMock, id); },

  listApiKeys: async (search?: string) => { await wait(); return list<ApiKeyRecord>(STORAGE_KEYS.keys, apiKeysMock, search); },
  saveApiKey: async (record: ApiKeyRecord) => { await wait(); return upsert<ApiKeyRecord>(STORAGE_KEYS.keys, apiKeysMock, record); },
  deleteApiKey: async (id: string) => { await wait(); return removeById<ApiKeyRecord>(STORAGE_KEYS.keys, apiKeysMock, id); },

  listOrganizations: async (search?: string) => { await wait(); return list<OrganizationRecord>(STORAGE_KEYS.organizations, organizationsMock, search); },
  saveOrganization: async (record: OrganizationRecord) => { await wait(); return upsert<OrganizationRecord>(STORAGE_KEYS.organizations, organizationsMock, record); },
  deleteOrganization: async (id: string) => { await wait(); return removeById<OrganizationRecord>(STORAGE_KEYS.organizations, organizationsMock, id); },

  listMerchantAccounts: async (search?: string) => { await wait(); return list<MerchantAccount>(STORAGE_KEYS.merchants, merchantAccountsMock, search); },
  saveMerchantAccount: async (record: MerchantAccount) => { await wait(); return upsert<MerchantAccount>(STORAGE_KEYS.merchants, merchantAccountsMock, record); },
  deleteMerchantAccount: async (id: string) => { await wait(); return removeById<MerchantAccount>(STORAGE_KEYS.merchants, merchantAccountsMock, id); }
};
