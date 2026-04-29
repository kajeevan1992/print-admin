export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const CART_KEY = 'storefront-cart';
const PRODUCTION_FLOW_KEY = 'storefront-production-flow';
const PREFLIGHT_KEY = 'storefront-preflight-gate';

const DEFAULT_ARTWORK_RULES = [
  { productSlug: 'standard-business-cards', profile: 'flat', expectedPages: 2, trimWidthMm: 85, trimHeightMm: 55, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 100 },
  { productSlug: 'a5-flyers', profile: 'flat', expectedPages: 2, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 100 },
  { productSlug: 'mailer-boxes', profile: 'packaging', expectedPages: 1, trimWidthMm: 0, trimHeightMm: 0, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 150 },
];

type PreflightRecord = Record<string, any> & {
  id: string;
  sourceId: string;
  status: 'pass' | 'fail' | 'pending';
  issues: string[];
};

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Preflight gate request failed.' }, { status });
}

async function readConfigItems<T>(request: NextRequest, key: string): Promise<T[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveConfigItems(request: NextRequest, key: string, name: string, description: string, items: unknown[], source: string) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name,
    description,
    metadataJson: { items, savedAt: new Date().toISOString(), storageKey: key, source },
  } as any);
}

function selectedNumber(source: any, keys: string[], fallback = 0) {
  const selections = source?.selections || source?.selectedOptions || source?.options || {};
  for (const key of keys) {
    const value = source?.requestedArtworkSpec?.[key] ?? source?.artworkSpec?.[key] ?? source?.[key] ?? selections[key];
    const num = Number(String(value || '').replace(/[^0-9.]/g, ''));
    if (Number.isFinite(num) && num > 0) return num;
  }
  return fallback;
}

function findRule(source: any) {
  const slug = String(source?.productSlug || source?.slug || source?.product?.slug || '').toLowerCase();
  const name = String(source?.productName || source?.name || source?.product?.name || '').toLowerCase();
  return DEFAULT_ARTWORK_RULES.find((rule) => slug.includes(rule.productSlug) || name.includes(rule.productSlug.replace(/-/g, ' '))) || DEFAULT_ARTWORK_RULES[0];
}

function comparePreflight(source: any, sourceType: string): PreflightRecord {
  const rule = findRule(source);
  const requestedPages = selectedNumber(source, ['requestedPages', 'pages', 'pageCount'], rule.expectedPages);
  const requestedWidth = selectedNumber(source, ['requestedTrimWidthMm', 'trimWidthMm', 'widthMm'], rule.trimWidthMm);
  const requestedHeight = selectedNumber(source, ['requestedTrimHeightMm', 'trimHeightMm', 'heightMm'], rule.trimHeightMm);
  const requestedBleed = selectedNumber(source, ['requestedBleedMm', 'bleedMm'], rule.bleedMm);
  const issues: string[] = [];
  if (rule.expectedPages > 0 && requestedPages !== rule.expectedPages) issues.push(`Page count mismatch: expected ${rule.expectedPages}, requested ${requestedPages}.`);
  if (rule.trimWidthMm > 0 && requestedWidth !== rule.trimWidthMm) issues.push(`Trim width mismatch: expected ${rule.trimWidthMm}mm, requested ${requestedWidth}mm.`);
  if (rule.trimHeightMm > 0 && requestedHeight !== rule.trimHeightMm) issues.push(`Trim height mismatch: expected ${rule.trimHeightMm}mm, requested ${requestedHeight}mm.`);
  if (rule.bleedMm > 0 && requestedBleed < rule.bleedMm) issues.push(`Bleed too small: expected at least ${rule.bleedMm}mm, requested ${requestedBleed}mm.`);
  const uploads = Array.isArray(source?.artworkUploads) ? source.artworkUploads : Array.isArray(source?.artwork?.uploads) ? source.artwork.uploads : [];
  const hasNonPdf = uploads.some((upload: any) => rule.pdfOnly && !String(upload.mimeType || upload.fileName || '').toLowerCase().includes('pdf'));
  if (hasNonPdf) issues.push('PDF-only artwork rule failed: non-PDF upload detected.');
  return {
    id: `pf-${sourceType}-${String(source?.id || source?.jobId || Date.now())}`,
    sourceType,
    sourceId: String(source?.id || source?.jobId || ''),
    orderNumber: source?.orderNumber || null,
    productName: source?.productName || source?.name || source?.product?.name || 'Product',
    customer: source?.customer || null,
    expected: rule,
    requested: { pages: requestedPages, trimWidthMm: requestedWidth, trimHeightMm: requestedHeight, bleedMm: requestedBleed },
    status: issues.length ? 'fail' : 'pass',
    productionBlock: issues.length > 0,
    issues,
    checkedAt: new Date().toISOString(),
  };
}

function summarise(items: PreflightRecord[]) {
  return {
    total: items.length,
    pass: items.filter((item) => item.status === 'pass').length,
    fail: items.filter((item) => item.status === 'fail').length,
    blocked: items.filter((item) => item.productionBlock).length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const [cartItems, jobs, saved] = await Promise.all([
      readConfigItems<any>(request, CART_KEY),
      readConfigItems<any>(request, PRODUCTION_FLOW_KEY),
      readConfigItems<PreflightRecord>(request, PREFLIGHT_KEY),
    ]);
    const generated = [...cartItems.map((item) => comparePreflight(item, 'cart')), ...jobs.map((job) => comparePreflight(job, 'production-job'))];
    const items = generated.length ? generated.map((item) => saved.find((savedItem) => savedItem.id === item.id) || item) : saved;
    return NextResponse.json({ ok: true, source: 'internal-preflight-gate-db', data: { items, artworkRules: DEFAULT_ARTWORK_RULES, summary: summarise(items) } });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'run-preflight').trim();
    const [cartItems, jobs] = await Promise.all([readConfigItems<any>(request, CART_KEY), readConfigItems<any>(request, PRODUCTION_FLOW_KEY)]);
    const items = [...cartItems.map((item) => comparePreflight(item, 'cart')), ...jobs.map((job) => comparePreflight(job, 'production-job'))];
    await saveConfigItems(request, PREFLIGHT_KEY, 'Storefront preflight gate', 'Plugin-parity preflight comparison records and production block flags.', items, 'PreflightGate');
    if (action === 'apply-production-blocks' && jobs.length) {
      const nextJobs = jobs.map((job) => {
        const result = items.find((item) => item.sourceType === 'production-job' && item.sourceId === String(job.id || ''));
        return result ? { ...job, preflightStatus: result.status, productionBlocked: result.productionBlock, preflightIssues: result.issues, updatedAt: new Date().toISOString() } : job;
      });
      await saveConfigItems(request, PRODUCTION_FLOW_KEY, 'Storefront production flow', 'Production job records generated from storefront order pipeline records.', nextJobs, 'PreflightGate');
    }
    return NextResponse.json({ ok: true, source: 'internal-preflight-gate-db', data: { items, artworkRules: DEFAULT_ARTWORK_RULES, summary: summarise(items) }, item: { action, at: new Date().toISOString() } });
  } catch (error) {
    return responseError(error);
  }
}
