import crypto from 'crypto';
import { platformPrisma } from '@/core/db/platform-prisma';
import {
  getRegisteredStorefrontThemes,
  normaliseThemeKey,
} from '@/theme-runtime/registry';
import { loadRuntimeMenuItems } from '@/theme-runtime/menu-loader';
import { sanitizeStorefrontNavigation } from '@/theme-runtime/navigation-payload';
import { clearStorefrontRuntimeSettingsCache } from '@/theme-runtime/storefront-settings-loader';
import type {
  StorefrontThemeFieldSchema,
  StorefrontThemeKey,
  StorefrontThemeManifest,
} from '@/theme-runtime/types';

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
  status: string;
  liveThemeKey: StorefrontThemeKey;
  previewUrl: string;
};

type ThemeSnapshot = {
  themeKey: StorefrontThemeKey;
  brand: JsonObject;
  content: JsonObject;
  layout: JsonObject;
  navigation: any[];
  sections: any[];
  updatedAt?: string;
  publishedAt?: string;
};

export type StorefrontThemeAdminAction = 'save-draft' | 'publish' | 'discard-draft';
export type StorefrontThemeAdminMutation = {
  action: StorefrontThemeAdminAction;
  storeSlug: string;
  themeKey?: string;
  values?: Record<string, unknown>;
};

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

function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function hasKeys(value: unknown) {
  return Object.keys(object(value)).length > 0;
}

function getPath(source: unknown, path: string) {
  return path.split('.').filter(Boolean).reduce<any>((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, source as any);
}

function setPath(target: JsonObject, path: string, value: unknown) {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return;
  let current = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }
    current[part] = object(current[part]);
    current = current[part];
  });
}

function themeFields(manifest: StorefrontThemeManifest) {
  return [...(manifest.editor?.content || []), ...(manifest.editor?.settings || [])];
}

function resolveManifest(value: string | null | undefined) {
  const requested = clean(value);
  const manifest = getRegisteredStorefrontThemes().find((item) => (
    item.key === requested || item.aliases?.some((alias) => alias === requested)
  ));
  if (!manifest) throw new Error(`Theme ${requested || '(empty)'} is not registered.`);
  return manifest;
}

function sanitizeField(field: StorefrontThemeFieldSchema, value: unknown) {
  if (field.type === 'boolean') return value === true || value === 'true' || value === 1 || value === '1';
  if (field.type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  if (field.type === 'colour') {
    const colour = clean(value);
    if (!/^#[0-9a-fA-F]{6}$/.test(colour)) throw new Error(`${field.label} must be a six-digit hex colour.`);
    return colour;
  }
  if (field.type === 'select') {
    const selected = clean(value);
    if (field.options?.length && !field.options.some((option) => option.value === selected)) throw new Error(`${field.label} has an invalid option.`);
    return selected;
  }
  if (field.type === 'navigation') return sanitizeStorefrontNavigation(value);
  if (field.type === 'sections') {
    if (Array.isArray(value)) return jsonClone(value);
    if (!clean(value)) return [];
    try {
      const parsed = JSON.parse(String(value));
      if (!Array.isArray(parsed)) throw new Error('not-array');
      return parsed;
    } catch {
      throw new Error(`${field.label} must be a valid JSON array.`);
    }
  }
  return clean(value);
}

function defaultEditorValue(field: StorefrontThemeFieldSchema) {
  if (field.type === 'boolean') return field.path.startsWith('layout.show') ? true : false;
  if (field.type === 'sections' || field.type === 'navigation') return [];
  return '';
}

function editorValues(manifest: StorefrontThemeManifest, snapshot: ThemeSnapshot) {
  const values: Record<string, unknown> = {};
  for (const field of themeFields(manifest)) {
    const value = getPath(snapshot, field.path);
    values[field.path] = value === undefined ? defaultEditorValue(field) : jsonClone(value);
  }
  return values;
}

function applyEditorValues(manifest: StorefrontThemeManifest, base: ThemeSnapshot, input: Record<string, unknown>) {
  const next = jsonClone(base) as ThemeSnapshot;
  for (const field of themeFields(manifest)) {
    if (!(field.path in input)) continue;
    setPath(next as unknown as JsonObject, field.path, sanitizeField(field, input[field.path]));
  }
  next.themeKey = manifest.key;
  next.updatedAt = new Date().toISOString();
  return next;
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

async function loadStores(scope: TenantScope): Promise<StoreRow[]> {
  if (!scope.tenantIds.length) return [];
  const placeholders = scope.tenantIds.map((_, index) => `$${index + 1}`).join(',');
  const rows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE resource='storefront-stores' AND "tenantId" IN (${placeholders})
     ORDER BY "updatedAt" DESC`,
    ...scope.tenantIds,
  ).catch(() => []);
  const seen = new Set<string>();
  const output: StoreRow[] = [];
  for (const row of rows) {
    const metadata = object(row.metadataJson);
    const storeSlug = slug(metadata.storeSlug || metadata.slug || metadata.storeId || row.slug);
    if (!storeSlug || seen.has(storeSlug)) continue;
    seen.add(storeSlug);
    output.push({
      ...row,
      storeSlug,
      storeName: clean(metadata.name || metadata.title || row.name || storeSlug),
      status: clean(metadata.status || 'published').toLowerCase(),
      liveThemeKey: normaliseThemeKey(metadata.theme || metadata.selectedTheme),
      previewUrl: `/native-stores/${scope.tenantSlug}/${storeSlug}`,
    });
  }
  return output;
}

async function loadThemeRow(store: StoreRow) {
  const rows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
    `SELECT id,"tenantId",slug,name,description,"metadataJson","createdAt","updatedAt"
     FROM "CoreCatalogRecord"
     WHERE "tenantId"=$1 AND resource='hosted-theme-settings' AND slug=$2
     ORDER BY "updatedAt" DESC LIMIT 1`,
    store.tenantId,
    store.storeSlug,
  ).catch(() => []);
  return rows[0] || null;
}

function snapshotFromPublished(store: StoreRow, themeMetadata: JsonObject, fallbackNavigation: any[]): ThemeSnapshot {
  const storeMetadata = object(store.metadataJson);
  const storeContent = object(storeMetadata.content);
  const published = object(themeMetadata.published);
  const navigationManaged = themeMetadata.navigationManaged === true;
  if (hasKeys(published)) {
    const publishedNavigation = array(published.navigation);
    return {
      themeKey: normaliseThemeKey(published.themeKey || themeMetadata.themeKey || store.liveThemeKey),
      brand: object(published.brand),
      content: object(published.content),
      layout: object(published.layout),
      navigation: navigationManaged || publishedNavigation.length ? publishedNavigation : jsonClone(fallbackNavigation),
      sections: array(published.sections),
      updatedAt: clean(published.updatedAt),
      publishedAt: clean(published.publishedAt),
    };
  }
  const storedNavigation = array(themeMetadata.navigation).length ? array(themeMetadata.navigation) : array(storeMetadata.navigation);
  return {
    themeKey: normaliseThemeKey(themeMetadata.themeKey || store.liveThemeKey),
    brand: { ...object(storeMetadata.branding || storeMetadata.brand), ...object(themeMetadata.brand) },
    content: { ...storeContent, ...object(themeMetadata.contentOverrides || themeMetadata.content) },
    layout: { ...object(storeMetadata.layout), ...object(themeMetadata.layout) },
    navigation: navigationManaged || storedNavigation.length ? storedNavigation : jsonClone(fallbackNavigation),
    sections: array(themeMetadata.sections).length ? array(themeMetadata.sections) : array(storeContent.sections),
    updatedAt: '',
    publishedAt: '',
  };
}

function snapshotFromDraft(published: ThemeSnapshot, themeMetadata: JsonObject, storeMetadata: JsonObject): ThemeSnapshot {
  const draft = object(themeMetadata.draft);
  if (!hasKeys(draft)) {
    return { ...jsonClone(published), themeKey: normaliseThemeKey(storeMetadata.draftTheme || published.themeKey) };
  }
  const draftNavigation = array(draft.navigation);
  const draftNavigationManaged = themeMetadata.draftNavigationManaged === true;
  return {
    themeKey: normaliseThemeKey(draft.themeKey || storeMetadata.draftTheme || published.themeKey),
    brand: object(draft.brand),
    content: object(draft.content),
    layout: object(draft.layout),
    navigation: draftNavigationManaged || draftNavigation.length ? draftNavigation : jsonClone(published.navigation),
    sections: array(draft.sections),
    updatedAt: clean(draft.updatedAt),
    publishedAt: clean(draft.publishedAt),
  };
}

function serialiseManifest(manifest: StorefrontThemeManifest) {
  return {
    id: manifest.key,
    key: manifest.key,
    name: manifest.name,
    description: manifest.description || '',
    version: manifest.version,
    author: manifest.source === 'built-in' ? 'Print Admin' : 'Uploaded theme',
    previewImage: manifest.name.slice(0, 2).toUpperCase(),
    supportedFeatures: themeFields(manifest).map((field) => field.label),
    source: manifest.source,
    aliases: manifest.aliases || [],
    editor: manifest.editor || { content: [], settings: [] },
  };
}

function stateFromRows(scope: TenantScope, stores: StoreRow[], selectedStore: StoreRow | null, themeRow: CatalogRow | null, fallbackNavigation: any[]) {
  const manifests = getRegisteredStorefrontThemes();
  const themeMetadata = object(themeRow?.metadataJson);
  const storeMetadata = object(selectedStore?.metadataJson);
  const published = selectedStore ? snapshotFromPublished(selectedStore, themeMetadata, fallbackNavigation) : null;
  const draft = published ? snapshotFromDraft(published, themeMetadata, storeMetadata) : null;
  const selectedManifest = draft ? resolveManifest(draft.themeKey) : manifests[0];
  const publishedManifest = published ? resolveManifest(published.themeKey) : manifests[0];
  const draftValues = draft && selectedManifest ? editorValues(selectedManifest, draft) : {};
  const publishedValues = published && publishedManifest ? editorValues(publishedManifest, published) : {};
  const hasDraftChanges = Boolean(draft && published && (
    draft.themeKey !== published.themeKey || JSON.stringify(draftValues) !== JSON.stringify(publishedValues)
  ));
  return {
    tenant: { id: scope.canonicalTenantId, slug: scope.tenantSlug },
    themes: manifests.map(serialiseManifest),
    stores: stores.map((store) => ({
      id: store.id,
      slug: store.storeSlug,
      name: store.storeName,
      status: store.status,
      liveThemeKey: store.liveThemeKey,
      previewUrl: store.previewUrl,
      updatedAt: iso(store.updatedAt),
    })),
    selectedStore: selectedStore ? {
      id: selectedStore.id,
      slug: selectedStore.storeSlug,
      name: selectedStore.storeName,
      status: selectedStore.status,
      liveThemeKey: selectedStore.liveThemeKey,
      previewUrl: selectedStore.previewUrl,
      updatedAt: iso(selectedStore.updatedAt),
    } : null,
    revision: selectedStore && draft && published ? {
      storeSlug: selectedStore.storeSlug,
      liveThemeKey: published.themeKey,
      draftThemeKey: draft.themeKey,
      publishedVersion: Number(themeMetadata.publishedVersion || 0),
      draftVersion: Number(themeMetadata.draftVersion || themeMetadata.publishedVersion || 0),
      publishedAt: clean(themeMetadata.publishedAt || published.publishedAt),
      draftUpdatedAt: clean(draft.updatedAt || themeRow?.updatedAt),
      hasDraftChanges,
      values: draftValues,
      publishedValues,
    } : null,
  };
}

async function loadAdminRows(tenantSlugOrId: string, requestedStoreSlug?: string, requireExactStore = false) {
  const scope = await resolveTenantScope(tenantSlugOrId);
  const stores = await loadStores(scope);
  const requested = slug(requestedStoreSlug);
  const exactStore = requested ? stores.find((store) => store.storeSlug === requested) || null : null;
  if (requireExactStore && requested && !exactStore) throw new Error('Storefront store not found for this tenant.');
  const selectedStore = exactStore || (!requested ? stores[0] || null : null);
  const [themeRow, fallbackNavigation] = await Promise.all([
    selectedStore ? loadThemeRow(selectedStore) : Promise.resolve(null),
    selectedStore ? loadRuntimeMenuItems(scope.tenantIds).catch(() => []) : Promise.resolve([]),
  ]);
  return { scope, stores, selectedStore, themeRow, fallbackNavigation };
}

export async function getStorefrontThemeAdminState(tenantSlugOrId: string, requestedStoreSlug?: string) {
  const rows = await loadAdminRows(tenantSlugOrId, requestedStoreSlug);
  return stateFromRows(rows.scope, rows.stores, rows.selectedStore, rows.themeRow, rows.fallbackNavigation);
}

async function upsertThemeRecord(tx: any, store: StoreRow, metadata: JsonObject) {
  const id = `theme-${crypto.randomUUID()}`;
  await tx.$executeRawUnsafe(
    `INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt")
     VALUES ($1,$2,'hosted-theme-settings',$3,$4,$5,$6::jsonb,NOW())
     ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET
       name=EXCLUDED.name,
       description=EXCLUDED.description,
       "metadataJson"=EXCLUDED."metadataJson",
       "updatedAt"=NOW()`,
    id,
    store.tenantId,
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

export async function mutateStorefrontThemeAdmin(
  tenantSlugOrId: string,
  input: StorefrontThemeAdminMutation,
) {
  const rows = await loadAdminRows(tenantSlugOrId, input.storeSlug, true);
  const { scope, selectedStore, themeRow, fallbackNavigation } = rows;
  if (!selectedStore) throw new Error('Storefront store not found for this tenant.');

  const storeMetadata = object(selectedStore.metadataJson);
  const themeMetadata = object(themeRow?.metadataJson);
  const published = snapshotFromPublished(selectedStore, themeMetadata, fallbackNavigation);
  const currentDraft = snapshotFromDraft(published, themeMetadata, storeMetadata);
  const manifest = resolveManifest(input.themeKey || currentDraft.themeKey);
  const now = new Date().toISOString();
  const managesNavigation = themeFields(manifest).some((field) => field.type === 'navigation' && field.path === 'navigation')
    && Object.prototype.hasOwnProperty.call(object(input.values), 'navigation');

  if (input.action === 'save-draft') {
    const draft = applyEditorValues(manifest, { ...currentDraft, themeKey: manifest.key }, object(input.values));
    const draftVersion = Math.max(Number(themeMetadata.draftVersion || 0), Number(themeMetadata.publishedVersion || 0)) + 1;
    const nextThemeMetadata = {
      ...themeMetadata,
      themeKey: published.themeKey,
      status: Number(themeMetadata.publishedVersion || 0) > 0 ? 'published' : 'draft',
      draftVersion,
      draftNavigationManaged: managesNavigation || themeMetadata.draftNavigationManaged === true,
      draft: { ...draft, themeKey: manifest.key, updatedAt: now },
    };
    const nextStoreMetadata = { ...storeMetadata, draftTheme: manifest.key };
    await (platformPrisma as any).$transaction(async (tx: any) => {
      await upsertThemeRecord(tx, selectedStore, nextThemeMetadata);
      await updateStoreRecord(tx, selectedStore, nextStoreMetadata);
    });
  } else if (input.action === 'publish') {
    const draft = applyEditorValues(manifest, { ...currentDraft, themeKey: manifest.key }, object(input.values));
    const publishedVersion = Math.max(Number(themeMetadata.publishedVersion || 0), 0) + 1;
    const publishedSnapshot = { ...draft, themeKey: manifest.key, updatedAt: now, publishedAt: now };
    const navigationManaged = managesNavigation || themeMetadata.draftNavigationManaged === true || themeMetadata.navigationManaged === true;
    const nextThemeMetadata = {
      ...themeMetadata,
      themeKey: manifest.key,
      status: 'published',
      publishedVersion,
      draftVersion: publishedVersion,
      publishedAt: now,
      navigationManaged,
      draftNavigationManaged: navigationManaged,
      brand: publishedSnapshot.brand,
      contentOverrides: publishedSnapshot.content,
      layout: publishedSnapshot.layout,
      navigation: publishedSnapshot.navigation,
      sections: publishedSnapshot.sections,
      published: publishedSnapshot,
      draft: publishedSnapshot,
    };
    const nextStoreMetadata = {
      ...storeMetadata,
      theme: manifest.key,
      selectedTheme: manifest.key,
      draftTheme: manifest.key,
    };
    await (platformPrisma as any).$transaction(async (tx: any) => {
      await upsertThemeRecord(tx, selectedStore, nextThemeMetadata);
      await updateStoreRecord(tx, selectedStore, nextStoreMetadata);
    });
  } else if (input.action === 'discard-draft') {
    const nextThemeMetadata = {
      ...themeMetadata,
      draftVersion: Number(themeMetadata.publishedVersion || 0),
      draftNavigationManaged: themeMetadata.navigationManaged === true,
      draft: published,
    };
    const nextStoreMetadata = { ...storeMetadata, draftTheme: published.themeKey };
    await (platformPrisma as any).$transaction(async (tx: any) => {
      await upsertThemeRecord(tx, selectedStore, nextThemeMetadata);
      await updateStoreRecord(tx, selectedStore, nextStoreMetadata);
    });
  } else {
    throw new Error('Unsupported theme admin action.');
  }

  clearStorefrontRuntimeSettingsCache();
  const refreshedThemeRow = await loadThemeRow(selectedStore);
  const refreshedStores = await loadStores(scope);
  const refreshedStore = refreshedStores.find((store) => store.storeSlug === selectedStore.storeSlug) || selectedStore;
  return stateFromRows(scope, refreshedStores, refreshedStore, refreshedThemeRow, fallbackNavigation);
}
