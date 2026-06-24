import { platformPrisma } from '@/core/db/platform-prisma';
import { requireSuperAdmin } from '@/core/auth/session-guard.service';

type TenantRow = { id: string; slug: string; name: string; defaultSubdomain: string; themeKey?: string | null; storefrontsLimit?: number | null };
async function ensureRecordTable() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"resource" TEXT NOT NULL,"slug" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT NOT NULL DEFAULT '',"metadataJson" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenant_resource_slug_uq" ON "CoreCatalogRecord"("tenantId","resource","slug")');
}
function defaultStorePayload(tenant: TenantRow) {
  const name = `${tenant.name} Store`;
  return { id: `store-${tenant.slug}-default`, tenantId: tenant.id, tenantSlug: tenant.slug, slug: 'default-store', name, storeType: 'hosted', channelType: 'hosted', status: 'draft', themeKey: tenant.themeKey || 'base', defaultStore: true, externalApiEnabled: false, paymentProvider: 'tenant_stripe_connect_pending', domainMode: 'platform-subdomain', defaultSubdomain: tenant.defaultSubdomain };
}
export async function ensureDefaultStoreForTenant(tenant: TenantRow) {
  await ensureRecordTable();
  const payload = defaultStorePayload(tenant);
  await platformPrisma.$executeRawUnsafe('INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW()) ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,"metadataJson"=EXCLUDED."metadataJson","updatedAt"=NOW()', payload.id, tenant.id, 'store-channels', 'default-store', payload.name, 'Default hosted storefront for this tenant.', JSON.stringify(payload));
  return payload;
}
export async function bootstrapDefaultStores() {
  await requireSuperAdmin();
  const rows = await platformPrisma.$queryRawUnsafe<TenantRow[]>('SELECT id,slug,name,"defaultSubdomain","themeKey","storefrontsLimit" FROM "Tenant" ORDER BY "createdAt" DESC');
  const stores = [];
  for (const tenant of rows) stores.push(await ensureDefaultStoreForTenant(tenant));
  return { tenantsChecked: rows.length, stores };
}
