import { platformPrisma } from '@/core/db/platform-prisma';
import { requireTenantSession } from '@/core/auth/session-guard.service';

const RESOURCE = 'hosted-theme-settings';
const SECTION_TYPES = ['hero', 'product-grid', 'category-carousel', 'text-image', 'faq', 'contact-cta', 'collection-points'] as const;
const DEFAULT_SECTIONS: any[] = [];
const DEFAULT_CONTENT_OVERRIDES = {
  selectors: {},
  text: {},
  images: {},
  attributes: {},
};

function slug(value: unknown) {
  return String(value || 'default-store').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'default-store';
}
function cleanColour(value: unknown, fallback: string) {
  const next = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(next) ? next : fallback;
}
function safeObject(value: unknown, fallback: Record<string, any> = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : fallback;
}
function safeSections(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_SECTIONS;
  return value.map((section, index) => ({ ...(typeof section === 'object' && section ? section : {}), id: String((section as any)?.id || `section-${index + 1}`), type: SECTION_TYPES.includes((section as any)?.type) ? (section as any).type : 'text-image', enabled: (section as any)?.enabled !== false })).slice(0, 30);
}
function defaultLayout(input?: Record<string, any>) {
  return {
    headerStyle: 'standard',
    footerStyle: 'standard',
    showSearch: true,
    showCollectionPoints: true,
    takeoverHomepage: false,
    lockUploadedThemeLayout: true,
    ...(input || {}),
    takeoverHomepage: false,
    lockUploadedThemeLayout: true,
  };
}
async function ensureTable() {
  await platformPrisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" ("id" TEXT PRIMARY KEY,"tenantId" TEXT NOT NULL,"resource" TEXT NOT NULL,"slug" TEXT NOT NULL,"name" TEXT NOT NULL,"description" TEXT NOT NULL DEFAULT '',"metadataJson" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  await platformPrisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenant_resource_slug_uq" ON "CoreCatalogRecord"("tenantId","resource","slug")');
}
function defaultTheme(channelSlug: string) {
  return {
    channelSlug,
    status: 'draft',
    draftVersion: 1,
    publishedVersion: 0,
    brand: { logoUrl: '', brandName: 'HOLO Print', primary: '#18a7d0', accent: '#111827', background: '#ffffff', text: '#111827' },
    layout: defaultLayout(),
    sections: DEFAULT_SECTIONS,
    contentOverrides: DEFAULT_CONTENT_OVERRIDES,
    navigation: [],
    updatedAt: new Date().toISOString(),
    publishedAt: '',
  };
}
function mapRow(row: any, channelSlug: string) {
  const base = defaultTheme(channelSlug);
  const meta = row?.metadataJson || base;
  return {
    id: row?.id || `theme-${channelSlug}`,
    name: row?.name || `Theme settings: ${channelSlug}`,
    slug: row?.slug || channelSlug,
    channelSlug,
    status: meta.status || 'draft',
    brand: meta.brand || base.brand,
    layout: defaultLayout(meta.layout),
    sections: safeSections(meta.sections),
    contentOverrides: safeObject(meta.contentOverrides || meta.content, DEFAULT_CONTENT_OVERRIDES),
    navigation: Array.isArray(meta.navigation) ? meta.navigation : [],
    draftVersion: Number(meta.draftVersion || 1),
    publishedVersion: Number(meta.publishedVersion || 0),
    updatedAt: meta.updatedAt || row?.updatedAt || '',
    publishedAt: meta.publishedAt || '',
  };
}
export async function getHostedThemeSettings(channelSlugInput = 'default-store') {
  const session = await requireTenantSession();
  await ensureTable();
  const tenantId = String(session.tenantId || '');
  const channelSlug = slug(channelSlugInput);
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT id,slug,name,description,"metadataJson","updatedAt" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, RESOURCE, channelSlug);
  return { sectionTypes: SECTION_TYPES, settings: mapRow(rows[0], channelSlug) };
}
export async function saveHostedThemeDraft(input: Record<string, any>) {
  const session = await requireTenantSession();
  await ensureTable();
  const tenantId = String(session.tenantId || '');
  const channelSlug = slug(input.channelSlug || input.slug || 'default-store');
  const current = await getHostedThemeSettings(channelSlug);
  const previous = current.settings;
  const brand = { ...previous.brand, ...(input.brand || {}) };
  const metadata = {
    ...previous,
    status: input.status === 'published' ? 'published' : 'draft',
    channelSlug,
    brand: {
      ...brand,
      primary: cleanColour(brand.primary, '#18a7d0'),
      accent: cleanColour(brand.accent, '#111827'),
      background: cleanColour(brand.background, '#ffffff'),
      text: cleanColour(brand.text, '#111827'),
    },
    layout: defaultLayout({ ...previous.layout, ...(input.layout || {}) }),
    sections: safeSections(input.sections || previous.sections),
    contentOverrides: safeObject(input.contentOverrides || input.content || previous.contentOverrides, DEFAULT_CONTENT_OVERRIDES),
    navigation: Array.isArray(input.navigation) ? input.navigation : previous.navigation || [],
    draftVersion: previous.draftVersion + 1,
    publishedVersion: input.publishedVersion ?? previous.publishedVersion,
    publishedAt: input.publishedAt ?? previous.publishedAt,
    updatedAt: new Date().toISOString(),
  };
  await platformPrisma.$executeRawUnsafe('INSERT INTO "CoreCatalogRecord" (id,"tenantId",resource,slug,name,description,"metadataJson","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW()) ON CONFLICT ("tenantId",resource,slug) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,"metadataJson"=EXCLUDED."metadataJson","updatedAt"=NOW()', `theme-${tenantId}-${channelSlug}`, tenantId, RESOURCE, channelSlug, `Theme settings: ${channelSlug}`, 'Hosted theme content and brand override settings. Layout remains controlled by the uploaded hosted theme.', JSON.stringify(metadata));
  return getHostedThemeSettings(channelSlug);
}
export async function publishHostedTheme(channelSlugInput = 'default-store') {
  const current = await getHostedThemeSettings(channelSlugInput);
  const settings = current.settings;
  return saveHostedThemeDraft({ ...settings, channelSlug: settings.channelSlug, status: 'published', publishedVersion: settings.draftVersion, publishedAt: new Date().toISOString() });
}
export async function getPublicHostedThemeSettings(tenantId: string, channelSlugInput = 'default-store') {
  await ensureTable();
  const channelSlug = slug(channelSlugInput);
  const rows = await platformPrisma.$queryRawUnsafe<any[]>('SELECT id,slug,name,description,"metadataJson","updatedAt" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1', tenantId, RESOURCE, channelSlug);
  return mapRow(rows[0], channelSlug);
}
