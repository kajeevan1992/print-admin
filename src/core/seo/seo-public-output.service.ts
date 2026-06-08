import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listSeoPages, type SeoPageRecord } from './seo-engine.service';
import { buildSeoSchemaJsonLd } from './seo-schema-generator.service';

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');
const BRAND_NAME = process.env.SEO_ORGANIZATION_NAME || 'Holo Print';
const DEFAULT_OG_IMAGE = process.env.SEO_DEFAULT_OG_IMAGE || `${SITE_URL}/og-image.jpg`;
const CRAWL_SETTINGS_RESOURCE = 'seo-crawl-settings';
const CRAWL_SETTINGS_SLUG = 'default';

export type SitemapKind = 'all' | 'products' | 'locations' | 'collections' | 'guides' | 'static';

export type SeoCrawlSettings = {
  id: string;
  slug: string;
  robotsEnabled: boolean;
  allowAllPublicPages: boolean;
  includeSitemapIndex: boolean;
  includeLlmsTxt: boolean;
  customDisallow: string[];
  customAllow: string[];
  extraSitemaps: string[];
  noindexPaths: string[];
  crawlDelay?: string;
  notes?: string;
  updatedAt?: string;
};

type CoreCatalogRow = {
  id: string;
  tenantId: string;
  resource: string;
  slug: string;
  name: string;
  description: string | null;
  metadataJson: any;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function cleanPath(value: string) {
  const path = String(value || '').trim() || '/';
  const clean = path.split('?')[0].split('#')[0] || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function canonical(path: string) {
  const clean = cleanPath(path);
  return `${SITE_URL}${clean === '/' ? '' : clean}`;
}

function escapeXml(value: string) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function safeDate(value?: string) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function iso(value: Date | string | undefined) {
  return value ? safeDate(String(value)) : new Date().toISOString();
}

function slugify(value: string) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'default';
}

function parseJson(value: any) {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value;
}

function arr(value: unknown) {
  return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
}

function priorityFor(page: SeoPageRecord) {
  if (page.pageType === 'home') return '1.0';
  if (page.pageType === 'product-location') return '0.8';
  if (page.pageType === 'product' || page.pageType === 'location') return '0.7';
  if (page.pageType === 'collection-point' || page.pageType === 'service-area') return '0.65';
  return '0.5';
}

function changefreqFor(page: SeoPageRecord) {
  if (page.pageType === 'home') return 'daily';
  if (page.pageType === 'product' || page.pageType === 'product-location') return 'weekly';
  return 'monthly';
}

function isIndexable(page: SeoPageRecord) {
  return page.status === 'published' && page.includeInSitemap && !page.noIndex;
}

function sitemapKindFor(page: SeoPageRecord): SitemapKind {
  if (page.pageType === 'product' || page.pageType === 'product-location') return 'products';
  if (page.pageType === 'location' || page.pageType === 'service-area') return 'locations';
  if (page.pageType === 'collection-point') return 'collections';
  if (page.pageType === 'guide') return 'guides';
  return 'static';
}

function filterByKind(page: SeoPageRecord, kind: SitemapKind) {
  if (kind === 'all') return true;
  return sitemapKindFor(page) === kind;
}

function socialFor(page: Partial<SeoPageRecord> & { title: string; metaDescription: string }) {
  return {
    ogTitle: page.ogTitle || page.title,
    ogDescription: page.ogDescription || page.metaDescription,
    ogImage: page.ogImage || page.metadata?.image || DEFAULT_OG_IMAGE,
    twitterTitle: page.twitterTitle || page.ogTitle || page.title,
    twitterDescription: page.twitterDescription || page.ogDescription || page.metaDescription,
    twitterImage: page.twitterImage || page.ogImage || page.metadata?.image || DEFAULT_OG_IMAGE,
    twitterCard: page.twitterCard || 'summary_large_image',
  };
}

async function ensureCrawlSettingsStorage() {
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" (
      "id" TEXT PRIMARY KEY,
      "tenantId" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "metadataJson" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await (prisma as any).$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_slug_key" ON "CoreCatalogRecord" ("tenantId", "resource", "slug")');
  await (prisma as any).$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_idx" ON "CoreCatalogRecord" ("tenantId", "resource")');
}

function defaultCrawlSettings(): SeoCrawlSettings {
  return {
    id: 'seo-crawl-settings-default',
    slug: CRAWL_SETTINGS_SLUG,
    robotsEnabled: true,
    allowAllPublicPages: true,
    includeSitemapIndex: true,
    includeLlmsTxt: true,
    customDisallow: ['/api/', '/api/internal/', '/orders/', '/checkout/', '/account/', '/seo-engine', '/seo-templates', '/seo-analytics', '/seo-local-generator', '/seo-redirects', '/robots-txt', '/database-manager'],
    customAllow: ['/', '/all-products', '/standard-business-cards', '/flyers'],
    extraSitemaps: [],
    noindexPaths: [],
    crawlDelay: '',
    notes: 'Default crawl settings generated by Build 44.',
  };
}

function settingsFromRow(row: CoreCatalogRow | null): SeoCrawlSettings {
  if (!row) return defaultCrawlSettings();
  const meta = parseJson(row.metadataJson);
  const defaults = defaultCrawlSettings();
  return {
    id: row.id,
    slug: row.slug || CRAWL_SETTINGS_SLUG,
    robotsEnabled: meta.robotsEnabled !== false,
    allowAllPublicPages: meta.allowAllPublicPages !== false,
    includeSitemapIndex: meta.includeSitemapIndex !== false,
    includeLlmsTxt: meta.includeLlmsTxt !== false,
    customDisallow: arr(meta.customDisallow).length ? arr(meta.customDisallow).map(cleanPath) : defaults.customDisallow,
    customAllow: arr(meta.customAllow).length ? arr(meta.customAllow).map(cleanPath) : defaults.customAllow,
    extraSitemaps: arr(meta.extraSitemaps),
    noindexPaths: arr(meta.noindexPaths).map(cleanPath),
    crawlDelay: String(meta.crawlDelay || ''),
    notes: String(meta.notes || ''),
    updatedAt: iso(row.updatedAt),
  };
}

export async function getSeoCrawlSettings(request: Request) {
  await ensureCrawlSettingsStorage();
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId}
      AND "resource" = ${CRAWL_SETTINGS_RESOURCE}
      AND "slug" = ${CRAWL_SETTINGS_SLUG}
    LIMIT 1
  `;
  return settingsFromRow(rows[0] || null);
}

export async function saveSeoCrawlSettings(request: Request, input: Partial<SeoCrawlSettings>) {
  await ensureCrawlSettingsStorage();
  const ctx = tenantContextFromRequest(request);
  const current = await getSeoCrawlSettings(request).catch(() => defaultCrawlSettings());
  const next: SeoCrawlSettings = {
    ...current,
    ...input,
    id: `seo-crawl-settings-${slugify(ctx.tenantId)}`,
    slug: CRAWL_SETTINGS_SLUG,
    robotsEnabled: input.robotsEnabled !== undefined ? Boolean(input.robotsEnabled) : current.robotsEnabled,
    allowAllPublicPages: input.allowAllPublicPages !== undefined ? Boolean(input.allowAllPublicPages) : current.allowAllPublicPages,
    includeSitemapIndex: input.includeSitemapIndex !== undefined ? Boolean(input.includeSitemapIndex) : current.includeSitemapIndex,
    includeLlmsTxt: input.includeLlmsTxt !== undefined ? Boolean(input.includeLlmsTxt) : current.includeLlmsTxt,
    customDisallow: arr(input.customDisallow ?? current.customDisallow).map(cleanPath),
    customAllow: arr(input.customAllow ?? current.customAllow).map(cleanPath),
    extraSitemaps: arr(input.extraSitemaps ?? current.extraSitemaps),
    noindexPaths: arr(input.noindexPaths ?? current.noindexPaths).map(cleanPath),
    crawlDelay: String(input.crawlDelay ?? current.crawlDelay ?? ''),
    notes: String(input.notes ?? current.notes ?? ''),
    updatedAt: new Date().toISOString(),
  };
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt")
    VALUES (${next.id}, ${ctx.tenantId}, ${CRAWL_SETTINGS_RESOURCE}, ${CRAWL_SETTINGS_SLUG}, ${'SEO Crawl Settings'}, ${next.notes || ''}, ${JSON.stringify(next)}::jsonb, NOW(), NOW())
    ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "metadataJson" = EXCLUDED."metadataJson",
      "updatedAt" = NOW()
    RETURNING *
  `;
  return settingsFromRow(rows[0]);
}

function defaultRobots(settings: SeoCrawlSettings) {
  const lines = [
    'User-agent: *',
    settings.allowAllPublicPages ? 'Allow: /' : 'Disallow: /',
    ...settings.customAllow.map((path) => `Allow: ${path}`),
    ...settings.customDisallow.map((path) => `Disallow: ${path}`),
  ];
  if (settings.crawlDelay) lines.push(`Crawl-delay: ${settings.crawlDelay}`);
  lines.push('');
  if (settings.includeSitemapIndex) lines.push(`Sitemap: ${SITE_URL}/sitemap.xml`);
  for (const extra of settings.extraSitemaps) lines.push(`Sitemap: ${extra}`);
  if (settings.includeLlmsTxt) lines.push(`Sitemap: ${SITE_URL}/llms.txt`);
  lines.push('');
  return lines.join('\n');
}

function fallbackMeta(path: string) {
  const clean = cleanPath(path);
  const meta = {
    found: false,
    path: clean,
    title: 'Holo Print | Design, Print, Sign and Web in Sidcup',
    metaDescription: 'Holo Print offers business cards, flyers, leaflets, posters, banners, stickers, shop boards, booklets, design support and local print services in Sidcup.',
    h1: 'Design, print, sign and web support in Sidcup',
    canonicalUrl: canonical(clean),
    robots: 'index,follow',
    noIndex: false,
    noFollow: false,
    schemaTypes: ['WebPage'],
    targetKeyword: '',
    pageType: 'static',
    status: 'fallback',
    includeInSitemap: false,
    metadata: {},
  };
  const schema = buildSeoSchemaJsonLd(meta);
  const social = socialFor(meta);
  return { ...meta, ...social, socialPreview: social, schemaJsonLd: schema.graph, schemaNodes: schema.nodes, schemaWarnings: schema.warnings };
}

export async function resolveSeoForPath(request: Request, path: string) {
  const clean = cleanPath(path);
  const data = await listSeoPages(request, { status: 'all' });
  const settings = await getSeoCrawlSettings(request).catch(() => defaultCrawlSettings());
  const page = data.items.find((item) => cleanPath(item.path) === clean) || null;
  if (!page) return fallbackMeta(clean);
  const noIndex = page.noIndex || page.status !== 'published' || settings.noindexPaths.includes(cleanPath(page.path));
  const noFollow = page.noFollow;
  const social = socialFor(page);
  const meta = {
    found: true,
    id: page.id,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    status: page.status,
    title: page.title,
    metaDescription: page.metaDescription,
    h1: page.h1,
    canonicalUrl: page.canonicalUrl || canonical(page.path),
    robots: `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`,
    noIndex,
    noFollow,
    includeInSitemap: page.includeInSitemap,
    schemaTypes: page.schemaTypes,
    targetKeyword: page.targetKeyword,
    productName: page.productName,
    locationName: page.locationName,
    introCopy: page.introCopy,
    faqItems: page.faqItems || [],
    internalLinks: page.internalLinks || [],
    ...social,
    socialPreview: social,
    metadata: page.metadata || {},
    audit: { score: page.qualityScore || 0, readabilityScore: page.readabilityScore || 0, readabilityWarnings: page.readabilityWarnings || [], warnings: page.warnings || [], errors: page.errors || [] },
  };
  const schema = buildSeoSchemaJsonLd(meta);
  return { ...meta, schemaJsonLd: schema.graph, schemaNodes: schema.nodes, schemaWarnings: schema.warnings };
}

export async function sitemapUrls(request: Request, kind: SitemapKind = 'all') {
  const [data, settings] = await Promise.all([
    listSeoPages(request, { status: 'published' }),
    getSeoCrawlSettings(request).catch(() => defaultCrawlSettings()),
  ]);
  const blocked = new Set(settings.noindexPaths.map(cleanPath));
  const urls = data.items
    .filter(isIndexable)
    .filter((page) => !blocked.has(cleanPath(page.path)))
    .filter((page) => filterByKind(page, kind))
    .map((page) => ({
      loc: page.canonicalUrl || canonical(page.path),
      path: cleanPath(page.path),
      pageType: page.pageType,
      kind: sitemapKindFor(page),
      lastmod: safeDate(page.updatedAt || page.createdAt),
      changefreq: changefreqFor(page),
      priority: priorityFor(page),
    }));
  return urls;
}

export async function buildSitemapXml(request: Request, kind: SitemapKind = 'all') {
  const urls = await sitemapUrls(request, kind);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
  return { urls, xml, count: urls.length, kind };
}

export async function buildSitemapIndexXml(request: Request) {
  const kinds: SitemapKind[] = ['products', 'locations', 'collections', 'guides', 'static'];
  const entries = [] as Array<{ kind: SitemapKind; loc: string; count: number; lastmod: string }>;
  for (const kind of kinds) {
    const urls = await sitemapUrls(request, kind);
    if (!urls.length) continue;
    entries.push({ kind, loc: `${SITE_URL}/sitemaps/${kind}.xml`, count: urls.length, lastmod: urls.map((url) => url.lastmod).sort().reverse()[0] || new Date().toISOString() });
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <sitemap>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>\n  </sitemap>`).join('\n')}\n</sitemapindex>\n`;
  return { entries, xml, count: entries.length };
}

export async function buildRobotsTxt(request: Request) {
  const [data, settings] = await Promise.all([
    listSeoPages(request, { status: 'all' }).catch(() => ({ items: [] as SeoPageRecord[] })),
    getSeoCrawlSettings(request).catch(() => defaultCrawlSettings()),
  ]);
  if (!settings.robotsEnabled) return { text: 'User-agent: *\nDisallow: /\n', blocked: ['/'], settings };
  const hiddenOrBlocked = data.items
    .filter((page) => page.noIndex || page.status === 'hidden' || settings.noindexPaths.includes(cleanPath(page.path)))
    .map((page) => cleanPath(page.path))
    .filter((path) => path !== '/');
  const uniqueBlocked = [...new Set([...hiddenOrBlocked, ...settings.noindexPaths.map(cleanPath)])].filter((path) => path !== '/').sort();
  const base = defaultRobots(settings).trimEnd().split('\n');
  const sitemapIndex = base.findIndex((line) => line.startsWith('Sitemap:'));
  const insertAt = sitemapIndex >= 0 ? sitemapIndex : base.length;
  const additions = uniqueBlocked.map((path) => `Disallow: ${path}`);
  const text = [...base.slice(0, insertAt), ...additions, additions.length ? '' : '', ...base.slice(insertAt)].join('\n') + '\n';
  return { text, blocked: uniqueBlocked, settings };
}

export async function buildLlmsTxt(request: Request) {
  const data = await listSeoPages(request, { status: 'published' }).catch(() => ({ items: [] as SeoPageRecord[] }));
  const pages = data.items.filter(isIndexable).slice(0, 80);
  const priorityPages = pages.filter((page) => ['home', 'product', 'product-location', 'location', 'collection-point', 'service-area', 'guide'].includes(page.pageType));
  const lines = [
    `# ${BRAND_NAME}`,
    '',
    `> ${BRAND_NAME} provides design, print, sign, web, artwork support, local collection and delivery services. Use these canonical URLs as the preferred source list for AI assistants and search systems.`,
    '',
    '## Canonical site',
    `- ${SITE_URL}`,
    '',
    '## Important pages',
    ...priorityPages.map((page) => `- [${page.h1 || page.title}](${page.canonicalUrl || canonical(page.path)}): ${page.metaDescription}`),
    '',
    '## Guidance',
    '- Prefer canonical URLs listed here over duplicate campaign or checkout URLs.',
    '- Do not describe partner collection points as owned Holo Print branches unless the page explicitly says they are staffed Holo Print stores.',
    '- Checkout, account, order and internal admin URLs are not public knowledge sources.',
    '',
  ];
  return { text: lines.join('\n'), count: priorityPages.length };
}

export async function buildSeoCrawlAudit(request: Request) {
  const [allPages, index, robots, all, products, locations, collections, guides, statics] = await Promise.all([
    listSeoPages(request, { status: 'all' }),
    buildSitemapIndexXml(request),
    buildRobotsTxt(request),
    buildSitemapXml(request, 'all'),
    buildSitemapXml(request, 'products'),
    buildSitemapXml(request, 'locations'),
    buildSitemapXml(request, 'collections'),
    buildSitemapXml(request, 'guides'),
    buildSitemapXml(request, 'static'),
  ]);
  const sitemapPaths = new Set(all.urls.map((url) => cleanPath(url.path)));
  const duplicateTitles = new Map<string, string[]>();
  const duplicateDescriptions = new Map<string, string[]>();
  for (const page of allPages.items) {
    if (page.title) duplicateTitles.set(page.title, [...(duplicateTitles.get(page.title) || []), cleanPath(page.path)]);
    if (page.metaDescription) duplicateDescriptions.set(page.metaDescription, [...(duplicateDescriptions.get(page.metaDescription) || []), cleanPath(page.path)]);
  }
  const issues = [] as Array<{ severity: 'error' | 'warning' | 'info'; message: string; path?: string }>;
  for (const page of allPages.items) {
    const path = cleanPath(page.path);
    if (page.status !== 'published' && sitemapPaths.has(path)) issues.push({ severity: 'error', message: 'Draft/hidden page appears in sitemap.', path });
    if (page.noIndex && sitemapPaths.has(path)) issues.push({ severity: 'error', message: 'No-index page appears in sitemap.', path });
    if (page.includeInSitemap && page.status === 'published' && !page.noIndex && !sitemapPaths.has(path)) issues.push({ severity: 'warning', message: 'Published sitemap-enabled page missing from sitemap.', path });
    if (!page.canonicalUrl?.startsWith('http')) issues.push({ severity: 'warning', message: 'Canonical URL is missing or not absolute.', path });
    if (!page.h1) issues.push({ severity: 'warning', message: 'Missing H1.', path });
    if (!page.schemaTypes?.length) issues.push({ severity: 'warning', message: 'Missing schema type.', path });
  }
  for (const [title, paths] of duplicateTitles.entries()) if (paths.length > 1) issues.push({ severity: 'warning', message: `Duplicate title used on ${paths.length} pages: ${title}`, path: paths[0] });
  for (const [description, paths] of duplicateDescriptions.entries()) if (paths.length > 1) issues.push({ severity: 'warning', message: `Duplicate meta description used on ${paths.length} pages.`, path: paths[0] });
  return {
    siteUrl: SITE_URL,
    sitemapIndex: index,
    robots,
    sitemaps: { all, products, locations, collections, guides, static: statics },
    issues,
    summary: {
      totalSeoPages: allPages.items.length,
      sitemapUrls: all.count,
      sitemapFiles: index.count,
      robotsBlocked: robots.blocked.length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
      ready: issues.filter((issue) => issue.severity === 'error').length === 0,
    },
  };
}

export function seoResponseHeaders(meta: { canonicalUrl?: string; robots?: string }) {
  const headers: Record<string, string> = {};
  if (meta.canonicalUrl) headers.Link = `<${meta.canonicalUrl}>; rel="canonical"`;
  if (meta.robots) headers['X-Robots-Tag'] = meta.robots;
  return headers;
}
