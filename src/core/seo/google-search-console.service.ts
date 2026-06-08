import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { importSeoAnalyticsMetrics, type SeoAnalyticsMetric } from './seo-analytics.service';

export type SearchConsoleSettings = {
  id: string;
  slug: string;
  siteUrl: string;
  authMode: 'env-service-account' | 'env-access-token' | 'not-configured';
  defaultDays: number;
  rowLimit: number;
  country?: string;
  device?: string;
  notes?: string;
  lastImportAt?: string;
  lastImportSummary?: Record<string, unknown>;
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

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

const RESOURCE = 'seo-search-console-settings';
const SETTINGS_SLUG = 'default';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function now() { return new Date().toISOString(); }
function iso(value: Date | string | undefined) { return value ? new Date(value).toISOString() : now(); }
function parseJson(value: any) { if (!value) return {}; if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } } return value; }
function number(value: any, fallback = 0) { const next = Number(value); return Number.isFinite(next) ? next : fallback; }
function bool(value: unknown) { return value === true || String(value || '').toLowerCase() === 'true'; }
function dateMinus(days: number) { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10); }
function cleanPath(value: string) { const raw = String(value || '/').trim() || '/'; try { if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname || '/'; } catch {} const clean = raw.split('?')[0].split('#')[0] || '/'; return clean.startsWith('/') ? clean : `/${clean}`; }
function base64url(value: string | Buffer) { return Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }

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

function envSiteUrl() {
  return process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL || process.env.SEARCH_CONSOLE_SITE_URL || process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk/';
}

function envEmail() {
  return process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '';
}

function envPrivateKey() {
  return (process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
}

function authMode(): SearchConsoleSettings['authMode'] {
  if (process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) return 'env-access-token';
  if (envEmail() && envPrivateKey()) return 'env-service-account';
  return 'not-configured';
}

function defaultSettings(): SearchConsoleSettings {
  return {
    id: 'seo-search-console-settings-default',
    slug: SETTINGS_SLUG,
    siteUrl: envSiteUrl(),
    authMode: authMode(),
    defaultDays: 28,
    rowLimit: 250,
    country: '',
    device: '',
    notes: 'Connect Google Search Console to import page/query performance into SEO Analytics.',
  };
}

function settingsFromRow(row: CoreCatalogRow | null): SearchConsoleSettings {
  const defaults = defaultSettings();
  if (!row) return defaults;
  const meta = parseJson(row.metadataJson);
  return {
    ...defaults,
    ...meta,
    id: row.id,
    slug: row.slug || SETTINGS_SLUG,
    siteUrl: meta.siteUrl || defaults.siteUrl,
    authMode: authMode(),
    defaultDays: Math.max(7, Math.min(number(meta.defaultDays, defaults.defaultDays), 180)),
    rowLimit: Math.max(10, Math.min(number(meta.rowLimit, defaults.rowLimit), 25000)),
    country: meta.country || '',
    device: meta.device || '',
    updatedAt: iso(row.updatedAt),
  };
}

export async function getSearchConsoleSettings(request: Request) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId}
      AND "resource" = ${RESOURCE}
      AND "slug" = ${SETTINGS_SLUG}
    LIMIT 1
  `;
  return settingsFromRow(rows[0] || null);
}

export async function saveSearchConsoleSettings(request: Request, input: Partial<SearchConsoleSettings>) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const current = await getSearchConsoleSettings(request).catch(() => defaultSettings());
  const next: SearchConsoleSettings = {
    ...current,
    ...input,
    id: `seo-search-console-settings-${ctx.tenantId}`.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 180),
    slug: SETTINGS_SLUG,
    siteUrl: String(input.siteUrl || current.siteUrl || envSiteUrl()).trim(),
    authMode: authMode(),
    defaultDays: Math.max(7, Math.min(number(input.defaultDays, current.defaultDays), 180)),
    rowLimit: Math.max(10, Math.min(number(input.rowLimit, current.rowLimit), 25000)),
    country: String(input.country || '').trim(),
    device: String(input.device || '').trim(),
    notes: String(input.notes ?? current.notes ?? ''),
    updatedAt: now(),
  };
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt")
    VALUES (${next.id}, ${ctx.tenantId}, ${RESOURCE}, ${SETTINGS_SLUG}, ${'Google Search Console Settings'}, ${next.notes || ''}, ${JSON.stringify(next)}::jsonb, NOW(), NOW())
    ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "metadataJson" = EXCLUDED."metadataJson",
      "updatedAt" = NOW()
    RETURNING *
  `;
  return settingsFromRow(rows[0]);
}

async function accessTokenFromServiceAccount() {
  const clientEmail = envEmail();
  const privateKey = envPrivateKey();
  if (!clientEmail || !privateKey) throw new Error('Google Search Console service account env vars are missing. Set GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL and GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY, or GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN.');
  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = { iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, exp: iat + 3600, iat };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signed = signer.sign(privateKey);
  const assertion = `${unsigned}.${base64url(signed)}`;
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || payload.error || 'Google OAuth token request failed.');
  return String(payload.access_token);
}

async function getAccessToken() {
  if (process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) return process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN;
  return accessTokenFromServiceAccount();
}

function buildFilters(settings: SearchConsoleSettings, country?: string, device?: string) {
  const filters = [] as Array<Record<string, string>>;
  const countryValue = String(country || settings.country || '').trim();
  const deviceValue = String(device || settings.device || '').trim();
  if (countryValue) filters.push({ dimension: 'country', operator: 'equals', expression: countryValue.toUpperCase() });
  if (deviceValue) filters.push({ dimension: 'device', operator: 'equals', expression: deviceValue.toUpperCase() });
  return filters.length ? [{ groupType: 'and', filters }] : undefined;
}

async function querySearchAnalytics(settings: SearchConsoleSettings, input: { startDate: string; endDate: string; dimensions: string[]; rowLimit?: number; country?: string; device?: string }) {
  if (settings.authMode === 'not-configured') throw new Error('Google Search Console is not configured. Add env credentials first.');
  const token = await getAccessToken();
  const site = encodeURIComponent(settings.siteUrl);
  const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: input.dimensions,
      rowLimit: Math.max(1, Math.min(number(input.rowLimit, settings.rowLimit), 25000)),
      dataState: 'final',
      dimensionFilterGroups: buildFilters(settings, input.country, input.device),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error_description || payload?.error || 'Search Console query failed.';
    throw new Error(message);
  }
  return Array.isArray(payload.rows) ? payload.rows as SearchAnalyticsRow[] : [];
}

function metricFromPageRow(row: SearchAnalyticsRow, dateFrom: string, dateTo: string, queryRows: SearchAnalyticsRow[]): Partial<SeoAnalyticsMetric> {
  const pageUrl = row.keys?.[0] || '/';
  const path = cleanPath(pageUrl);
  const topQueries = queryRows
    .filter((queryRow) => cleanPath(queryRow.keys?.[0] || '') === path)
    .map((queryRow) => ({ query: String(queryRow.keys?.[1] || ''), clicks: number(queryRow.clicks), impressions: number(queryRow.impressions), position: number(queryRow.position) }))
    .filter((item) => item.query)
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, 10);
  const impressions = number(row.impressions);
  const clicks = number(row.clicks);
  return {
    path,
    dateFrom,
    dateTo,
    clicks,
    impressions,
    ctr: number(row.ctr, impressions ? clicks / impressions : 0),
    position: number(row.position),
    source: 'gsc',
    topQueries,
  };
}

export async function runSearchConsoleImport(request: Request, input: { startDate?: string; endDate?: string; rowLimit?: number; country?: string; device?: string; dryRun?: boolean } = {}) {
  const settings = await getSearchConsoleSettings(request);
  const endDate = input.endDate || dateMinus(2);
  const startDate = input.startDate || dateMinus(settings.defaultDays + 2);
  const rowLimit = Math.max(10, Math.min(number(input.rowLimit, settings.rowLimit), 25000));
  const [pageRows, queryRows] = await Promise.all([
    querySearchAnalytics(settings, { startDate, endDate, dimensions: ['page'], rowLimit, country: input.country, device: input.device }),
    querySearchAnalytics(settings, { startDate, endDate, dimensions: ['page', 'query'], rowLimit: Math.min(rowLimit * 5, 25000), country: input.country, device: input.device }),
  ]);
  const metrics = pageRows.map((row) => metricFromPageRow(row, startDate, endDate, queryRows));
  if (input.dryRun) {
    return { imported: false, count: metrics.length, startDate, endDate, rowLimit, preview: metrics.slice(0, 20), pageRows: pageRows.length, queryRows: queryRows.length };
  }
  const imported = await importSeoAnalyticsMetrics(request, metrics);
  const nextSettings = await saveSearchConsoleSettings(request, { ...settings, lastImportAt: now(), lastImportSummary: { count: imported.count, startDate, endDate, pageRows: pageRows.length, queryRows: queryRows.length } });
  return { imported: true, count: imported.count, startDate, endDate, rowLimit, items: imported.items, settings: nextSettings, pageRows: pageRows.length, queryRows: queryRows.length };
}

export async function buildSearchConsoleDashboard(request: Request) {
  const settings = await getSearchConsoleSettings(request);
  return {
    settings,
    status: {
      connected: settings.authMode !== 'not-configured',
      authMode: settings.authMode,
      siteUrl: settings.siteUrl,
      canImport: settings.authMode !== 'not-configured' && Boolean(settings.siteUrl),
      lastImportAt: settings.lastImportAt || null,
      lastImportSummary: settings.lastImportSummary || null,
    },
    setup: {
      requiredEnv: ['GOOGLE_SEARCH_CONSOLE_SITE_URL', 'GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL', 'GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY'],
      alternativeEnv: ['GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN'],
      serviceAccountSteps: [
        'Create or choose a Google Cloud project and enable the Google Search Console API.',
        'Create a service account and copy the client email/private key into Coolify env vars.',
        'Add the service account email as an Owner or Full user to the Search Console property.',
        'Set GOOGLE_SEARCH_CONSOLE_SITE_URL exactly as the Search Console property, for example https://holoprint.co.uk/ or sc-domain:holoprint.co.uk.',
        'Run dry-run import first, then import into SEO Analytics.',
      ],
    },
  };
}
