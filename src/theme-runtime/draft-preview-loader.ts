import { platformPrisma } from '@/core/db/platform-prisma';
import { normaliseStorefrontContentPages } from '@/theme-runtime/content-pages';
import { normaliseRuntimeMenuItem } from '@/theme-runtime/menu-normaliser';
import { normaliseThemeKey } from '@/theme-runtime/registry';
import {
  loadStorefrontRuntimeSettings,
  resolveStorefrontTenantIds,
} from '@/theme-runtime/storefront-settings-loader';
import type { StorefrontHomepageSection, StorefrontMenuItem, StorefrontRuntimeSettings } from '@/theme-runtime/types';

type CatalogRow = {
  tenantId: string;
  metadataJson: Record<string, any> | null;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function normaliseSections(value: unknown): StorefrontHomepageSection[] {
  return array(value).map((section, index) => {
    const source = object(section);
    return {
      ...source,
      id: clean(source.id) || `section-${index + 1}`,
      type: clean(source.type || 'text-image').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      enabled: source.enabled !== false,
    };
  }).filter((section) => section.enabled && section.type).slice(0, 30);
}

function normaliseNavigation(value: unknown): StorefrontMenuItem[] {
  return array(value)
    .map(normaliseRuntimeMenuItem)
    .filter((item) => item.enabled && item.label && item.path)
    .sort((left, right) => left.order - right.order);
}

async function findStoreAndTheme(tenantIds: string[], storeSlug: string) {
  for (const tenantId of tenantIds) {
    const stores = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
      `SELECT "tenantId","metadataJson"
       FROM "CoreCatalogRecord"
       WHERE "tenantId"=$1
         AND resource='storefront-stores'
         AND (
           slug=$2
           OR "metadataJson"->>'storeId'=$2
           OR "metadataJson"->>'slug'=$2
           OR "metadataJson"->>'storeSlug'=$2
         )
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      tenantId,
      storeSlug,
    ).catch(() => []);
    const store = stores[0];
    if (!store) continue;
    const themes = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
      `SELECT "tenantId","metadataJson"
       FROM "CoreCatalogRecord"
       WHERE "tenantId"=$1 AND resource='hosted-theme-settings' AND slug=$2
       ORDER BY "updatedAt" DESC
       LIMIT 1`,
      store.tenantId,
      storeSlug,
    ).catch(() => []);
    return { store, theme: themes[0] || null };
  }
  return null;
}

export async function loadStorefrontDraftRuntimeSettings(
  tenantSlug: string,
  storeSlug: string,
  resolvedTenantIds?: string[],
): Promise<StorefrontRuntimeSettings> {
  const tenantIds = resolvedTenantIds?.length ? resolvedTenantIds : await resolveStorefrontTenantIds(tenantSlug);
  const live = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug, tenantIds);
  const rows = await findStoreAndTheme(tenantIds, storeSlug);
  if (!rows) return live;

  const storeMetadata = object(rows.store.metadataJson);
  const themeMetadata = object(rows.theme?.metadataJson);
  const draft = object(themeMetadata.draft);
  if (!Object.keys(draft).length) return live;

  const draftSections = Array.isArray(draft.sections) ? normaliseSections(draft.sections) : live.sections;
  const content = { ...live.content, ...object(draft.content) };
  const navigationManaged = themeMetadata.draftNavigationManaged === true;
  const navigation = navigationManaged || Array.isArray(draft.navigation)
    ? normaliseNavigation(draft.navigation)
    : live.navigation;
  return {
    ...live,
    themeKey: normaliseThemeKey(draft.themeKey || storeMetadata.draftTheme || live.themeKey),
    brand: { ...live.brand, ...object(draft.brand) },
    content,
    layout: { ...live.layout, ...object(draft.layout) },
    navigation,
    navigationManaged,
    sections: draftSections,
    pages: normaliseStorefrontContentPages(content.pages),
    themePublished: false,
    themeVersion: Number(themeMetadata.draftVersion || themeMetadata.publishedVersion || live.themeVersion || 0),
  };
}
