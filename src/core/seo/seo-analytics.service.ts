import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { listSeoPages, type SeoPageRecord } from './seo-engine.service';

export type SeoAnalyticsMetric = {
  id: string;
  path: string;
  dateFrom: string;
  dateTo: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  gaUsers: number;
  gaSessions: number;
  gaConversions: number;
  gaRevenueMinor: number;
  source: 'manual' | 'gsc' | 'ga4' | 'mixed' | 'estimate';
  topQueries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
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

const RESOURCE = 'seo-analytics';
const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');

function now() { return new Date().toISOString(); }
function iso(value: Date | string | undefined) { return value ? new Date(value).toISOString() : now(); }
function slugify(value: string) { return String(value || '').toLowerCase().trim().replace(/^https?:\/\/[^/]+/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'home'; }
function cleanPath(value: string) { const raw = String(value || '/').trim() || '/'; try { if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname || '/'; } catch {} const clean = raw.split('?')[0].split('#')[0] || '/'; return clean.startsWith('/') ? clean : `/${clean}`; }
function tenantSafeId(prefix: string, tenantId: string, slug: string) { return `${prefix}-${slugify(tenantId)}-${slugify(slug)}`.slice(0, 180); }
function parseJson(value: any) { if (!value) return {}; if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } } return value; }
function pct(value: number) { return Math.round(value * 10000) / 100; }
function number(value: any, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? next : fallback; }
function todayMinus(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }

async function ensureStorage() {
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

function metricSlug(path: string, dateFrom: string, dateTo: string) {
  return `${slugify(cleanPath(path))}-${dateFrom}-${dateTo}`;
}

function metricFromRow(row: CoreCatalogRow): SeoAnalyticsMetric {
  const meta = parseJson(row.metadataJson);
  const impressions = number(meta.impressions);
  const clicks = number(meta.clicks);
  return {
    id: row.id,
    path: cleanPath(meta.path || row.name || '/'),
    dateFrom: meta.dateFrom || todayMinus(28),
    dateTo: meta.dateTo || todayMinus(1),
    clicks,
    impressions,
    ctr: number(meta.ctr, impressions ? clicks / impressions : 0),
    position: number(meta.position, 0),
    gaUsers: number(meta.gaUsers),
    gaSessions: number(meta.gaSessions),
    gaConversions: number(meta.gaConversions),
    gaRevenueMinor: number(meta.gaRevenueMinor),
    source: meta.source || 'manual',
    topQueries: Array.isArray(meta.topQueries) ? meta.topQueries : [],
    updatedAt: iso(row.updatedAt),
  };
}

function aggregateMetrics(metrics: SeoAnalyticsMetric[]) {
  const byPath = new Map<string, SeoAnalyticsMetric>();
  for (const item of metrics) {
    const path = cleanPath(item.path);
    const current = byPath.get(path);
    if (!current || item.dateTo >= current.dateTo) byPath.set(path, item);
  }
  return byPath;
}

function estimatedMetric(page: SeoPageRecord): SeoAnalyticsMetric {
  const score = number(page.qualityScore);
  const published = page.status === 'published' && !page.noIndex && page.includeInSitemap;
  const impressions = published ? Math.max(0, Math.round(score * (page.pageType === 'home' ? 8 : page.pageType === 'product-location' ? 4 : 2))) : 0;
  const clicks = impressions ? Math.max(0, Math.round(impressions * (score >= 80 ? 0.055 : score >= 60 ? 0.025 : 0.01))) : 0;
  return { id: `estimate-${slugify(page.path)}`, path: cleanPath(page.path), dateFrom: todayMinus(28), dateTo: todayMinus(1), clicks, impressions, ctr: impressions ? clicks / impressions : 0, position: impressions ? Math.max(3, Math.round(35 - score / 4)) : 0, gaUsers: 0, gaSessions: 0, gaConversions: 0, gaRevenueMinor: 0, source: 'estimate', topQueries: page.targetKeyword ? [{ query: page.targetKeyword, clicks, impressions, position: impressions ? Math.max(3, Math.round(35 - score / 4)) : 0 }] : [] };
}

function opportunity(page: SeoPageRecord, metric: SeoAnalyticsMetric) {
  const warnings = page.warnings || [];
  const errors = page.errors || [];
  if (errors.length) return 'Fix SEO errors before measuring performance.';
  if (metric.impressions > 100 && metric.ctr < 0.02) return 'High impressions but low CTR: improve SEO title/meta description.';
  if (metric.position > 10 && metric.impressions > 20) return 'Ranking on page 2+: improve content depth and internal links.';
  if (metric.impressions === 0 && page.status === 'published') return 'Published but no impressions yet: check indexing, sitemap and internal links.';
  if (warnings.some((item) => /internal links/i.test(item))) return 'Add internal links from related product/location pages.';
  if (number(page.readabilityScore) < 70) return 'Improve readability and useful body copy.';
  return 'Monitor performance and keep content fresh.';
}

function pageUrl(page: SeoPageRecord) {
  const path = cleanPath(page.path);
  return page.canonicalUrl || `${SITE_URL}${path === '/' ? '' : path}`;
}

export async function listSeoAnalyticsMetrics(request: Request) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId} AND "resource" = ${RESOURCE}
    ORDER BY "updatedAt" DESC
  `;
  return rows.map(metricFromRow);
}

export async function saveSeoAnalyticsMetric(request: Request, input: Partial<SeoAnalyticsMetric>) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const path = cleanPath(input.path || '/');
  const dateFrom = input.dateFrom || todayMinus(28);
  const dateTo = input.dateTo || todayMinus(1);
  const slug = metricSlug(path, dateFrom, dateTo);
  const id = String(input.id || tenantSafeId('seo-analytics', ctx.tenantId, slug));
  const impressions = number(input.impressions);
  const clicks = number(input.clicks);
  const metric: SeoAnalyticsMetric = {
    id,
    path,
    dateFrom,
    dateTo,
    clicks,
    impressions,
    ctr: number(input.ctr, impressions ? clicks / impressions : 0),
    position: number(input.position),
    gaUsers: number(input.gaUsers),
    gaSessions: number(input.gaSessions),
    gaConversions: number(input.gaConversions),
    gaRevenueMinor: number(input.gaRevenueMinor),
    source: input.source || 'manual',
    topQueries: Array.isArray(input.topQueries) ? input.topQueries : [],
    updatedAt: now(),
  };
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt")
    VALUES (${id}, ${ctx.tenantId}, ${RESOURCE}, ${slug}, ${path}, ${metric.source}, ${JSON.stringify(metric)}::jsonb, NOW(), NOW())
    ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "metadataJson" = EXCLUDED."metadataJson",
      "updatedAt" = NOW()
    RETURNING *
  `;
  return metricFromRow(rows[0]);
}

export async function importSeoAnalyticsMetrics(request: Request, rows: Array<Partial<SeoAnalyticsMetric>>) {
  const saved = [];
  for (const row of rows || []) saved.push(await saveSeoAnalyticsMetric(request, row));
  return { items: saved, count: saved.length };
}

export async function buildSeoAnalyticsDashboard(request: Request, filters: { search?: string; pageType?: string; status?: string; source?: string } = {}) {
  const [seoData, metrics] = await Promise.all([listSeoPages(request, { status: filters.status || 'all', pageType: filters.pageType || 'all', search: filters.search || '' }), listSeoAnalyticsMetrics(request)]);
  const byPath = aggregateMetrics(metrics);
  let rows = seoData.items.map((page) => {
    const metric = byPath.get(cleanPath(page.path)) || estimatedMetric(page);
    const clickValueMinor = metric.clicks ? Math.round(metric.gaRevenueMinor / Math.max(metric.clicks, 1)) : 0;
    return {
      page,
      path: cleanPath(page.path),
      url: pageUrl(page),
      pageType: page.pageType,
      status: page.status,
      indexable: page.status === 'published' && page.includeInSitemap && !page.noIndex,
      score: page.qualityScore || 0,
      readabilityScore: page.readabilityScore || 0,
      errors: page.errors || [],
      warnings: page.warnings || [],
      metric,
      ctrPercent: pct(metric.ctr),
      conversionRatePercent: metric.gaSessions ? pct(metric.gaConversions / metric.gaSessions) : 0,
      revenue: metric.gaRevenueMinor,
      valuePerClickMinor: clickValueMinor,
      opportunity: opportunity(page, metric),
    };
  });
  if (filters.source && filters.source !== 'all') rows = rows.filter((row) => row.metric.source === filters.source);
  rows = rows.sort((a, b) => (b.metric.clicks - a.metric.clicks) || (b.metric.impressions - a.metric.impressions));
  const totals = rows.reduce((acc, row) => {
    acc.clicks += row.metric.clicks;
    acc.impressions += row.metric.impressions;
    acc.gaUsers += row.metric.gaUsers;
    acc.gaSessions += row.metric.gaSessions;
    acc.gaConversions += row.metric.gaConversions;
    acc.gaRevenueMinor += row.metric.gaRevenueMinor;
    acc.errors += row.errors.length;
    acc.warnings += row.warnings.length;
    if (row.metric.source === 'estimate') acc.estimated += 1;
    return acc;
  }, { pages: rows.length, clicks: 0, impressions: 0, gaUsers: 0, gaSessions: 0, gaConversions: 0, gaRevenueMinor: 0, errors: 0, warnings: 0, estimated: 0 });
  return {
    rows,
    totals: {
      ...totals,
      ctrPercent: totals.impressions ? pct(totals.clicks / totals.impressions) : 0,
      conversionRatePercent: totals.gaSessions ? pct(totals.gaConversions / totals.gaSessions) : 0,
      realMetricPages: rows.length - totals.estimated,
    },
    integrations: {
      recommendedSeoSource: 'Google Search Console',
      recommendedBehaviourSource: 'Google Analytics 4',
      searchConsoleApi: 'Use Search Analytics query grouped by page/query to import clicks, impressions, CTR and position.',
      ga4: 'Use GA4 or Tag Manager for page_view, view_item, begin_checkout and purchase/conversion events.',
      gscConnected: Boolean(process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      ga4Configured: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID),
    },
  };
}
