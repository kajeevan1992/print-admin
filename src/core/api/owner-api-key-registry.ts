import { ownerApiKeySeed, type OwnerApiKeyRecord } from '@/data/owner-api-keys';
import { hashApiSecret, verifyApiSecret, type ApiCredentialScope } from './api-credentials';

export type OwnerApiCredential = {
  id: string;
  label: string;
  apiKey: string;
  secretHash?: string;
  plainSecret?: string;
  tenantId: string;
  siteId?: string;
  scopes: ApiCredentialScope[];
  status: OwnerApiKeyRecord['status'];
};

export type OwnerApiCredentialAuthResult =
  | { ok: true; credential: OwnerApiCredential }
  | { ok: false; reason: 'not_found' | 'inactive' | 'secret_mismatch' };

const DEFAULT_OWNER_API_SCOPES: ApiCredentialScope[] = ['catalog:read', 'orders:read', 'orders:write', 'webhooks:write'];

const seedCredentials: Record<string, { apiKey: string; secretHash: string; tenantId: string; siteId?: string; scopes: ApiCredentialScope[] }> = {
  'key-1': {
    apiKey: 'pk_live_northstar_83f2',
    secretHash: hashApiSecret('sk_live_northstar_83f2'),
    tenantId: 'tenant-001',
    scopes: DEFAULT_OWNER_API_SCOPES,
  },
  'key-2': {
    apiKey: 'pk_platform_owner_1bc9',
    secretHash: hashApiSecret('sk_platform_owner_1bc9'),
    tenantId: 'platform',
    scopes: ['catalog:read', 'orders:read', 'webhooks:write'],
  },
  'key-3': {
    apiKey: 'pk_demo_bluepeak_44d7',
    secretHash: hashApiSecret('sk_demo_bluepeak_44d7'),
    tenantId: 'tenant-002',
    scopes: DEFAULT_OWNER_API_SCOPES,
  },
};

function parseScopes(value: unknown): ApiCredentialScope[] {
  if (Array.isArray(value)) return value.filter((item): item is ApiCredentialScope => typeof item === 'string') as ApiCredentialScope[];
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean) as ApiCredentialScope[];
  return DEFAULT_OWNER_API_SCOPES;
}

function parseOwnerApiKeysJson(): OwnerApiCredential[] {
  const raw = process.env.OWNER_API_KEYS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item): OwnerApiCredential | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const id = typeof record.id === 'string' ? record.id : '';
        const apiKey = typeof record.apiKey === 'string' ? record.apiKey : typeof record.key === 'string' ? record.key : '';
        const tenantId = typeof record.tenantId === 'string' ? record.tenantId : '';
        const secretHash = typeof record.secretHash === 'string' ? record.secretHash : undefined;
        const plainSecret = typeof record.secret === 'string' ? record.secret : typeof record.plainSecret === 'string' ? record.plainSecret : undefined;
        const status = record.status === 'paused' || record.status === 'revoked' || record.status === 'active' ? record.status : 'active';
        if (!id || !apiKey || !tenantId || (!secretHash && !plainSecret)) return null;

        return {
          id,
          label: typeof record.label === 'string' ? record.label : id,
          apiKey,
          secretHash,
          plainSecret,
          tenantId,
          siteId: typeof record.siteId === 'string' ? record.siteId : undefined,
          scopes: parseScopes(record.scopes),
          status,
        };
      })
      .filter((item): item is OwnerApiCredential => Boolean(item));
  } catch {
    return [];
  }
}

function ownerSeedCredentials(): OwnerApiCredential[] {
  return ownerApiKeySeed
    .map((ownerKey) => {
      const credential = seedCredentials[ownerKey.id];
      if (!credential) return null;
      return {
        id: ownerKey.id,
        label: ownerKey.label,
        status: ownerKey.status,
        apiKey: credential.apiKey,
        secretHash: credential.secretHash,
        tenantId: credential.tenantId,
        siteId: credential.siteId,
        scopes: credential.scopes,
      } satisfies OwnerApiCredential;
    })
    .filter((item): item is OwnerApiCredential => Boolean(item));
}

export function listOwnerApiCredentials(): OwnerApiCredential[] {
  return [...parseOwnerApiKeysJson(), ...ownerSeedCredentials()];
}

export function authenticateOwnerApiKey(apiKey: string, apiSecret: string): OwnerApiCredentialAuthResult {
  const credential = listOwnerApiCredentials().find((item) => item.apiKey === apiKey);
  if (!credential) return { ok: false, reason: 'not_found' };
  if (credential.status !== 'active') return { ok: false, reason: 'inactive' };

  const secretMatches = credential.secretHash ? verifyApiSecret(apiSecret, credential.secretHash) : apiSecret === credential.plainSecret;
  if (!secretMatches) return { ok: false, reason: 'secret_mismatch' };

  return { ok: true, credential };
}
