import { platformPrisma } from '@/core/db/platform-prisma';
import { requireTenantSession } from '@/core/auth/session-guard.service';

const RESOURCE = 'tenant-store-allowance';
const CANONICAL_STORE_RESOURCE = 'storefront-stores';
const LEGACY_STORE_RESOURCE = 'store-channels';

function slug(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function numberLimit(value: unknown, fallback = 1) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.min(999, Math.floor(next)) : fallback;
}

async function tenantLabel(tenantId: string) {
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ name: string; slug: string }>>(
    'SELECT name,slug FROM "Tenant" WHERE id=$1 OR slug=$1 LIMIT 1',
    tenantId,
  );
  return rows[0]?.name || rows[0]?.slug || tenantId;
}

export async function getStoreAllowanceForTenant(tenantIdInput: string) {
  const tenantId = String(tenantIdInput || '');
  const rows = await platformPrisma.$queryRawUnsafe<any[]>(
    'SELECT id,"tenantId",slug,name,description,"metadataJson","updatedAt" FROM "CoreCatalogRecord" WHERE resource=$1 AND slug=$2 LIMIT 1',
    RESOURCE,
    tenantId,
  );
  const meta = rows[0]?.metadataJson || {};
  const storeRows = await platformPrisma.$queryRawUnsafe<Array<{ count: string }>>(
    `SELECT COUNT(DISTINCT COALESCE(
       NULLIF("metadataJson"->>'storeSlug',''),
       NULLIF("metadataJson"->>'slug',''),
       slug
     ))::text AS count
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1 AND resource IN ($2,$3)`,
    tenantId,
    CANONICAL_STORE_RESOURCE,
    LEGACY_STORE_RESOURCE,
  );
  const used = Number(storeRows[0]?.count || 0);
  const maxStores = numberLimit(meta.maxStores ?? 1, 1);
  return {
    tenantId,
    tenantName: meta.tenantName || await tenantLabel(tenantId),
    maxStores,
    usedStores: used,
    remainingStores: Math.max(0, maxStores - used),
    canCreateStore: used < maxStores,
    updatedAt: meta.updatedAt || rows[0]?.updatedAt || '',
  };
}

export async function saveStoreAllowance(input: Record<string, any>) {
  const tenantId = String(input.tenantId || input.tenantSlug || '').trim();
  if (!tenantId) throw new Error('Tenant id or slug is required.');
  const tenantName = input.tenantName || await tenantLabel(tenantId);
  const maxStores = numberLimit(input.maxStores, 1);
  const meta = { tenantId, tenantName, maxStores, updatedAt: new Date().toISOString() };
  await platformPrisma.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
     ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       "metadataJson"=EXCLUDED."metadataJson",
       "updatedAt"=NOW()`,
    `store-allowance-${tenantId}`,
    'platform',
    RESOURCE,
    tenantId,
    `Store allowance: ${tenantName}`,
    'Maximum hosted/external store channels allowed for a tenant.',
    JSON.stringify(meta),
  );
  return getStoreAllowanceForTenant(tenantId);
}

export async function listStoreAllowances() {
  const rows = await platformPrisma.$queryRawUnsafe<any[]>(
    'SELECT id,"tenantId",slug,name,description,"metadataJson","updatedAt" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 ORDER BY "updatedAt" DESC',
    'platform',
    RESOURCE,
  );
  return { items: await Promise.all(rows.map((row) => getStoreAllowanceForTenant(row.slug))) };
}

export async function getCurrentTenantStoreAllowance() {
  const session = await requireTenantSession();
  return getStoreAllowanceForTenant(String(session.tenantId || ''));
}

export async function assertTenantCanCreateStore(tenantId: string, slugInput: string) {
  const storeSlug = slug(slugInput);
  const existing = await platformPrisma.$queryRawUnsafe<any[]>(
    `SELECT slug
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1
       AND resource IN ($2,$3)
       AND (
         slug=$4
         OR "metadataJson"->>'storeId'=$4
         OR "metadataJson"->>'slug'=$4
         OR "metadataJson"->>'storeSlug'=$4
       )
     LIMIT 1`,
    tenantId,
    CANONICAL_STORE_RESOURCE,
    LEGACY_STORE_RESOURCE,
    storeSlug,
  );
  if (existing[0]) return { allowed: true, reason: 'updating-existing-store' };
  const allowance = await getStoreAllowanceForTenant(tenantId);
  if (!allowance.canCreateStore) {
    throw new Error(`Store limit reached. This tenant is allowed ${allowance.maxStores} store(s) and already has ${allowance.usedStores}.`);
  }
  return { allowed: true, allowance };
}
