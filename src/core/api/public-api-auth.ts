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
};

export type PublicApiAuthContext = {
  ok: true;
  apiKey: string;
  tenantId: string;
  siteId?: string;
  store?: PublicApiStoreAccess;
  stores: PublicApiStoreAccess[];
  scopes: string[];
  ctx: TenantContext;
};

export type PublicApiAuthResult = PublicApiAuthContext | { ok: false; response: NextResponse };

type CredentialRecord = {
  apiKey: string;
  apiSecret?: string;
  apiSecretHash?: string;
  tenantId: string;
  siteId?: string;
  scopes?: string[];
  stores?: PublicApiStoreAccess[];
  status?: string;
};

const DEFAULT_SCOPES = [
  'storefront:resolve',
  'storefront:read',
  'catalog:read',
  'pricing:calculate',
  'checkout:create',
  'storefront:manage',
  'storefront:publish',
  'storefront:domains',
];

function clean(value: unknown) { return String(value || '').trim(); }
function norm(value: unknown) { return clean(value).toLowerCase(); }
function split(value: unknown) { return clean(value).split(/[\s,]+/).map((item) => item.trim()).filter(Boolean); }
function normaliseHost(value: unknown) { return norm(value).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''); }
function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}
function shaHex(value: string) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function sameText(left: string, right: string) {
  const a = crypto.createHash('sha256').update(String(left || '')).digest();
  const b = crypto.createHash('sha256').update(String(right || '')).digest();
  return crypto.timingSafeEqual(a, b);
}
function matchesHash(value: string, expectedHash: string) {
  const actual = Buffer.from(shaHex(value), 'utf8');
  const expected = Buffer.from(clean(expectedHash).toLowerCase(), 'utf8');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function secretMatches(value: string, record: CredentialRecord) {
  if (record.apiSecretHash) return matchesHash(value, record.apiSecretHash);
  if (record.apiSecret) return sameText(value, record.apiSecret);
  return false;
}
function array(value: unknown): any[] { return Array.isArray(value) ? value : []; }
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
      domains: array(data.domains).map(normaliseHost).filter(Boolean),
    };
  }).filter((item) => item.storeId && item.tenantId);
}
function parseEnvCredentials(): CredentialRecord[] {
  const json = clean(process.env.PUBLIC_API_CREDENTIALS_JSON || process.env.STOREFRONT_API_CREDENTIALS_JSON);
  const records: CredentialRecord[] = [];
  if (json) {
    try {
      const parsed = JSON.parse(json);
      for (const item of array(parsed)) {
        const tenantId = clean(item?.tenantId || item?.tenant || process.env.PUBLIC_API_TENANT_ID || process.env.TENANT_ID);
        records.push({
          apiKey: clean(item?.apiKey || item?.key),
          apiSecret: clean(item?.apiSecret || item?.secret) || undefined,
          apiSecretHash: clean(item?.apiSecretHash || item?.secretHash) || undefined,
          tenantId,
          siteId: clean(item?.siteId || item?.site) || undefined,
          scopes: array(item?.scopes).length ? array(item.scopes).map(clean).filter(Boolean) : split(item?.scopes || process.env.PUBLIC_API_SCOPES || DEFAULT_SCOPES.join(' ')),
          stores: parseStores(item?.stores || item?.allowedStores || process.env.PUBLIC_API_ALLOWED_STORES, tenantId),
          status: clean(item?.status || 'active'),
        });
      }
    } catch {}
  }
  const apiKey = clean(process.env.PUBLIC_API_KEY || process.env.STOREFRONT_API_KEY);
  const apiSecret = clean(process.env.PUBLIC_API_SECRET || process.env.STOREFRONT_API_SECRET);
  const apiSecretHash = clean(process.env.PUBLIC_API_SECRET_HASH || process.env.STOREFRONT_API_SECRET_HASH);
  const tenantId = clean(process.env.PUBLIC_API_TENANT_ID || process.env.STOREFRONT_API_TENANT_ID || process.env.TENANT_ID);
  if (apiKey && (apiSecret || apiSecretHash) && tenantId) {
    records.push({
      apiKey,
      apiSecret: apiSecret || undefined,
      apiSecretHash: apiSecretHash || undefined,
      tenantId,
      siteId: clean(process.env.PUBLIC_API_SITE_ID || process.env.STOREFRONT_API_SITE_ID) || undefined,
      scopes: split(process.env.PUBLIC_API_SCOPES || DEFAULT_SCOPES.join(' ')),
      stores: parseStores(process.env.PUBLIC_API_ALLOWED_STORES || process.env.STOREFRONT_API_ALLOWED_STORES, tenantId),
      status: 'active',
    });
  }
  return records.filter((item) => item.apiKey && (item.apiSecret || item.apiSecretHash) && item.tenantId);
}
async function dbCredential(apiKey: string): Promise<CredentialRecord | null> {
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ tenantId: string; slug: string; metadataJson: any }>>(
      'SELECT "tenantId", slug, "metadataJson" FROM "CoreCatalogRecord" WHERE resource IN ($1,$2,$3) AND (slug=$4 OR "metadataJson"->>\'apiKey\'=$4 OR "metadataJson"->>\'key\'=$4) ORDER BY "updatedAt" DESC LIMIT 1',
      'public-api-credentials',
      'api-credentials',
      'storefront-api-credentials',
      apiKey,
    );
    const row = rows[0];
    const meta = row?.metadataJson || {};
    if (!row) return null;
    const tenantId = clean(meta.tenantId || meta.tenant || row.tenantId);
    return {
      apiKey: clean(meta.apiKey || meta.key || row.slug),
      apiSecret: clean(meta.apiSecret || meta.secret) || undefined,
      apiSecretHash: clean(meta.apiSecretHash || meta.secretHash) || undefined,
      tenantId,
      siteId: clean(meta.siteId || meta.site) || undefined,
      scopes: array(meta.scopes).length ? array(meta.scopes).map(clean).filter(Boolean) : split(meta.scopes || DEFAULT_SCOPES.join(' ')),
      stores: parseStores(meta.stores || meta.allowedStores, tenantId),
      status: clean(meta.status || 'active'),
    };
  } catch {
    return null;
  }
}
function scopeAllowed(scopes: string[], required: string[]) {
  const aliases: Record<string, string[]> = {
    'storefront:resolve': ['storefront:read'],
    'pricing:calculate': ['storefront:pricing'],
    'checkout:create': ['storefront:checkout'],
  };
  const set = new Set(scopes.map(norm));
  return required.every((scope) => {
    const requested = norm(scope);
    const namespaceWildcard = requested.includes(':') ? `${requested.split(':')[0]}:*` : '';
    return set.has('*') || set.has(requested) || Boolean(namespaceWildcard && set.has(namespaceWildcard)) || (aliases[requested] || []).some((alias) => set.has(alias));
  });
}
function requestedStoreId(request: Request) {
  const url = new URL(request.url);
  return clean(request.headers.get('x-store-id') || url.searchParams.get('storeId') || url.searchParams.get('store'));
}
function requestedHost(request: Request) {
  const url = new URL(request.url);
  return normaliseHost(url.searchParams.get('host') || '');
}
function resolveStore(record: CredentialRecord, request: Request): PublicApiStoreAccess | undefined {
  const wanted = requestedStoreId(request);
  const wantedHost = requestedHost(request);
  const stores = record.stores || [];
  if (wanted) return stores.find((store) => [store.storeId, store.siteId, store.slug].filter(Boolean).map(String).includes(wanted));
  if (wantedHost) {
    return stores.find((store) => {
      const domains = (store.domains || []).map(normaliseHost);
      return domains.includes(wantedHost) || normaliseHost(store.slug) === wantedHost.split('.')[0];
    });
  }
  return stores.length === 1 ? stores[0] : undefined;
}

export async function requirePublicApiCredentials(request: Request, requiredScopes: string[] = ['storefront:read']): Promise<PublicApiAuthResult> {
  const apiKey = clean(request.headers.get('x-api-key'));
  const apiSecret = clean(request.headers.get('x-api-secret'));
  if (!apiKey || !apiSecret) return { ok: false, response: jsonError(401, 'API_CREDENTIALS_REQUIRED', 'Public API requests require x-api-key and x-api-secret headers.') };

  const candidates = [...parseEnvCredentials(), await dbCredential(apiKey)].filter(Boolean) as CredentialRecord[];
  const record = candidates.find((item) => item.apiKey === apiKey && secretMatches(apiSecret, item));
  if (!record || ['disabled', 'revoked', 'inactive'].includes(norm(record.status))) return { ok: false, response: jsonError(401, 'API_CREDENTIALS_INVALID', 'The supplied API credentials are invalid or inactive.') };
  if (!scopeAllowed(record.scopes || [], requiredScopes)) return { ok: false, response: jsonError(403, 'API_SCOPE_FORBIDDEN', `This API credential is missing required scope(s): ${requiredScopes.join(', ')}.`) };

  const store = resolveStore(record, request);
  const wantedStore = requestedStoreId(request);
  const wantedHost = requestedHost(request);
  if ((wantedStore || wantedHost) && (record.stores || []).length > 0 && !store) {
    return { ok: false, response: jsonError(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested store or host.') };
  }

  // Explicit allowed-store membership is authoritative for restricted shared service clients.
  // Tenant authority is always derived from the matched allowed store, never from browser input.
  const tenantId = store?.tenantId || record.tenantId;
  const siteId = store?.siteId || record.siteId || store?.storeId;
  return { ok: true, apiKey, tenantId, siteId, store, stores: record.stores || [], scopes: record.scopes || [], ctx: { tenantId, ...(siteId ? { siteId } : {}) } };
}

export function publicApiRequestFor(request: Request, ctx: TenantContext) {
  const url = new URL(request.url);
  url.searchParams.set('tenantId', ctx.tenantId);
  if (ctx.siteId) url.searchParams.set('siteId', ctx.siteId);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', ctx.tenantId);
  if (ctx.siteId) headers.set('x-site-id', ctx.siteId);
  return new Request(url, { method: 'GET', headers });
}
