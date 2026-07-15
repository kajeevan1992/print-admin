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
  apiSecret: string;
  tenantId: string;
  siteId?: string;
  scopes?: string[];
  stores?: PublicApiStoreAccess[];
  status?: string;
};

function clean(value: unknown) { return String(value || '').trim(); }
function norm(value: unknown) { return clean(value).toLowerCase(); }
function split(value: unknown) { return clean(value).split(/[\s,]+/).map((item) => item.trim()).filter(Boolean); }
function host(value: unknown) { return norm(value).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''); }
function jsonError(status: number, error: string, message: string) { return NextResponse.json({ ok: false, error, message }, { status }); }
function sameSecret(left: string, right: string) {
  const a = crypto.createHash('sha256').update(String(left || '')).digest();
  const b = crypto.createHash('sha256').update(String(right || '')).digest();
  return crypto.timingSafeEqual(a, b);
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
      domains: array(data.domains).map(host).filter(Boolean),
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
          apiSecret: clean(item?.apiSecret || item?.secret),
          tenantId,
          siteId: clean(item?.siteId || item?.site) || undefined,
          scopes: array(item?.scopes).length ? array(item.scopes).map(clean).filter(Boolean) : split(item?.scopes || process.env.PUBLIC_API_SCOPES || 'catalog:read storefront:read storefront:pricing storefront:checkout storefront:manage'),
          stores: parseStores(item?.stores || item?.allowedStores || process.env.PUBLIC_API_ALLOWED_STORES, tenantId),
          status: clean(item?.status || 'active'),
        });
      }
    } catch {}
  }
  const apiKey = clean(process.env.PUBLIC_API_KEY || process.env.STOREFRONT_API_KEY);
  const apiSecret = clean(process.env.PUBLIC_API_SECRET || process.env.STOREFRONT_API_SECRET);
  const tenantId = clean(process.env.PUBLIC_API_TENANT_ID || process.env.STOREFRONT_API_TENANT_ID || process.env.TENANT_ID);
  if (apiKey && apiSecret && tenantId) {
    records.push({
      apiKey,
      apiSecret,
      tenantId,
      siteId: clean(process.env.PUBLIC_API_SITE_ID || process.env.STOREFRONT_API_SITE_ID) || undefined,
      scopes: split(process.env.PUBLIC_API_SCOPES || 'catalog:read storefront:read storefront:pricing storefront:checkout storefront:manage'),
      stores: parseStores(process.env.PUBLIC_API_ALLOWED_STORES || process.env.STOREFRONT_API_ALLOWED_STORES, tenantId),
      status: 'active',
    });
  }
  return records.filter((item) => item.apiKey && item.apiSecret && item.tenantId);
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
      apiSecret: clean(meta.apiSecret || meta.secret || meta.secretHash),
      tenantId,
      siteId: clean(meta.siteId || meta.site) || undefined,
      scopes: array(meta.scopes).length ? array(meta.scopes).map(clean).filter(Boolean) : split(meta.scopes || 'catalog:read storefront:read storefront:pricing storefront:checkout'),
      stores: parseStores(meta.stores || meta.allowedStores, tenantId),
      status: clean(meta.status || 'active'),
    };
  } catch {
    return null;
  }
}
function scopeAllowed(scopes: string[], required: string[]) {
  const set = new Set(scopes.map(norm));
  return required.every((scope) => set.has('*') || set.has(norm(scope)) || (scope.includes(':') && set.has(`${scope.split(':')[0]}:*`)));
}
function requestedStoreId(request: Request) {
  const url = new URL(request.url);
  return clean(request.headers.get('x-store-id') || url.searchParams.get('storeId') || url.searchParams.get('store'));
}
function resolveStore(record: CredentialRecord, request: Request): PublicApiStoreAccess | undefined {
  const wanted = requestedStoreId(request);
  const stores = record.stores || [];
  if (!wanted) return stores.length === 1 ? stores[0] : undefined;
  return stores.find((store) => [store.storeId, store.siteId, store.slug].filter(Boolean).map(String).includes(wanted));
}

export async function requirePublicApiCredentials(request: Request, requiredScopes: string[] = ['storefront:read']): Promise<PublicApiAuthResult> {
  const apiKey = clean(request.headers.get('x-api-key'));
  const apiSecret = clean(request.headers.get('x-api-secret'));
  if (!apiKey || !apiSecret) return { ok: false, response: jsonError(401, 'API_CREDENTIALS_REQUIRED', 'Public API requests require x-api-key and x-api-secret headers.') };

  const candidates = [...parseEnvCredentials(), await dbCredential(apiKey)].filter(Boolean) as CredentialRecord[];
  const record = candidates.find((item) => item.apiKey === apiKey && sameSecret(apiSecret, item.apiSecret));
  if (!record || ['disabled', 'revoked', 'inactive'].includes(norm(record.status))) return { ok: false, response: jsonError(401, 'API_CREDENTIALS_INVALID', 'The supplied API credentials are invalid or inactive.') };
  if (!scopeAllowed(record.scopes || [], requiredScopes)) return { ok: false, response: jsonError(403, 'API_SCOPE_FORBIDDEN', `This API credential is missing required scope(s): ${requiredScopes.join(', ')}.`) };

  const store = resolveStore(record, request);
  const wantedStore = requestedStoreId(request);
  if (wantedStore && !store) return { ok: false, response: jsonError(403, 'STORE_ACCESS_FORBIDDEN', 'This API credential is not authorised for the requested store.') };
  if (store && store.tenantId && store.tenantId !== record.tenantId) return { ok: false, response: jsonError(403, 'STORE_TENANT_MISMATCH', 'Requested store does not belong to the authorised tenant for this credential.') };

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
