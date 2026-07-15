import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { platformPrisma } from '@/core/db/platform-prisma';
import type { TenantContext } from '@/core/tenant/types';

export type PublicApiStoreAccess = {
  storeId: string;
  tenantId: string;
  siteId?: string;
  slug?: string;
  domains?: string[];
  status?: string;
};

export type PublicApiAccessMode = 'tenant' | 'explicit-stores' | 'published-stores';

export type PublicApiAuthContext = {
  ok: true;
  apiKey: string;
  credentialId?: string;
  tenantId: string;
  siteId?: string;
  store?: PublicApiStoreAccess;
  stores: PublicApiStoreAccess[];
  scopes: string[];
  accessMode: PublicApiAccessMode;
  serviceClient: boolean;
  ctx: TenantContext;
};

export type PublicApiAuthResult = PublicApiAuthContext | { ok: false; response: NextResponse };

type CredentialRecord = {
  credentialId?: string;
  apiKey: string;
  apiSecret?: string;
  secretHash?: string;
  tenantId: string;
  siteId?: string;
  scopes?: string[];
  stores?: PublicApiStoreAccess[];
  status?: string;
  accessMode?: PublicApiAccessMode;
  serviceClient?: boolean;
};

const RUNTIME_SCOPES = 'storefront:resolve storefront:read catalog:read pricing:calculate checkout:create';

function clean(value: unknown) { return String(value || '').trim(); }
function norm(value: unknown) { return clean(value).toLowerCase(); }
function split(value: unknown) { return clean(value).split(/[\s,]+/).map((item) => item.trim()).filter(Boolean); }
function host(value: unknown) { return norm(value).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''); }
function array(value: unknown): any[] { return Array.isArray(value) ? value : []; }
function sha256(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function publicApiError(status: number, code: string, message: string, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json({ ok: false, error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }, { status });
}

function verifySecret(provided: string, record: CredentialRecord) {
  if (record.secretHash) {
    const stored = clean(record.secretHash).replace(/^sha256:/i, '').toLowerCase();
    if (/^[a-f0-9]{64}$/.test(stored)) return safeEqual(sha256(provided), stored);
    return false;
  }
  if (!record.apiSecret) return false;
  return safeEqual(sha256(provided), sha256(record.apiSecret));
}

function parseStores(value: unknown, fallbackTenantId = ''): PublicApiStoreAccess[] {
  if (typeof value === 'string') {
    return split(value).map((storeId) => ({ storeId, tenantId: fallbackTenantId })).filter((item) => item.storeId && item.tenantId);
  }
  return array(value).map((item) => {
    if (typeof item === 'string') return { storeId: item, tenantId: fallbackTenantId };
    const data = item && typeof item === 'object' ? item as Record<string, any> : {};
    return {
      storeId: clean(data.storeId || data.id || data.slug),
      tenantId: clean(data.tenantId || data.tenant || fallbackTenantId),
      siteId: clean(data.siteId || data.site || data.storeId || data.id || data.slug) || undefined,
      slug: clean(data.slug || data.storeSlug || data.id) || undefined,
      domains: array(data.domains).map(host).filter(Boolean),
      status: clean(data.status) || undefined,
    };
  }).filter((item) => item.storeId && item.tenantId);
}

function accessModeFor(item: Record<string, any>, stores: PublicApiStoreAccess[]): PublicApiAccessMode {
  const explicit = norm(item.accessMode || item.storeAccessMode || item.access);
  if (['published-stores', 'all-published-stores', 'storefront-service'].includes(explicit) || item.serviceClient === true || item.allowPublishedStores === true) return 'published-stores';
  if (stores.length || explicit === 'explicit-stores') return 'explicit-stores';
  return 'tenant';
}

function parseEnvCredentials(): CredentialRecord[] {
  const json = clean(process.env.PUBLIC_API_CREDENTIALS_JSON || process.env.STOREFRONT_API_CREDENTIALS_JSON);
  const records: CredentialRecord[] = [];
  if (json) {
    try {
      const parsed = JSON.parse(json);
      for (const item of array(parsed)) {
        const tenantId = clean(item?.tenantId || item?.tenant || process.env.PUBLIC_API_TENANT_ID || process.env.TENANT_ID);
        const stores = parseStores(item?.stores || item?.allowedStores || process.env.PUBLIC_API_ALLOWED_STORES, tenantId);
        const accessMode = accessModeFor(item || {}, stores);
        records.push({
          credentialId: clean(item?.credentialId || item?.id) || undefined,
          apiKey: clean(item?.apiKey || item?.key),
          apiSecret: clean(item?.apiSecret || item?.secret) || undefined,
          secretHash: clean(item?.secretHash) || undefined,
          tenantId,
          siteId: clean(item?.siteId || item?.site) || undefined,
          scopes: array(item?.scopes).length ? array(item.scopes).map(clean).filter(Boolean) : split(item?.scopes || process.env.PUBLIC_API_SCOPES || RUNTIME_SCOPES),
          stores,
          status: clean(item?.status || 'active'),
          accessMode,
          serviceClient: accessMode === 'published-stores',
        });
      }
    } catch {}
  }

  const apiKey = clean(process.env.PUBLIC_API_KEY || process.env.STOREFRONT_API_KEY);
  const apiSecret = clean(process.env.PUBLIC_API_SECRET || process.env.STOREFRONT_API_SECRET);
  const tenantId = clean(process.env.PUBLIC_API_TENANT_ID || process.env.STOREFRONT_API_TENANT_ID || process.env.TENANT_ID);
  if (apiKey && apiSecret && tenantId) {
    const stores = parseStores(process.env.PUBLIC_API_ALLOWED_STORES || process.env.STOREFRONT_API_ALLOWED_STORES, tenantId);
    const serviceClient = norm(process.env.PUBLIC_API_ACCESS_MODE || process.env.STOREFRONT_API_ACCESS_MODE) === 'published-stores';
    records.push({
      apiKey,
      apiSecret,
      tenantId,
      siteId: clean(process.env.PUBLIC_API_SITE_ID || process.env.STOREFRONT_API_SITE_ID) || undefined,
      scopes: split(process.env.PUBLIC_API_SCOPES || RUNTIME_SCOPES),
      stores,
      status: 'active',
      accessMode: serviceClient ? 'published-stores' : stores.length ? 'explicit-stores' : 'tenant',
      serviceClient,
    });
  }
  return records.filter((item) => item.apiKey && (item.apiSecret || item.secretHash) && item.tenantId);
}

async function dbCredential(apiKey: string): Promise<CredentialRecord | null> {
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; tenantId: string; slug: string; metadataJson: any }>>(
      'SELECT id,"tenantId",slug,"metadataJson" FROM "CoreCatalogRecord" WHERE resource IN ($1,$2,$3) AND (slug=$4 OR "metadataJson"->>\'apiKey\'=$4 OR "metadataJson"->>\'key\'=$4) ORDER BY "updatedAt" DESC LIMIT 1',
      'public-api-credentials',
      'api-credentials',
      'storefront-api-credentials',
      apiKey,
    );
    const row = rows[0];
    if (!row) return null;
    const meta = row.metadataJson || {};
    const tenantId = clean(meta.tenantId || meta.tenant || row.tenantId);
    const stores = parseStores(meta.stores || meta.allowedStores, tenantId);
    const accessMode = accessModeFor(meta, stores);
    return {
      credentialId: clean(meta.credentialId || row.id) || undefined,
      apiKey: clean(meta.apiKey || meta.key || row.slug),
      apiSecret: clean(meta.apiSecret || meta.secret) || undefined,
      secretHash: clean(meta.secretHash) || undefined,
      tenantId,
      siteId: clean(meta.siteId || meta.site) || undefined,
      scopes: array(meta.scopes).length ? array(meta.scopes).map(clean).filter(Boolean) : split(meta.scopes || RUNTIME_SCOPES),
      stores,
      status: clean(meta.status || 'active'),
      accessMode,
      serviceClient: accessMode === 'published-stores',
    };
  } catch {
    return null;
  }
}

function scopeAllowed(scopes: string[], required: string[]) {
  const set = new Set(scopes.map(norm));
  const aliases: Record<string, string[]> = {
    'pricing:calculate': ['storefront:pricing'],
    'checkout:create': ['storefront:checkout'],
    'storefront:domains': ['storefront:manage'],
    'storefront:publish': ['storefront:manage'],
  };
  return required.every((scope) => {
    const key = norm(scope);
    return set.has('*') || set.has(key) || (key.includes(':') && set.has(`${key.split(':')[0]}:*`)) || (aliases[key] || []).some((alias) => set.has(alias));
  });
}

function requestedStoreId(request: Request) {
  const url = new URL(request.url);
  return clean(request.headers.get('x-store-id') || url.searchParams.get('storeId') || url.searchParams.get('store'));
}

function explicitStore(record: CredentialRecord, wanted: string) {
  return (record.stores || []).find((store) => [store.storeId, store.siteId, store.slug].filter(Boolean).map(String).includes(wanted));
}

async function storedStore(wanted: string): Promise<PublicApiStoreAccess | null> {
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; slug: string; metadataJson: any }>>(
      'SELECT "tenantId",slug,"metadataJson" FROM "CoreCatalogRecord" WHERE resource=$1 AND (id=$2 OR slug=$2 OR "metadataJson"->>\'storeId\'=$2 OR "metadataJson"->>\'siteId\'=$2) ORDER BY "updatedAt" DESC LIMIT 1',
      'storefront-stores',
      wanted,
    );
    const row = rows[0];
    if (!row) return null;
    const meta = row.metadataJson || {};
    return {
      storeId: clean(meta.storeId || meta.siteId || row.slug),
      tenantId: clean(meta.tenantId || row.tenantId),
      siteId: clean(meta.siteId || meta.storeId || row.slug) || undefined,
      slug: clean(meta.storeSlug || meta.slug || row.slug) || undefined,
      domains: array(meta.domains).map((item) => host(typeof item === 'string' ? item : item?.domain)).filter(Boolean),
      status: clean(meta.status || 'draft'),
    };
  } catch {
    return null;
  }
}

function canAccess(record: CredentialRecord | PublicApiAuthContext, store: PublicApiStoreAccess) {
  const mode = record.accessMode || 'tenant';
  if (mode === 'published-stores') return norm(store.status) === 'published';
  if (mode === 'explicit-stores') {
    return (record.stores || []).some((allowed) => [allowed.storeId, allowed.siteId, allowed.slug].filter(Boolean).map(String).includes(store.storeId) && (!allowed.tenantId || allowed.tenantId === store.tenantId));
  }
  return Boolean(record.tenantId && record.tenantId === store.tenantId);
}

export function publicApiCanAccessStore(auth: PublicApiAuthContext, store: PublicApiStoreAccess) {
  return canAccess(auth, store);
}

export async function requirePublicApiCredentials(request: Request, requiredScopes: string[] = ['storefront:read']): Promise<PublicApiAuthResult> {
  const apiKey = clean(request.headers.get('x-api-key'));
  const apiSecret = clean(request.headers.get('x-api-secret'));
  if (!apiKey || !apiSecret) return { ok: false, response: publicApiError(401, 'API_CREDENTIALS_REQUIRED', 'Public API requests require x-api-key and x-api-secret headers.') };

  const db = await dbCredential(apiKey);
  const candidates = [...parseEnvCredentials(), ...(db ? [db] : [])];
  const record = candidates.find((item) => item.apiKey === apiKey && verifySecret(apiSecret, item));
  if (!record || ['disabled', 'revoked', 'inactive'].includes(norm(record.status))) return { ok: false, response: publicApiError(401, 'API_CREDENTIALS_INVALID', 'The supplied API credentials are invalid or inactive.') };
  if (!scopeAllowed(record.scopes || [], requiredScopes)) return { ok: false, response: publicApiError(403, 'API_SCOPE_FORBIDDEN', `This API credential is missing required scope(s): ${requiredScopes.join(', ')}.`) };

  const wantedStore = requestedStoreId(request);
  let store: PublicApiStoreAccess | undefined;
  if (wantedStore) {
    store = explicitStore(record, wantedStore) || undefined;
    const persisted = await storedStore(wantedStore);
    if (persisted) store = persisted;
    if (!store || !canAccess(record, store)) return { ok: false, response: publicApiError(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested store.') };
  } else if ((record.stores || []).length === 1) {
    store = record.stores?.[0];
  }

  const tenantId = store?.tenantId || record.tenantId;
  const siteId = store?.siteId || record.siteId || store?.storeId;
  const accessMode = record.accessMode || 'tenant';
  return {
    ok: true,
    apiKey,
    credentialId: record.credentialId,
    tenantId,
    siteId,
    store,
    stores: record.stores || [],
    scopes: record.scopes || [],
    accessMode,
    serviceClient: accessMode === 'published-stores' || record.serviceClient === true,
    ctx: { tenantId, ...(siteId ? { siteId } : {}) },
  };
}

export function publicApiRequestFor(request: Request, ctx: TenantContext, method = request.method || 'GET') {
  const url = new URL(request.url);
  url.searchParams.set('tenantId', ctx.tenantId);
  if (ctx.siteId) url.searchParams.set('siteId', ctx.siteId);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', ctx.tenantId);
  if (ctx.siteId) headers.set('x-site-id', ctx.siteId);
  return new Request(url, { method, headers });
}
