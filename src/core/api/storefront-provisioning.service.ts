import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { createStore, findStore, publishStore, updateStore } from '@/core/api/storefront-v1.service';
import type { TenantContext } from '@/core/tenant/types';

const CREDENTIAL_RESOURCE = 'storefront-api-credentials';
const RUNTIME_SCOPES = [
  'storefront:resolve',
  'storefront:read',
  'catalog:read',
  'pricing:calculate',
  'checkout:create',
];

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function host(value: unknown) { return clean(value).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''); }
function sha(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function nowIso() { return new Date().toISOString(); }
function asObject(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function arr(value: unknown): any[] { return Array.isArray(value) ? value : []; }

export type StorefrontProvisioningInput = {
  tenant: { name: string; slug: string };
  store: {
    id?: string;
    name: string;
    slug: string;
    theme: string;
    status?: 'draft' | 'published';
    domain: string;
    branding?: Record<string, any>;
    content?: Record<string, any>;
    navigation?: any[];
  };
  product: {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    category?: { id?: string; name: string; slug: string; description?: string };
    priceFromMinor?: number;
    currency?: string;
    productType?: string;
    metadataJson: Record<string, any>;
  };
  rotateCredential?: boolean;
};

type ExistingCredentialRow = { id: string; slug: string; metadataJson: Record<string, any> | null };
type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  defaultSubdomain: string;
  themeKey: string;
};

function validateInput(input: StorefrontProvisioningInput) {
  const tenantSlug = slug(input?.tenant?.slug);
  const storeSlug = slug(input?.store?.slug);
  const productSlug = slug(input?.product?.slug);
  const domain = host(input?.store?.domain);
  const theme = clean(input?.store?.theme);
  const metadata = asObject(input?.product?.metadataJson);
  const optionGroups = arr(metadata.optionGroups || metadata.configurator?.optionGroups);
  const pricingRows = arr(metadata.pricingMatrix?.rows || metadata.pricingRows || metadata.matrixRows);

  if (!clean(input?.tenant?.name) || !tenantSlug) throw new Error('tenant.name and tenant.slug are required.');
  if (!clean(input?.store?.name) || !storeSlug || !theme || !domain) throw new Error('store.name, store.slug, store.theme and store.domain are required.');
  if (!clean(input?.product?.name) || !productSlug) throw new Error('product.name and product.slug are required.');
  if (!optionGroups.length) throw new Error('product.metadataJson must contain at least one option group.');
  if (!pricingRows.length) throw new Error('product.metadataJson must contain at least one authoritative pricing matrix row.');

  return { tenantSlug, storeSlug, productSlug, domain, theme, metadata };
}

async function ensureTenant(tenant: StorefrontProvisioningInput['tenant'], tenantSlug: string, domain: string, theme: string) {
  const rows = await platformPrisma.$queryRawUnsafe<TenantRow[]>(
    `INSERT INTO "Tenant" ("id","name","slug","status","defaultSubdomain","themeKey","updatedAt")
     VALUES ($1,$2,$1,'ACTIVE'::"TenantStatus",$3,$4,NOW())
     ON CONFLICT ("slug") DO UPDATE SET
       "name"=EXCLUDED."name",
       "status"='ACTIVE'::"TenantStatus",
       "defaultSubdomain"=EXCLUDED."defaultSubdomain",
       "themeKey"=EXCLUDED."themeKey",
       "updatedAt"=NOW()
     RETURNING "id","name","slug","status"::text AS "status","defaultSubdomain","themeKey"`,
    tenantSlug,
    clean(tenant.name),
    domain,
    theme,
  );

  const row = rows[0];
  if (!row?.id) throw new Error('The HOLO Print tenant could not be created or resolved.');
  return row;
}

async function rebindProvisioningRecords(legacyTenantId: string, canonicalTenantId: string) {
  if (!legacyTenantId || !canonicalTenantId || legacyTenantId === canonicalTenantId) return;

  await platformPrisma.$executeRawUnsafe(
    `UPDATE "CoreCatalogRecord" AS source
     SET "tenantId"=$2,
         "metadataJson"=CASE
           WHEN source."metadataJson" IS NULL THEN NULL
           ELSE source."metadataJson" || jsonb_build_object('tenantId',$2)
         END,
         "updatedAt"=NOW()
     WHERE source."tenantId"=$1
       AND source.resource IN ($3,$4,$5)
       AND NOT EXISTS (
         SELECT 1
         FROM "CoreCatalogRecord" AS target
         WHERE target."tenantId"=$2
           AND target.resource=source.resource
           AND target.slug=source.slug
           AND target.id<>source.id
       )`,
    legacyTenantId,
    canonicalTenantId,
    'storefront-stores',
    'storefront-domains',
    CREDENTIAL_RESOURCE,
  );
}

async function ensureStore(request: Request, ctx: TenantContext, input: StorefrontProvisioningInput, storeSlug: string, domain: string, theme: string) {
  const storeId = clean(input.store.id) || storeSlug;
  const desired = {
    storeId,
    id: storeId,
    name: clean(input.store.name),
    slug: storeSlug,
    theme,
    selectedTheme: theme,
    defaultSubdomain: domain,
    domains: [domain],
    branding: asObject(input.store.branding),
    content: asObject(input.store.content),
    navigation: arr(input.store.navigation),
  };

  let store = await findStore(ctx, storeId);
  if (!store) store = await createStore(ctx, desired, request);
  else store = await updateStore(ctx, storeId, desired);

  if ((input.store.status || 'published') === 'published' && store.status !== 'published') {
    store = await publishStore(ctx, storeId);
  }

  return store;
}

async function ensureProduct(ctx: TenantContext, input: StorefrontProvisioningInput, productSlug: string, metadata: Record<string, any>) {
  const category = input.product.category || { id: '', name: 'Print Products', slug: 'print-products', description: '' };
  const categorySlug = slug(category.slug || category.name);
  const categoryId = clean(category.id) || categorySlug;

  await upsertInternalCatalogRecord(ctx, 'categories' as any, {
    id: categoryId,
    slug: categorySlug,
    name: clean(category.name),
    title: clean(category.name),
    description: clean(category.description),
  });

  return upsertInternalCatalogRecord(ctx, 'products' as any, {
    id: clean(input.product.id) || productSlug,
    slug: productSlug,
    name: clean(input.product.name),
    title: clean(input.product.name),
    description: clean(input.product.description),
    categoryId,
    isActive: true,
    isGlobal: false,
    priceFromMinor: Number(input.product.priceFromMinor || 0) || null,
    currency: clean(input.product.currency) || 'GBP',
    productType: clean(input.product.productType) || 'STANDARD',
    metadataJson: metadata,
  });
}

async function existingCredential(tenantId: string, storeId: string) {
  const rows = await platformPrisma.$queryRawUnsafe<ExistingCredentialRow[]>(
    `SELECT id,slug,"metadataJson" FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1 AND resource=$2
       AND "metadataJson"->>'storeId'=$3
       AND COALESCE("metadataJson"->>'status','active')='active'
     ORDER BY "updatedAt" DESC LIMIT 1`,
    tenantId,
    CREDENTIAL_RESOURCE,
    storeId,
  ).catch(() => []);
  return rows[0] || null;
}

async function createOrRotateCredential(params: { tenantId: string; tenantSlug: string; store: Record<string, any>; rotate: boolean }) {
  const current = await existingCredential(params.tenantId, clean(params.store.storeId));
  if (current && !params.rotate) {
    const metadata = current.metadataJson || {};
    return {
      created: false,
      rotated: false,
      apiKey: clean(metadata.apiKey || current.slug),
      apiSecret: null,
      secretShownOnce: false,
      message: 'A credential already exists. Its secret is not recoverable; set rotateCredential=true to issue a new one.',
      scopes: arr(metadata.scopes),
    };
  }

  const apiKey = `sf_test_${crypto.randomBytes(10).toString('hex')}`;
  const apiSecret = `sfs_test_${crypto.randomBytes(32).toString('base64url')}`;
  const storeId = clean(params.store.storeId);
  const recordId = current?.id || `storefront-credential-${params.tenantSlug}-${storeId}`;
  const metadata = {
    apiKey,
    apiSecretHash: sha(apiSecret),
    tenantId: params.tenantId,
    tenantSlug: params.tenantSlug,
    siteId: storeId,
    storeId,
    scopes: RUNTIME_SCOPES,
    stores: [{
      storeId,
      tenantId: params.tenantId,
      siteId: storeId,
      slug: clean(params.store.slug),
      domains: arr(params.store.domains),
    }],
    status: 'active',
    environment: 'test',
    createdAt: current?.metadataJson?.createdAt || nowIso(),
    rotatedAt: current ? nowIso() : null,
    updatedAt: nowIso(),
  };

  await platformPrisma.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
     ON CONFLICT (id) DO UPDATE SET
       "tenantId"=EXCLUDED."tenantId",
       slug=EXCLUDED.slug,
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       "metadataJson"=EXCLUDED."metadataJson",
       "updatedAt"=NOW()`,
    recordId,
    params.tenantId,
    CREDENTIAL_RESOURCE,
    apiKey,
    `${clean(params.store.name)} test storefront credential`,
    'Restricted server-side credential for one storefront. The secret is returned only when created or rotated.',
    JSON.stringify(metadata),
  );

  return {
    created: !current,
    rotated: Boolean(current),
    apiKey,
    apiSecret,
    secretShownOnce: true,
    scopes: RUNTIME_SCOPES,
  };
}

export async function provisionStorefrontTestTarget(request: Request, input: StorefrontProvisioningInput) {
  const valid = validateInput(input);
  const tenant = await ensureTenant(input.tenant, valid.tenantSlug, valid.domain, valid.theme);
  await rebindProvisioningRecords(valid.tenantSlug, tenant.id);

  const ctx: TenantContext = { tenantId: tenant.id, siteId: clean(input.store.id) || valid.storeSlug };
  const store = await ensureStore(request, ctx, input, valid.storeSlug, valid.domain, valid.theme);
  const product = await ensureProduct(ctx, input, valid.productSlug, valid.metadata);
  const credential = await createOrRotateCredential({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    store,
    rotate: Boolean(input.rotateCredential),
  });

  return {
    tenant,
    store,
    product,
    credential,
    connection: {
      apiUrl: new URL(request.url).origin,
      resolvePath: '/api/v1/storefront/resolve',
      bootstrapPath: '/api/v1/storefront/bootstrap',
      productPath: '/api/v1/storefront/products',
      pricePath: '/api/v1/storefront/pricing/calculate',
      checkoutPath: '/api/v1/storefront/checkout/session',
    },
    testPlan: {
      firstProductSlug: valid.productSlug,
      sequence: ['resolve', 'bootstrap', 'product', 'pricing', 'checkout'],
      scope: 'One published store and one complete product only.',
    },
  };
}
