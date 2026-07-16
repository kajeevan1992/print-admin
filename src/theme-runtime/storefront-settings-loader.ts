import { platformPrisma } from '@/core/db/platform-prisma';
import { normaliseRuntimeMenuItem } from '@/theme-runtime/menu-normaliser';
import type {
  StorefrontBrandSettings,
  StorefrontHomepageSection,
  StorefrontMenuItem,
  StorefrontRuntimeSettings,
} from '@/theme-runtime/types';

export type { StorefrontBrandSettings, StorefrontHomepageSection, StorefrontRuntimeSettings } from '@/theme-runtime/types';

type CatalogRow = {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  metadataJson: Record<string, any> | null;
};

const DEFAULT_BRAND: StorefrontBrandSettings = {
  brandName: '',
  logoUrl: '',
  primary: '#18A7D0',
  accent: '#7B3FE4',
  background: '#F7F8FC',
  text: '#161A22',
  muted: '#667487',
  border: '#E3E8F0',
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function slug(value: unknown) {
  return clean(value).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function array(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function colour(value: unknown, fallback: string) {
  const next = clean(value);
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next : fallback;
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map(clean).filter(Boolean)));
}

export async function resolveStorefrontTenantIds(tenantSlugInput: string) {
  const tenantSlug = slug(tenantSlugInput);
  const fallback = uniq([tenantSlug, tenantSlug ? `tenant-${tenantSlug}` : '']);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
      'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
      tenantSlug,
    );
    const row = rows[0];
    return uniq([...fallback, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch {
    return fallback;
  }
}

async function findStoreRow(tenantIds: string[], storeSlug: string) {
  if (!storeSlug) return null;
  for (const tenantId of tenantIds) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
        `SELECT id,"tenantId",slug,name,"metadataJson"
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
      );
      if (rows[0]) return rows[0];
    } catch {}
  }
  return null;
}

async function findThemeRows(tenantIds: string[], storeSlug: string) {
  if (!storeSlug) return [];
  const rows: CatalogRow[] = [];
  for (const tenantId of tenantIds) {
    try {
      const found = await platformPrisma.$queryRawUnsafe<CatalogRow[]>(
        `SELECT id,"tenantId",slug,name,"metadataJson"
         FROM "CoreCatalogRecord"
         WHERE "tenantId"=$1 AND resource='hosted-theme-settings' AND slug=$2
         ORDER BY "updatedAt" DESC
         LIMIT 1`,
        tenantId,
        storeSlug,
      );
      if (found[0]) rows.push(found[0]);
    } catch {}
  }
  return rows;
}

function publishedTheme(rows: CatalogRow[]) {
  return rows.find((row) => {
    const meta = object(row.metadataJson);
    return clean(meta.status).toLowerCase() === 'published' || Number(meta.publishedVersion || 0) > 0;
  }) || null;
}

function normaliseSections(value: unknown): StorefrontHomepageSection[] {
  return array(value).map((section, index) => ({
    ...object(section),
    id: clean(object(section).id) || `section-${index + 1}`,
    type: slug(object(section).type || 'text-image'),
    enabled: object(section).enabled !== false,
  })).filter((section) => section.enabled && section.type).slice(0, 30);
}

function normaliseNavigation(value: unknown): StorefrontMenuItem[] {
  return array(value)
    .map(normaliseRuntimeMenuItem)
    .filter((item) => item.enabled && item.label && item.path)
    .sort((left, right) => left.order - right.order);
}

export async function loadStorefrontRuntimeSettings(
  tenantSlugInput: string,
  storeSlugInput: string,
  resolvedTenantIds?: string[],
): Promise<StorefrontRuntimeSettings> {
  const storeSlug = slug(storeSlugInput);
  const tenantIds = resolvedTenantIds?.length ? uniq(resolvedTenantIds) : await resolveStorefrontTenantIds(tenantSlugInput);
  const [storeRow, themeRows] = await Promise.all([
    findStoreRow(tenantIds, storeSlug),
    findThemeRows(tenantIds, storeSlug),
  ]);

  const store = object(storeRow?.metadataJson);
  const themeRow = publishedTheme(themeRows);
  const theme = object(themeRow?.metadataJson);
  const storeBrand = object(store.branding || store.brand);
  const themeBrand = object(theme.brand);
  const storeContent = object(store.content);
  const themeContent = object(theme.contentOverrides || theme.content);
  const themeText = object(themeContent.text);
  const storeName = clean(themeBrand.brandName || storeBrand.brandName || store.name || store.title || storeRow?.name);

  const brand: StorefrontBrandSettings = {
    brandName: storeName,
    logoUrl: clean(themeBrand.logoUrl || storeBrand.logoUrl || storeBrand.logo || store.logoUrl),
    primary: colour(themeBrand.primary || storeBrand.primary || storeBrand.primaryColor, DEFAULT_BRAND.primary),
    accent: colour(themeBrand.accent || storeBrand.accent || storeBrand.accentColor, DEFAULT_BRAND.accent),
    background: colour(themeBrand.background || storeBrand.background || storeBrand.backgroundColor, DEFAULT_BRAND.background),
    text: colour(themeBrand.text || storeBrand.text || storeBrand.textColor, DEFAULT_BRAND.text),
    muted: colour(themeBrand.muted || storeBrand.muted || storeBrand.mutedColor, DEFAULT_BRAND.muted),
    border: colour(themeBrand.border || storeBrand.border || storeBrand.borderColor, DEFAULT_BRAND.border),
  };

  const content = {
    ...storeContent,
    ...themeContent,
    text: { ...object(storeContent.text), ...themeText },
  };
  const sections = normaliseSections(theme.sections?.length ? theme.sections : storeContent.sections);
  const navigation = normaliseNavigation(theme.navigation?.length ? theme.navigation : store.navigation);

  return {
    tenantIds,
    storeSlug,
    storeName: brand.brandName,
    storeStatus: clean(store.status).toLowerCase(),
    storeFound: Boolean(storeRow),
    themeKey: clean(store.theme || store.selectedTheme || 'atlantis-native'),
    brand,
    content,
    layout: { ...object(store.layout), ...object(theme.layout) },
    navigation,
    sections,
    themePublished: Boolean(themeRow),
    themeVersion: Number(theme.publishedVersion || 0),
    source: themeRow ? 'store-and-published-theme' : storeRow ? 'store' : 'defaults',
  };
}
