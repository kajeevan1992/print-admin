import { listSeoPages, type SeoPageRecord } from './seo-engine.service';
import { buildSeoSchemaJsonLd } from './seo-schema-generator.service';

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');

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

function defaultRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /api/internal/',
    'Disallow: /orders/',
    'Disallow: /checkout/',
    'Disallow: /account/order',
    'Disallow: /seo-engine',
    'Disallow: /seo-templates',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
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
  };
  const schema = buildSeoSchemaJsonLd(meta);
  return { ...meta, schemaJsonLd: schema.graph, schemaNodes: schema.nodes, schemaWarnings: schema.warnings };
}

export async function resolveSeoForPath(request: Request, path: string) {
  const clean = cleanPath(path);
  const data = await listSeoPages(request, { status: 'all' });
  const page = data.items.find((item) => cleanPath(item.path) === clean) || null;
  if (!page) return fallbackMeta(clean);
  const noIndex = page.noIndex || page.status !== 'published';
  const noFollow = page.noFollow;
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
    metadata: page.metadata || {},
    audit: { score: page.qualityScore || 0, warnings: page.warnings || [], errors: page.errors || [] },
  };
  const schema = buildSeoSchemaJsonLd(meta);
  return { ...meta, schemaJsonLd: schema.graph, schemaNodes: schema.nodes, schemaWarnings: schema.warnings };
}

export async function buildSitemapXml(request: Request) {
  const data = await listSeoPages(request, { status: 'published' });
  const urls = data.items.filter(isIndexable).map((page) => ({
    loc: page.canonicalUrl || canonical(page.path),
    path: page.path,
    lastmod: safeDate(page.updatedAt || page.createdAt),
    changefreq: changefreqFor(page),
    priority: priorityFor(page),
  }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url>\n    <loc>${escapeXml(url.loc)}</loc>\n    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n    <changefreq>${url.changefreq}</changefreq>\n    <priority>${url.priority}</priority>\n  </url>`).join('\n')}\n</urlset>\n`;
  return { urls, xml, count: urls.length };
}

export async function buildRobotsTxt(request: Request) {
  const data = await listSeoPages(request, { status: 'all' }).catch(() => ({ items: [] as SeoPageRecord[] }));
  const hiddenOrBlocked = data.items
    .filter((page) => page.noIndex || page.status === 'hidden')
    .map((page) => cleanPath(page.path))
    .filter((path) => path !== '/');
  const uniqueBlocked = [...new Set(hiddenOrBlocked)].sort();
  if (!uniqueBlocked.length) return { text: defaultRobots(), blocked: [] };
  const lines = defaultRobots().trimEnd().split('\n');
  const insertAt = Math.max(2, lines.findIndex((line) => line.startsWith('Sitemap:')));
  const additions = uniqueBlocked.map((path) => `Disallow: ${path}`);
  const next = [...lines.slice(0, insertAt), ...additions, '', ...lines.slice(insertAt)].join('\n') + '\n';
  return { text: next, blocked: uniqueBlocked };
}

export function seoResponseHeaders(meta: { canonicalUrl?: string; robots?: string }) {
  const headers: Record<string, string> = {};
  if (meta.canonicalUrl) headers.Link = `<${meta.canonicalUrl}>; rel="canonical"`;
  if (meta.robots) headers['X-Robots-Tag'] = meta.robots;
  return headers;
}
