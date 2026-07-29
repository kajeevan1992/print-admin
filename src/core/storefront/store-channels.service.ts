import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import { assertTenantCanCreateStore } from '@/core/platform/store-allowance.service';
import { reservePlatformSubdomainForStore } from '@/core/storefront/store-domain-bindings.service';

const CANONICAL_RESOURCE = 'storefront-stores';
const LEGACY_RESOURCE = 'store-channels';

type CatalogRow = {
  id: string;
  tenantId: string;
  resource: string;
  slug: string;
  name: string;
  description: string;
  metadataJson: Record<string, any> | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function slugify(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || `channel-${Date.now()}`;
}

function channelStatus(value: unknown): 'active' | 'inactive' {
  const next = clean(value).toLowerCase();
  return ['inactive', 'draft', 'archived'].includes(next) ? 'inactive' : 'active';
}

function storefrontStatus(value: unknown): 'draft' | 'published' | 'archived' {
  const next = clean(value).toLowerCase();
  if (next === 'archived') return 'archived';
  return channelStatus(next) === 'active' ? 'published' : 'draft';
}

function tenantIdFromSession(session: any) {
  return clean(session.tenantId || 'holo-print');
}

function cleanDomain(value: unknown) {
  return clean(value).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

async function resolveTenantScope(tenantSlugOrId: string) {
  const requested = clean(tenantSlugOrId);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    requested,
  ).catch(() => []);
  const tenant = rows[0];
  return {
    slug: clean(tenant?.slug || requested),
    ids: unique([requested, tenant?.id || '', tenant?.slug || '', tenant?.defaultSubdomain || '']),
  };
}

function mapRow(row: CatalogRow) {
  const meta = object(row.metadataJson);
  const status = channelStatus(meta.channelStatus || meta.status);
  return {
    id: clean(meta.storeId || meta.id || row.id),
    name: clean(meta.name || row.name),
    slug: slugify(meta.storeSlug || meta.slug || row.slug),
    domain: clean(meta.domain || meta.platformSubdomain || array(meta.domains)[0]),
    platformSubdomain: clean(meta.platformSubdomain || meta.defaultSubdomain),
    status,
    themeId: clean(meta.themeId || meta.themeKey || meta.theme || meta.selectedTheme || 'base'),
    currency: clean(meta.currency || 'GBP'),
    locale: clean(meta.locale || 'en-GB'),
    isHeadless: Boolean(meta.isHeadless || meta.storeType === 'external' || meta.channelType === 'external-api'),
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : clean(row.createdAt),
    publicApiKey: clean(meta.publicApiKey),
    privateApiKey: '',
    domainStatus: clean(meta.domainStatus),
    hostedThemeEnabled: meta.hostedThemeEnabled !== false,
    externalApiEnabled: Boolean(meta.externalApiEnabled),
  };
}

function canonicalMetadata(row: CatalogRow, tenantSlug: string) {
  const meta = object(row.metadataJson);
  const channel = mapRow(row);
  const domain = cleanDomain(channel.domain);
  const platformSubdomain = cleanDomain(channel.platformSubdomain);
  const themeId = clean(channel.themeId || 'base');
  const domains = unique([
    ...array(meta.domains).map(cleanDomain),
    domain,
    platformSubdomain,
  ]);

  return {
    ...meta,
    id: channel.id,
    storeId: channel.id,
    tenantId: row.tenantId,
    name: channel.name,
    title: channel.name,
    slug: channel.slug,
    storeSlug: channel.slug,
    status: storefrontStatus(meta.status || channel.status),
    channelStatus: channel.status,
    themeId,
    themeKey: themeId,
    theme: clean(meta.theme || meta.selectedTheme || themeId),
    selectedTheme: clean(meta.selectedTheme || meta.theme || themeId),
    draftTheme: clean(meta.draftTheme || meta.selectedTheme || meta.theme || themeId),
    branding: object(meta.branding),
    content: object(meta.content),
    navigation: array(meta.navigation || meta.nav),
    domains,
    domain,
    defaultSubdomain: cleanDomain(meta.defaultSubdomain || platformSubdomain),
    platformSubdomain,
    previewUrl: clean(meta.previewUrl) || `/native-stores/${tenantSlug}/${channel.slug}`,
    currency: channel.currency,
    locale: channel.locale,
    isHeadless: channel.isHeadless,
    storeType: channel.isHeadless ? 'external' : 'hosted',
    channelType: channel.isHeadless ? 'external-api' : 'hosted',
    externalApiEnabled: channel.isHeadless,
    hostedThemeEnabled: !channel.isHeadless,
    createdAt: clean(meta.createdAt || row.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function upsertCanonicalStore(row: CatalogRow, tenantSlug: string) {
  const metadata = canonicalMetadata(row, tenantSlug);
  const recordId = `store-${crypto.randomUUID()}`;
  await platformPrisma.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
     ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       "metadataJson"=EXCLUDED."metadataJson",
       "updatedAt"=NOW()`,
    recordId,
    row.tenantId,
    CANONICAL_RESOURCE,
    metadata.storeSlug,
    metadata.name,
    row.description || `Storefront store ${metadata.name}`,
    JSON.stringify(metadata),
  );
  return { ...row, id: recordId, resource: CANONICAL_RESOURCE, slug: metadata.storeSlug, metadataJson: metadata } as CatalogRow;
}

export async function ensureCanonicalStorefrontStoresForTenant(tenantSlugOrId: string) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  if (!scope.ids.length) return { promoted: 0 };
  const placeholders = scope.ids.map((_, index) => `$${index + 1}`).join(',');
  const rows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",resource,slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId" IN (${placeholders}) AND resource IN ('${CANONICAL_RESOURCE}','${LEGACY_RESOURCE}')
     ORDER BY CASE WHEN resource='${CANONICAL_RESOURCE}' THEN 0 ELSE 1 END,"updatedAt" DESC`,
    ...scope.ids,
  );

  const canonicalKeys = new Set(
    rows.filter((row) => row.resource === CANONICAL_RESOURCE)
      .map((row) => `${row.tenantId}:${slugify(object(row.metadataJson).storeSlug || object(row.metadataJson).slug || row.slug)}`),
  );
  let promoted = 0;
  for (const row of rows) {
    if (row.resource !== LEGACY_RESOURCE) continue;
    const key = `${row.tenantId}:${slugify(object(row.metadataJson).storeSlug || object(row.metadataJson).slug || row.slug)}`;
    if (canonicalKeys.has(key)) continue;
    await upsertCanonicalStore(row, scope.slug);
    canonicalKeys.add(key);
    promoted += 1;
  }
  return { promoted };
}

async function readChannelRows(tenantId: string, search = '') {
  const q = clean(search);
  return platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",resource,slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1
       AND resource IN ($2,$3)
       AND ($4='' OR lower(name || ' ' || slug || ' ' || description || ' ' || coalesce("metadataJson"::text,'')) LIKE lower($5))
     ORDER BY CASE WHEN resource=$2 THEN 0 ELSE 1 END,"updatedAt" DESC`,
    tenantId,
    CANONICAL_RESOURCE,
    LEGACY_RESOURCE,
    q,
    `%${q}%`,
  );
}

export async function listStoreChannels(search = '', filterStatus?: string) {
  const session = await requireTenantSession();
  const tenantId = tenantIdFromSession(session);
  const scope = await resolveTenantScope(tenantId);
  await ensureCanonicalStorefrontStoresForTenant(tenantId);
  const rows = (await Promise.all(scope.ids.map((id) => readChannelRows(id, search)))).flat();
  const seen = new Set<string>();
  const items = rows
    .map(mapRow)
    .filter((item) => {
      if (seen.has(item.slug)) return false;
      seen.add(item.slug);
      return !filterStatus || item.status === filterStatus;
    });
  return { items, pagination: { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 } };
}

export async function saveStoreChannel(input: Record<string, unknown>) {
  const session = await requireTenantSession();
  const tenantId = tenantIdFromSession(session);
  const tenantScope = await resolveTenantScope(tenantId);
  const requestedId = clean(input.id || `channel-${crypto.randomUUID()}`);
  const storeSlug = slugify(input.slug || input.name || requestedId);
  await assertTenantCanCreateStore(tenantId, storeSlug);

  const existingRows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",resource,slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1
       AND resource IN ($2,$3)
       AND (id=$4 OR slug=$5 OR "metadataJson"->>'storeId'=$4 OR "metadataJson"->>'slug'=$5 OR "metadataJson"->>'storeSlug'=$5)
     ORDER BY CASE WHEN resource=$2 THEN 0 ELSE 1 END,"updatedAt" DESC`,
    tenantId,
    CANONICAL_RESOURCE,
    LEGACY_RESOURCE,
    requestedId,
    storeSlug,
  );
  const existing = existingRows[0];
  const previous = object(existing?.metadataJson);
  const name = clean(input.name || previous.name || storeSlug);
  const customDomain = cleanDomain(input.domain);
  const isHeadless = Boolean(input.isHeadless);
  const themeId = clean(input.themeId || previous.themeId || previous.themeKey || previous.theme || 'base');
  const platformDomain = customDomain ? null : await reservePlatformSubdomainForStore(tenantId, storeSlug, name);
  const domain = customDomain || cleanDomain(platformDomain?.domain || previous.domain);
  const platformSubdomain = cleanDomain(platformDomain?.domain || previous.platformSubdomain);
  const channelState = channelStatus(input.status || previous.channelStatus || previous.status);
  const metadata = {
    ...previous,
    id: clean(previous.storeId || previous.id || requestedId),
    storeId: clean(previous.storeId || previous.id || requestedId),
    tenantId,
    name,
    title: name,
    slug: storeSlug,
    storeSlug,
    domain,
    domains: unique([...array(previous.domains).map(cleanDomain), domain, platformSubdomain]),
    platformSubdomain,
    defaultSubdomain: cleanDomain(previous.defaultSubdomain || platformSubdomain),
    platformRootDomain: clean(platformDomain?.rootDomain || previous.platformRootDomain),
    domainMode: customDomain ? 'custom-domain' : 'platform-subdomain',
    domainStatus: customDomain ? 'pending-verification' : clean(platformDomain?.status || previous.domainStatus || 'platform-subdomain'),
    status: storefrontStatus(channelState),
    channelStatus: channelState,
    themeId,
    themeKey: themeId,
    theme: clean(previous.theme || previous.selectedTheme || themeId),
    selectedTheme: clean(previous.selectedTheme || previous.theme || themeId),
    draftTheme: clean(previous.draftTheme || previous.selectedTheme || previous.theme || themeId),
    branding: object(previous.branding),
    content: object(previous.content),
    navigation: array(previous.navigation || previous.nav),
    previewUrl: clean(previous.previewUrl) || `/native-stores/${tenantScope.slug}/${storeSlug}`,
    currency: clean(input.currency || previous.currency || 'GBP'),
    locale: clean(input.locale || previous.locale || 'en-GB'),
    isHeadless,
    storeType: isHeadless ? 'external' : 'hosted',
    channelType: isHeadless ? 'external-api' : 'hosted',
    externalApiEnabled: isHeadless,
    hostedThemeEnabled: !isHeadless,
    paymentProvider: clean(previous.paymentProvider || 'tenant_stripe_connect_pending'),
    createdAt: clean(previous.createdAt || existing?.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const canonicalId = existing?.resource === CANONICAL_RESOURCE ? existing.id : `store-${crypto.randomUUID()}`;
  await platformPrisma.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
     ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       "metadataJson"=EXCLUDED."metadataJson",
       "updatedAt"=NOW()`,
    canonicalId,
    tenantId,
    CANONICAL_RESOURCE,
    storeSlug,
    name,
    isHeadless ? 'External API storefront channel' : 'Hosted storefront channel',
    JSON.stringify(metadata),
  );
  return mapRow({ id: canonicalId, tenantId, resource: CANONICAL_RESOURCE, slug: storeSlug, name, description: '', metadataJson: metadata, createdAt: new Date() });
}
