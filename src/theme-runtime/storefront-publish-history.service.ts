import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import { getRegisteredStorefrontThemes, normaliseThemeKey } from '@/theme-runtime/registry';
import { clearStorefrontRuntimeSettingsCache } from '@/theme-runtime/storefront-settings-loader';

const HISTORY_RESOURCE = 'storefront-publish-history';
const STORE_RESOURCE = 'storefront-stores';
const SETTINGS_RESOURCE = 'hosted-theme-settings';
const HISTORY_LIMIT = 50;

type JsonObject = Record<string, any>;
type CatalogRow = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  description: string;
  metadataJson: JsonObject | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

type TenantScope = {
  canonicalTenantId: string;
  tenantSlug: string;
  tenantIds: string[];
};

type StoreRow = CatalogRow & {
  storeSlug: string;
  storeName: string;
};

type PublishSnapshot = {
  themeKey: string;
  brand: JsonObject;
  content: JsonObject;
  layout: JsonObject;
  navigation: any[];
  sections: any[];
  updatedAt?: string;
  publishedAt?: string;
};

type HistorySource = 'baseline' | 'publish' | 'restore';

function clean(value: unknown) {
  return String(value || '').trim();
}

function slug(value: unknown) {
  return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

function iso(value?: Date | string) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function hasKeys(value: unknown) {
  return Object.keys(object(value)).length > 0;
}

function historySlug(storeSlug: string, version: number) {
  return `${slug(storeSlug)}-v${version}`;
}

function collectMediaUrls(value: unknown, output = new Set<string>()) {
  if (typeof value === 'string') {
    if (value.includes('/api/native-storefront/media/')) output.add(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaUrls(item, output));
    return output;
  }
  if (value && typeof value === 'object') {
    Object.values(value as JsonObject).forEach((item) => collectMediaUrls(item, output));
  }
  return output;
}

function snapshotSummary(snapshot: PublishSnapshot) {
  return {
    homepageSections: array(snapshot.sections).length,
    contentPages: array(object(snapshot.content).pages).length,
    navigationItems: array(snapshot.navigation).length,
    mediaAssets: collectMediaUrls(snapshot).size,
  };
}

function snapshotChecksum(snapshot: PublishSnapshot) {
  return crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

async function resolveTenantScope(tenantSlugOrId: string): Promise<TenantScope> {
  const requested = clean(tenantSlugOrId);
  const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; defaultSubdomain: string }>>(
    'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
    requested,
  ).catch(() => []);
  const tenant = rows[0];
  return {
    canonicalTenantId: tenant?.id || requested,
    tenantSlug: tenant?.slug || requested,
    tenantIds: uniq([requested, tenant?.id || '', tenant?.slug || '', tenant?.defaultSubdomain || '']),
  };
}

async function loadStore(scope: TenantScope, requestedStoreSlug: string): Promise<StoreRow> {
  const requested = slug(requestedStoreSlug);
  if (!requested || !scope.tenantIds.length) throw new Error('Choose a storefront before viewing publish history.');
  const placeholders = scope.tenantIds.map((_, index) => `$${index + 1}`).join(',');
  const rows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE resource='${STORE_RESOURCE}' AND "tenantId" IN (${placeholders})
     ORDER BY "updatedAt" DESC`,
    ...scope.tenantIds,
  ).catch(() => []);
  for (const row of rows) {
    const metadata = object(row.metadataJson);
    const storeSlug = slug(metadata.storeSlug || metadata.slug || metadata.storeId || row.slug);
    if (storeSlug !== requested) continue;
    return {
      ...row,
      storeSlug,
      storeName: clean(metadata.name || metadata.title || row.name || storeSlug),
    };
  }
  throw new Error('Storefront store not found for this tenant.');
}

async function loadThemeRow(store: StoreRow): Promise<CatalogRow | null> {
  const rows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1 AND resource=$2 AND slug=$3
     ORDER BY "updatedAt" DESC LIMIT 1`,
    store.tenantId,
    SETTINGS_RESOURCE,
    store.storeSlug,
  ).catch(() => []);
  return rows[0] || null;
}

function publishedSnapshot(store: StoreRow, themeRow: CatalogRow | null): PublishSnapshot {
  const themeMetadata = object(themeRow?.metadataJson);
  const storeMetadata = object(store.metadataJson);
  const published = object(themeMetadata.published);
  if (hasKeys(published)) {
    return {
      themeKey: normaliseThemeKey(published.themeKey || themeMetadata.themeKey || storeMetadata.theme || storeMetadata.selectedTheme),
      brand: object(published.brand),
      content: object(published.content),
      layout: object(published.layout),
      navigation: array(published.navigation),
      sections: array(published.sections),
      updatedAt: clean(published.updatedAt),
      publishedAt: clean(published.publishedAt || themeMetadata.publishedAt),
    };
  }
  return {
    themeKey: normaliseThemeKey(themeMetadata.themeKey || storeMetadata.theme || storeMetadata.selectedTheme),
    brand: { ...object(storeMetadata.branding || storeMetadata.brand), ...object(themeMetadata.brand) },
    content: { ...object(storeMetadata.content), ...object(themeMetadata.contentOverrides || themeMetadata.content) },
    layout: { ...object(storeMetadata.layout), ...object(themeMetadata.layout) },
    navigation: array(themeMetadata.navigation).length ? array(themeMetadata.navigation) : array(storeMetadata.navigation),
    sections: array(themeMetadata.sections).length ? array(themeMetadata.sections) : array(object(storeMetadata.content).sections),
    updatedAt: iso(themeRow?.updatedAt || store.updatedAt),
    publishedAt: clean(themeMetadata.publishedAt),
  };
}

async function upsertThemeRecord(tx: any, store: StoreRow, metadata: JsonObject) {
  await tx.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
     ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       "metadataJson"=EXCLUDED."metadataJson",
       "updatedAt"=NOW()`,
    `theme-${crypto.randomUUID()}`,
    store.tenantId,
    SETTINGS_RESOURCE,
    store.storeSlug,
    `${store.storeName} theme settings`,
    'Draft and published storefront theme settings.',
    JSON.stringify(metadata),
  );
}

async function updateStoreRecord(tx: any, store: StoreRow, metadata: JsonObject) {
  await tx.$executeRawUnsafe(
    'UPDATE "CoreCatalogRecord" SET "metadataJson"=$1::jsonb,"updatedAt"=NOW() WHERE id=$2 AND "tenantId"=$3',
    JSON.stringify(metadata),
    store.id,
    store.tenantId,
  );
}

async function writeHistoryRecord(
  tx: any,
  store: StoreRow,
  input: {
    version: number;
    snapshot: PublishSnapshot;
    actorId?: string;
    source: HistorySource;
    navigationManaged: boolean;
    restoredFromVersion?: number;
  },
) {
  const metadata = {
    storeSlug: store.storeSlug,
    storeName: store.storeName,
    version: input.version,
    themeKey: input.snapshot.themeKey,
    publishedAt: clean(input.snapshot.publishedAt) || new Date().toISOString(),
    actorId: clean(input.actorId),
    source: input.source,
    restoredFromVersion: input.restoredFromVersion || null,
    navigationManaged: input.navigationManaged,
    checksum: snapshotChecksum(input.snapshot),
    summary: snapshotSummary(input.snapshot),
    snapshot: clone(input.snapshot),
  };
  await tx.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
     ON CONFLICT ("tenantId",resource,slug) DO NOTHING`,
    `storefront-history-${crypto.randomUUID()}`,
    store.tenantId,
    HISTORY_RESOURCE,
    historySlug(store.storeSlug, input.version),
    `${store.storeName} published version ${input.version}`,
    'Immutable storefront publish snapshot.',
    JSON.stringify(metadata),
  );
  await tx.$executeRawUnsafe(
    `DELETE FROM "CoreCatalogRecord"
     WHERE id IN (
       SELECT id FROM "CoreCatalogRecord"
       WHERE "tenantId"=$1 AND resource=$2 AND slug LIKE $3
       ORDER BY COALESCE(("metadataJson"->>'version')::integer, 0) DESC
       OFFSET ${HISTORY_LIMIT}
     )`,
    store.tenantId,
    HISTORY_RESOURCE,
    `${store.storeSlug}-v%`,
  );
  return metadata;
}

async function ensureCurrentVersionCaptured(
  store: StoreRow,
  themeRow: CatalogRow | null,
  actorId = '',
  source: HistorySource = 'baseline',
) {
  const metadata = object(themeRow?.metadataJson);
  const version = Number(metadata.publishedVersion || 0);
  if (!Number.isInteger(version) || version < 1) return null;
  const snapshot = publishedSnapshot(store, themeRow);
  const navigationManaged = metadata.navigationManaged === true;
  await (platformPrisma as any).$transaction(async (tx: any) => {
    await writeHistoryRecord(tx, store, { version, snapshot, actorId, source, navigationManaged });
  });
  return { version, snapshot };
}

function publicHistoryItem(row: CatalogRow, currentVersion: number) {
  const metadata = object(row.metadataJson);
  const version = Number(metadata.version || 0);
  return {
    id: row.slug,
    version,
    themeKey: clean(metadata.themeKey),
    publishedAt: clean(metadata.publishedAt || row.updatedAt),
    actorId: clean(metadata.actorId),
    source: clean(metadata.source || 'publish'),
    restoredFromVersion: Number(metadata.restoredFromVersion || 0) || null,
    checksum: clean(metadata.checksum),
    summary: {
      homepageSections: Number(object(metadata.summary).homepageSections || 0),
      contentPages: Number(object(metadata.summary).contentPages || 0),
      navigationItems: Number(object(metadata.summary).navigationItems || 0),
      mediaAssets: Number(object(metadata.summary).mediaAssets || 0),
    },
    current: version === currentVersion,
  };
}

async function listRows(store: StoreRow) {
  return platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1 AND resource=$2 AND slug LIKE $3
     ORDER BY COALESCE(("metadataJson"->>'version')::integer, 0) DESC
     LIMIT ${HISTORY_LIMIT}`,
    store.tenantId,
    HISTORY_RESOURCE,
    `${store.storeSlug}-v%`,
  ).catch(() => []);
}

export async function captureStorefrontPublishHistory(
  tenantSlugOrId: string,
  storeSlugInput: string,
  actorId = '',
) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await loadStore(scope, storeSlugInput);
  const themeRow = await loadThemeRow(store);
  await ensureCurrentVersionCaptured(store, themeRow, actorId, 'publish');
  return listStorefrontPublishHistory(tenantSlugOrId, storeSlugInput);
}

export async function listStorefrontPublishHistory(tenantSlugOrId: string, storeSlugInput: string) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await loadStore(scope, storeSlugInput);
  const themeRow = await loadThemeRow(store);
  await ensureCurrentVersionCaptured(store, themeRow);
  const themeMetadata = object(themeRow?.metadataJson);
  const currentVersion = Number(themeMetadata.publishedVersion || 0);
  const rows = await listRows(store);
  return {
    tenant: { id: scope.canonicalTenantId, slug: scope.tenantSlug },
    store: { id: store.id, slug: store.storeSlug, name: store.storeName },
    currentVersion,
    retentionLimit: HISTORY_LIMIT,
    items: rows.map((row) => publicHistoryItem(row, currentVersion)),
  };
}

export async function restoreStorefrontPublishVersion(
  tenantSlugOrId: string,
  input: {
    storeSlug: string;
    version: number;
    expectedCurrentVersion?: number;
    confirmation: string;
    actorId?: string;
  },
) {
  const targetVersion = Number(input.version);
  if (!Number.isInteger(targetVersion) || targetVersion < 1) throw new Error('Choose a valid published version to restore.');
  if (clean(input.confirmation) !== `RESTORE VERSION ${targetVersion}`) throw new Error(`Type RESTORE VERSION ${targetVersion} to confirm this rollback.`);

  const scope = await resolveTenantScope(tenantSlugOrId);
  const store = await loadStore(scope, input.storeSlug);
  const themeRow = await loadThemeRow(store);
  if (!themeRow) throw new Error('Storefront theme settings were not found.');
  await ensureCurrentVersionCaptured(store, themeRow);

  const themeMetadata = object(themeRow.metadataJson);
  const currentVersion = Number(themeMetadata.publishedVersion || 0);
  if (Number.isInteger(input.expectedCurrentVersion) && Number(input.expectedCurrentVersion) !== currentVersion) {
    throw new Error('The live storefront changed after this history screen loaded. Refresh and try again.');
  }
  if (targetVersion === currentVersion) throw new Error('That version is already live.');

  const targetRows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1`,
    store.tenantId,
    HISTORY_RESOURCE,
    historySlug(store.storeSlug, targetVersion),
  ).catch(() => []);
  const targetMetadata = object(targetRows[0]?.metadataJson);
  const targetSnapshot = object(targetMetadata.snapshot) as PublishSnapshot;
  if (!targetRows[0] || !hasKeys(targetSnapshot)) throw new Error('The selected storefront version was not found.');

  const targetThemeKey = normaliseThemeKey(targetSnapshot.themeKey);
  const registered = getRegisteredStorefrontThemes().some((theme) => theme.key === targetThemeKey || theme.aliases?.includes(targetThemeKey));
  if (!registered) throw new Error('The selected version uses a theme that is no longer installed.');

  const now = new Date().toISOString();
  const nextVersion = Math.max(currentVersion, 0) + 1;
  const restoredSnapshot: PublishSnapshot = {
    ...clone(targetSnapshot),
    themeKey: targetThemeKey,
    updatedAt: now,
    publishedAt: now,
  };
  const navigationManaged = targetMetadata.navigationManaged === true;
  const nextThemeMetadata = {
    ...themeMetadata,
    themeKey: targetThemeKey,
    status: 'published',
    publishedVersion: nextVersion,
    draftVersion: nextVersion,
    publishedAt: now,
    navigationManaged,
    draftNavigationManaged: navigationManaged,
    brand: restoredSnapshot.brand,
    contentOverrides: restoredSnapshot.content,
    layout: restoredSnapshot.layout,
    navigation: restoredSnapshot.navigation,
    sections: restoredSnapshot.sections,
    published: restoredSnapshot,
    draft: restoredSnapshot,
  };
  const storeMetadata = object(store.metadataJson);
  const nextStoreMetadata = {
    ...storeMetadata,
    theme: targetThemeKey,
    selectedTheme: targetThemeKey,
    draftTheme: targetThemeKey,
  };

  await (platformPrisma as any).$transaction(async (tx: any) => {
    await upsertThemeRecord(tx, store, nextThemeMetadata);
    await updateStoreRecord(tx, store, nextStoreMetadata);
    await writeHistoryRecord(tx, store, {
      version: nextVersion,
      snapshot: restoredSnapshot,
      actorId: input.actorId,
      source: 'restore',
      restoredFromVersion: targetVersion,
      navigationManaged,
    });
  });

  clearStorefrontRuntimeSettingsCache();
  const history = await listStorefrontPublishHistory(tenantSlugOrId, store.storeSlug);
  return {
    restored: {
      fromVersion: targetVersion,
      publishedVersion: nextVersion,
      themeKey: targetThemeKey,
      publishedAt: now,
    },
    history,
  };
}
