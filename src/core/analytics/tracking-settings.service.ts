import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

export type TrackingConsentMode = 'off' | 'basic' | 'advanced';

export type TrackingSettings = {
  id: string;
  slug: string;
  enabled: boolean;
  ga4Enabled: boolean;
  ga4MeasurementId: string;
  gtmEnabled: boolean;
  gtmContainerId: string;
  googleAdsId: string;
  consentMode: TrackingConsentMode;
  anonymizeIp: boolean;
  debugMode: boolean;
  trackPageViews: boolean;
  trackSeoEvents: boolean;
  trackViewItem: boolean;
  trackBeginCheckout: boolean;
  trackGenerateLead: boolean;
  trackPurchase: boolean;
  trackCheckoutErrors: boolean;
  currency: string;
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

const RESOURCE = 'tracking-settings';
const SETTINGS_SLUG = 'default';

function now() { return new Date().toISOString(); }
function iso(value: Date | string | undefined) { return value ? new Date(value).toISOString() : now(); }
function parseJson(value: any) { if (!value) return {}; if (typeof value === 'string') { try { return JSON.parse(value); } catch { return {}; } } return value; }
function text(value: unknown) { return String(value || '').trim(); }
function bool(value: unknown, fallback = false) { if (value === undefined || value === null || value === '') return fallback; return value === true || String(value).toLowerCase() === 'true' || String(value) === '1'; }
function consent(value: unknown): TrackingConsentMode { const next = String(value || '').toLowerCase(); return next === 'basic' || next === 'advanced' ? next : 'off'; }
function cleanId(value: unknown) { return text(value).replace(/\s+/g, ''); }

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

function envDefaults(): Partial<TrackingSettings> {
  return {
    enabled: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || process.env.GTM_CONTAINER_ID),
    ga4MeasurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.VITE_GA_MEASUREMENT_ID || process.env.GA_MEASUREMENT_ID || '',
    gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || process.env.VITE_GTM_CONTAINER_ID || process.env.GTM_CONTAINER_ID || '',
    googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || process.env.GOOGLE_ADS_ID || '',
  };
}

export function defaultTrackingSettings(): TrackingSettings {
  const env = envDefaults();
  const ga4 = cleanId(env.ga4MeasurementId);
  const gtm = cleanId(env.gtmContainerId);
  return {
    id: 'tracking-settings-default',
    slug: SETTINGS_SLUG,
    enabled: Boolean(env.enabled),
    ga4Enabled: Boolean(ga4),
    ga4MeasurementId: ga4,
    gtmEnabled: Boolean(gtm),
    gtmContainerId: gtm,
    googleAdsId: cleanId(env.googleAdsId),
    consentMode: 'off',
    anonymizeIp: true,
    debugMode: false,
    trackPageViews: true,
    trackSeoEvents: true,
    trackViewItem: true,
    trackBeginCheckout: true,
    trackGenerateLead: true,
    trackPurchase: true,
    trackCheckoutErrors: true,
    currency: 'GBP',
    notes: 'Tenant tracking settings for hosted theme analytics.',
  };
}

function fromRow(row: CoreCatalogRow | null): TrackingSettings {
  const defaults = defaultTrackingSettings();
  if (!row) return defaults;
  const meta = parseJson(row.metadataJson);
  const next = { ...defaults, ...meta } as TrackingSettings;
  next.id = row.id;
  next.slug = row.slug || SETTINGS_SLUG;
  next.enabled = bool(meta.enabled, defaults.enabled);
  next.ga4Enabled = bool(meta.ga4Enabled, defaults.ga4Enabled);
  next.gtmEnabled = bool(meta.gtmEnabled, defaults.gtmEnabled);
  next.ga4MeasurementId = cleanId(meta.ga4MeasurementId);
  next.gtmContainerId = cleanId(meta.gtmContainerId);
  next.googleAdsId = cleanId(meta.googleAdsId);
  next.consentMode = consent(meta.consentMode);
  next.anonymizeIp = bool(meta.anonymizeIp, defaults.anonymizeIp);
  next.debugMode = bool(meta.debugMode, defaults.debugMode);
  next.trackPageViews = bool(meta.trackPageViews, defaults.trackPageViews);
  next.trackSeoEvents = bool(meta.trackSeoEvents, defaults.trackSeoEvents);
  next.trackViewItem = bool(meta.trackViewItem, defaults.trackViewItem);
  next.trackBeginCheckout = bool(meta.trackBeginCheckout, defaults.trackBeginCheckout);
  next.trackGenerateLead = bool(meta.trackGenerateLead, defaults.trackGenerateLead);
  next.trackPurchase = bool(meta.trackPurchase, defaults.trackPurchase);
  next.trackCheckoutErrors = bool(meta.trackCheckoutErrors, defaults.trackCheckoutErrors);
  next.currency = text(meta.currency || defaults.currency || 'GBP').toUpperCase() || 'GBP';
  next.notes = text(meta.notes || defaults.notes);
  next.updatedAt = iso(row.updatedAt);
  return next;
}

export async function getTrackingSettings(request: Request) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    SELECT * FROM "CoreCatalogRecord"
    WHERE "tenantId" = ${ctx.tenantId}
      AND "resource" = ${RESOURCE}
      AND "slug" = ${SETTINGS_SLUG}
    LIMIT 1
  `;
  return fromRow(rows[0] || null);
}

export async function saveTrackingSettings(request: Request, input: Partial<TrackingSettings>) {
  await ensureStorage();
  const ctx = tenantContextFromRequest(request);
  const current = await getTrackingSettings(request).catch(() => defaultTrackingSettings());
  const next: TrackingSettings = {
    ...current,
    ...input,
    id: `tracking-settings-${ctx.tenantId}`.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 180),
    slug: SETTINGS_SLUG,
    enabled: bool(input.enabled, current.enabled),
    ga4Enabled: bool(input.ga4Enabled, current.ga4Enabled),
    ga4MeasurementId: cleanId(input.ga4MeasurementId),
    gtmEnabled: bool(input.gtmEnabled, current.gtmEnabled),
    gtmContainerId: cleanId(input.gtmContainerId),
    googleAdsId: cleanId(input.googleAdsId),
    consentMode: consent(input.consentMode || current.consentMode),
    anonymizeIp: bool(input.anonymizeIp, current.anonymizeIp),
    debugMode: bool(input.debugMode, current.debugMode),
    trackPageViews: bool(input.trackPageViews, current.trackPageViews),
    trackSeoEvents: bool(input.trackSeoEvents, current.trackSeoEvents),
    trackViewItem: bool(input.trackViewItem, current.trackViewItem),
    trackBeginCheckout: bool(input.trackBeginCheckout, current.trackBeginCheckout),
    trackGenerateLead: bool(input.trackGenerateLead, current.trackGenerateLead),
    trackPurchase: bool(input.trackPurchase, current.trackPurchase),
    trackCheckoutErrors: bool(input.trackCheckoutErrors, current.trackCheckoutErrors),
    currency: text(input.currency || current.currency || 'GBP').toUpperCase() || 'GBP',
    notes: text(input.notes || current.notes),
    updatedAt: now(),
  };
  const rows = await (prisma as any).$queryRaw<CoreCatalogRow[]>`
    INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt")
    VALUES (${next.id}, ${ctx.tenantId}, ${RESOURCE}, ${SETTINGS_SLUG}, ${'Analytics Tracking Settings'}, ${next.notes || ''}, ${JSON.stringify(next)}::jsonb, NOW(), NOW())
    ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "metadataJson" = EXCLUDED."metadataJson",
      "updatedAt" = NOW()
    RETURNING *
  `;
  return fromRow(rows[0]);
}

export function publicTrackingSettings(settings: TrackingSettings) {
  return {
    enabled: settings.enabled,
    ga4Enabled: settings.enabled && settings.ga4Enabled && Boolean(settings.ga4MeasurementId),
    ga4MeasurementId: settings.ga4MeasurementId,
    gtmEnabled: settings.enabled && settings.gtmEnabled && Boolean(settings.gtmContainerId),
    gtmContainerId: settings.gtmContainerId,
    googleAdsId: settings.googleAdsId,
    consentMode: settings.consentMode,
    anonymizeIp: settings.anonymizeIp,
    debugMode: settings.debugMode,
    trackPageViews: settings.trackPageViews,
    trackSeoEvents: settings.trackSeoEvents,
    trackViewItem: settings.trackViewItem,
    trackBeginCheckout: settings.trackBeginCheckout,
    trackGenerateLead: settings.trackGenerateLead,
    trackPurchase: settings.trackPurchase,
    trackCheckoutErrors: settings.trackCheckoutErrors,
    currency: settings.currency,
    updatedAt: settings.updatedAt,
  };
}

export async function buildTrackingSettingsDashboard(request: Request) {
  const settings = await getTrackingSettings(request);
  return {
    settings,
    publicSettings: publicTrackingSettings(settings),
    status: {
      enabled: settings.enabled,
      ga4Ready: settings.enabled && settings.ga4Enabled && /^G-[A-Z0-9]+$/i.test(settings.ga4MeasurementId),
      gtmReady: settings.enabled && settings.gtmEnabled && /^GTM-[A-Z0-9]+$/i.test(settings.gtmContainerId),
      hasAnyProvider: Boolean(settings.ga4MeasurementId || settings.gtmContainerId),
      warning: !settings.enabled ? 'Tracking is disabled.' : !settings.ga4MeasurementId && !settings.gtmContainerId ? 'Add GA4 Measurement ID or GTM Container ID.' : '',
    },
    events: [
      { key: 'trackPageViews', label: 'Page views', event: 'page_view' },
      { key: 'trackSeoEvents', label: 'SEO metadata loaded', event: 'seo_metadata_loaded' },
      { key: 'trackViewItem', label: 'Product views', event: 'view_item' },
      { key: 'trackBeginCheckout', label: 'Begin checkout', event: 'begin_checkout' },
      { key: 'trackGenerateLead', label: 'Quote lead', event: 'generate_lead' },
      { key: 'trackPurchase', label: 'Purchase', event: 'purchase' },
      { key: 'trackCheckoutErrors', label: 'Checkout errors', event: 'checkout_error' },
    ],
  };
}
