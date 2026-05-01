import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { readCartItems, saveCartItems } from '@/core/storefront/cart-checkout-bridge';

const CONFIG_RESOURCE = 'admin-config' as any;
export const HOSTED_ARTWORK_KEY = 'hosted-theme-artwork';
export const HOSTED_PREFLIGHT_KEY = 'hosted-theme-preflight';

export type StorefrontArtworkFileInput = {
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  lastModified?: number;
  url?: string;
  pageCount?: number;
  trimWidthMm?: number;
  trimHeightMm?: number;
  bleedMm?: number;
};

type PreflightStatus = 'pass' | 'fail' | 'pending' | 'override';

export const HOSTED_ARTWORK_RULES = [
  { productSlug: 'standard-business-cards', profile: 'flat', expectedPages: 2, trimWidthMm: 85, trimHeightMm: 55, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 100 },
  { productSlug: 'business-cards', profile: 'flat', expectedPages: 2, trimWidthMm: 85, trimHeightMm: 55, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 100 },
  { productSlug: 'a5-flyers', profile: 'flat', expectedPages: 2, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 100 },
  { productSlug: 'a5-leaflets', profile: 'flat', expectedPages: 2, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 100 },
  { productSlug: 'booklets', profile: 'booklet', expectedPages: 8, trimWidthMm: 148, trimHeightMm: 210, bleedMm: 3, allowedFileTypes: ['application/pdf'], pdfOnly: true, maxUploadSizeMb: 150 },
  { productSlug: 'pvc-banner', profile: 'large-format', expectedPages: 1, trimWidthMm: 0, trimHeightMm: 0, bleedMm: 0, allowedFileTypes: ['application/pdf', 'image/tiff', 'image/jpeg', 'image/png'], pdfOnly: false, maxUploadSizeMb: 250 },
];

function makeId(prefix: string) {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeFileName(value: unknown) {
  return String(value || '').replace(/[\\/]/g, '').trim();
}

function asNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (!cleaned) return fallback;
  const next = Number(cleaned);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

function findRule(source: Record<string, any>) {
  const slug = String(source.productSlug || source.slug || source.product?.slug || '').toLowerCase();
  const name = String(source.productName || source.name || source.product?.name || '').toLowerCase();
  return HOSTED_ARTWORK_RULES.find((rule) => slug.includes(rule.productSlug) || name.includes(rule.productSlug.replace(/-/g, ' '))) || HOSTED_ARTWORK_RULES[0];
}

function getUploads(source: any) {
  const uploads = [
    ...(Array.isArray(source?.artwork?.uploads) ? source.artwork.uploads : []),
    ...(Array.isArray(source?.artworkUploads) ? source.artworkUploads : []),
  ];
  const seen = new Set<string>();
  return uploads.filter((upload: any) => {
    const key = String(upload?.id || upload?.fileName || upload?.url || JSON.stringify(upload || {}));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bestUpload(source: any) {
  return getUploads(source).find((upload: any) => upload?.pageCount != null || upload?.trimWidthMm != null || upload?.trimHeightMm != null || upload?.bleedMm != null) || getUploads(source)[0] || {};
}

function selectedNumber(source: any, keys: string[], fallback = 0) {
  const selections = source?.selections || source?.selectedOptions || source?.options || {};
  const artwork = source?.artwork || {};
  const upload = bestUpload(source);
  for (const key of keys) {
    const value = source?.requestedArtworkSpec?.[key] ?? source?.artworkSpec?.[key] ?? artwork?.[key] ?? upload?.[key] ?? source?.[key] ?? selections[key];
    const num = asNumber(value, -1);
    if (num >= 0) return num;
  }
  return fallback;
}

export function normaliseArtworkFiles(files: StorefrontArtworkFileInput[], notes: string) {
  const now = new Date().toISOString();
  return files.map((file) => ({
    id: makeId('artwork'),
    fileName: safeFileName(file.fileName),
    fileSize: Math.max(0, Number(file.fileSize || 0)),
    mimeType: String(file.mimeType || (String(file.fileName || '').toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')),
    lastModified: Number(file.lastModified || 0),
    url: file.url || null,
    pageCount: file.pageCount == null ? null : asNumber(file.pageCount),
    trimWidthMm: file.trimWidthMm == null ? null : asNumber(file.trimWidthMm),
    trimHeightMm: file.trimHeightMm == null ? null : asNumber(file.trimHeightMm),
    bleedMm: file.bleedMm == null ? null : asNumber(file.bleedMm),
    status: 'uploaded-metadata',
    storageMode: 'metadata-only',
    notes,
    uploadedAt: now,
    source: 'HostedThemeArtworkBridge',
  })).filter((file) => file.fileName);
}

export function runHostedPreflight(item: Record<string, any>, override?: Record<string, any>) {
  const source = { ...item, ...(override || {}) };
  const rule = findRule(source);
  const uploads = getUploads(source);
  const requestedPages = selectedNumber(source, ['requestedPages', 'pages', 'pageCount'], rule.expectedPages);
  const requestedWidth = selectedNumber(source, ['requestedTrimWidthMm', 'trimWidthMm', 'widthMm'], rule.trimWidthMm);
  const requestedHeight = selectedNumber(source, ['requestedTrimHeightMm', 'trimHeightMm', 'heightMm'], rule.trimHeightMm);
  const requestedBleed = selectedNumber(source, ['requestedBleedMm', 'bleedMm'], rule.bleedMm);
  const issues: string[] = [];

  if (!uploads.length) issues.push('Artwork is required before this item can enter production.');
  if (rule.expectedPages > 0 && requestedPages !== rule.expectedPages) issues.push(`Page count mismatch: expected ${rule.expectedPages}, received ${requestedPages}.`);
  if (rule.trimWidthMm > 0 && requestedWidth !== rule.trimWidthMm) issues.push(`Trim width mismatch: expected ${rule.trimWidthMm}mm, received ${requestedWidth}mm.`);
  if (rule.trimHeightMm > 0 && requestedHeight !== rule.trimHeightMm) issues.push(`Trim height mismatch: expected ${rule.trimHeightMm}mm, received ${requestedHeight}mm.`);
  if (rule.bleedMm > 0 && requestedBleed < rule.bleedMm) issues.push(`Bleed too small: expected at least ${rule.bleedMm}mm, received ${requestedBleed}mm.`);

  const invalidType = uploads.find((upload: any) => {
    const mime = String(upload.mimeType || '').toLowerCase();
    const name = String(upload.fileName || '').toLowerCase();
    if (rule.pdfOnly) return mime !== 'application/pdf' && !name.endsWith('.pdf');
    return rule.allowedFileTypes.length > 0 && !rule.allowedFileTypes.some((type) => mime === type || (type === 'application/pdf' && name.endsWith('.pdf')));
  });
  if (invalidType) issues.push(`Unsupported artwork file type: ${invalidType.fileName || invalidType.mimeType}.`);

  const oversize = uploads.find((upload: any) => Number(upload.fileSize || 0) > rule.maxUploadSizeMb * 1024 * 1024);
  if (oversize) issues.push(`Artwork file is too large: maximum ${rule.maxUploadSizeMb}MB.`);

  const overridden = String(source.artwork?.preflightStatus || source.preflightStatus || '').toLowerCase() === 'override';
  const status: PreflightStatus = overridden ? 'override' : issues.length ? 'fail' : 'pass';
  return {
    id: String(source.preflightId || `pf-cart-${source.id || makeId('item')}`),
    cartItemId: String(source.id || ''),
    productId: source.productId || null,
    productSlug: source.productSlug || null,
    productName: source.productName || source.name || 'Storefront product',
    status,
    pass: status === 'pass' || status === 'override',
    productionBlock: status === 'fail' || status === 'pending',
    issues,
    expected: rule,
    requested: { pages: requestedPages, trimWidthMm: requestedWidth, trimHeightMm: requestedHeight, bleedMm: requestedBleed },
    uploadCount: uploads.length,
    checkedAt: new Date().toISOString(),
    source: 'HostedThemePreflightBridge',
  };
}

export async function saveArtworkRecords(request: Request, records: Array<Record<string, any>>) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: HOSTED_ARTWORK_KEY,
    slug: HOSTED_ARTWORK_KEY,
    name: 'Hosted theme artwork',
    description: 'Artwork upload metadata linked to hosted storefront cart items. Internal API only.',
    metadataJson: { items: records, savedAt: new Date().toISOString(), storageKey: HOSTED_ARTWORK_KEY, source: 'HostedThemeArtworkBridge' },
  } as any);
}

export async function readArtworkRecords(request: Request): Promise<Array<Record<string, any>>> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, HOSTED_ARTWORK_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

export async function savePreflightRecords(request: Request, records: Array<Record<string, any>>) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: HOSTED_PREFLIGHT_KEY,
    slug: HOSTED_PREFLIGHT_KEY,
    name: 'Hosted theme preflight',
    description: 'Preflight pass/fail results and production block flags for hosted storefront cart items. Internal API only.',
    metadataJson: { items: records, summary: summarizePreflight(records), savedAt: new Date().toISOString(), storageKey: HOSTED_PREFLIGHT_KEY, source: 'HostedThemePreflightBridge' },
  } as any);
}

export async function readPreflightRecords(request: Request): Promise<Array<Record<string, any>>> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, HOSTED_PREFLIGHT_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

export function summarizePreflight(records: Array<Record<string, any>>) {
  return {
    total: records.length,
    pass: records.filter((record) => record.status === 'pass' || record.status === 'override').length,
    fail: records.filter((record) => record.status === 'fail').length,
    pending: records.filter((record) => record.status === 'pending').length,
    blocked: records.filter((record) => record.productionBlock).length,
  };
}

export async function updateCartItemArtwork(request: Request, cartItemId: string, uploads: Array<Record<string, any>>, notes: string) {
  const items = await readCartItems(request);
  const target = items.find((item) => String(item.id) === cartItemId);
  if (!target) throw new Error('Cart item was not found for artwork upload.');
  const nextUploads = [...getUploads(target), ...uploads];
  const nextItem = {
    ...target,
    artworkUploads: nextUploads,
    artwork: {
      ...(target.artwork || {}),
      required: true,
      uploads: nextUploads,
      notes,
      status: nextUploads.length ? 'artwork-received' : 'artwork-required',
      updatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
  const preflight = runHostedPreflight(nextItem);
  const itemWithPreflight = {
    ...nextItem,
    artwork: {
      ...nextItem.artwork,
      status: preflight.pass ? 'preflight-passed' : 'preflight-failed',
      preflightStatus: preflight.status,
      preflightResult: preflight,
      productionBlock: preflight.productionBlock,
      issues: preflight.issues,
    },
    preflightStatus: preflight.status,
    productionBlocked: preflight.productionBlock,
    preflightIssues: preflight.issues,
  };
  const nextItems = items.map((item) => String(item.id) === cartItemId ? itemWithPreflight : item);
  await saveCartItems(request, nextItems);

  const artworkRecords = await readArtworkRecords(request);
  const artworkRecord = {
    id: makeId('artwork-record'),
    cartItemId,
    productId: target.productId || null,
    productSlug: target.productSlug || null,
    productName: target.productName || 'Storefront product',
    uploads,
    notes,
    status: itemWithPreflight.artwork.status,
    preflightStatus: preflight.status,
    productionBlock: preflight.productionBlock,
    createdAt: new Date().toISOString(),
    source: 'HostedThemeArtworkBridge',
  };
  await saveArtworkRecords(request, [artworkRecord, ...artworkRecords]);

  const preflightRecords = await readPreflightRecords(request);
  await savePreflightRecords(request, [preflight, ...preflightRecords.filter((record) => String(record.cartItemId) !== cartItemId)]);

  return { item: itemWithPreflight, artworkRecord, preflight };
}

export async function runPreflightForCart(request: Request, cartItemId?: string, override?: Record<string, any>) {
  const items = await readCartItems(request);
  const targetItems = cartItemId ? items.filter((item) => String(item.id) === cartItemId) : items;
  if (cartItemId && targetItems.length === 0) throw new Error('Cart item was not found for preflight.');
  const results = targetItems.map((item) => runHostedPreflight(item, override));
  const nextItems = items.map((item) => {
    const result = results.find((entry) => String(entry.cartItemId) === String(item.id));
    if (!result) return item;
    return {
      ...item,
      artwork: {
        ...(item.artwork || {}),
        required: true,
        status: result.pass ? 'preflight-passed' : 'preflight-failed',
        preflightStatus: result.status,
        preflightResult: result,
        productionBlock: result.productionBlock,
        issues: result.issues,
        updatedAt: new Date().toISOString(),
      },
      preflightStatus: result.status,
      productionBlocked: result.productionBlock,
      preflightIssues: result.issues,
      updatedAt: new Date().toISOString(),
    };
  });
  await saveCartItems(request, nextItems);
  const existing = await readPreflightRecords(request);
  const ids = new Set(results.map((result) => String(result.cartItemId)));
  const records = [...results, ...existing.filter((record) => !ids.has(String(record.cartItemId)))];
  await savePreflightRecords(request, records);
  return { items: nextItems, results, summary: summarizePreflight(records) };
}
