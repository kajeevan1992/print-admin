import { writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import type { TenantContext } from '@/core/tenant/types';

const RESOURCE = 'storefront-artwork-intake' as any;
const MAX_INLINE_BYTES = 4 * 1024 * 1024;

export type StorefrontArtworkInput = {
  request: Request;
  tenantSlug: string;
  storeSlug: string;
  orderId?: string;
  orderNumber?: string;
  productSlug: string;
  productTitle: string;
  categorySlug?: string;
  customerName?: string;
  customerEmail?: string;
  artworkStatus: string;
  artworkNotes?: string;
  artworkFile?: File | null;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function slug(value: unknown) {
  return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
}

function safeFileName(value: unknown) {
  return clean(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'artwork-file';
}

function artworkLabel(status: string) {
  if (status === 'ready') return 'Artwork uploaded now';
  if (status === 'need-design') return 'Customer needs design help';
  return 'Customer will send artwork later';
}

function baseContext(request: Request, tenantSlug: string): TenantContext {
  const ctx = tenantContextFromRequest(request);
  return { ...ctx, tenantId: tenantSlug || ctx.tenantId };
}

async function filePayload(file?: File | null) {
  if (!file || !file.name || file.size <= 0) return null;

  const meta = {
    fileName: safeFileName(file.name),
    originalFileName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: new Date().toISOString(),
  };

  if (file.size > MAX_INLINE_BYTES) {
    return {
      ...meta,
      storageStatus: 'external-storage-required',
      storageMode: 'metadata-only',
      inlineStored: false,
      maxInlineBytes: MAX_INLINE_BYTES,
      preflightStatus: 'waiting-for-file-storage',
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    ...meta,
    storageStatus: 'stored-inline',
    storageMode: 'tenant-catalog-record-base64',
    inlineStored: true,
    base64: buffer.toString('base64'),
    checksumHint: `${buffer.byteLength}:${buffer.subarray(0, 16).toString('hex')}`,
    preflightStatus: 'pending',
  };
}

export async function createStorefrontArtworkIntake(input: StorefrontArtworkInput) {
  const now = new Date().toISOString();
  const tenantSlug = slug(input.tenantSlug);
  const storeSlug = slug(input.storeSlug);
  const productSlug = slug(input.productSlug);
  const orderKey = slug(input.orderNumber || input.orderId || `pending-${Date.now()}`);
  const intakeId = `artwork_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const intakeSlug = slug(`${orderKey}-${productSlug}-${intakeId}`);
  const file = await filePayload(input.artworkFile || null);
  const status = clean(input.artworkStatus) || 'send-later';
  const metadataJson = {
    intakeId,
    tenantSlug,
    storeSlug,
    orderId: input.orderId || null,
    orderNumber: input.orderNumber || null,
    productSlug,
    productTitle: clean(input.productTitle),
    categorySlug: slug(input.categorySlug || ''),
    customer: {
      name: clean(input.customerName),
      email: clean(input.customerEmail),
    },
    artwork: {
      status,
      label: artworkLabel(status),
      notes: clean(input.artworkNotes),
      file,
      requiresFollowUp: status !== 'ready' || !file || file.storageStatus !== 'stored-inline',
      preflightStatus: file?.preflightStatus || 'not-started',
    },
    lifecycle: {
      source: 'native-storefront-checkout',
      createdAt: now,
      updatedAt: now,
      stage: status === 'ready' && file?.inlineStored ? 'awaiting-preflight' : 'awaiting-artwork-follow-up',
    },
  };

  const record = await writeInternalCatalogRecord(baseContext(input.request, tenantSlug), RESOURCE, {
    id: intakeId,
    slug: intakeSlug,
    name: `Artwork intake ${input.orderNumber || input.orderId || productSlug}`,
    title: `Artwork intake ${input.orderNumber || input.orderId || productSlug}`,
    description: `${artworkLabel(status)} for ${clean(input.productTitle) || productSlug}`,
    metadataJson,
  }, 'create');

  return {
    intakeId,
    intakeSlug,
    resource: RESOURCE,
    record,
    status,
    fileStored: Boolean(file?.inlineStored),
    fileStorageStatus: file?.storageStatus || 'no-file',
    preflightStatus: file?.preflightStatus || 'not-started',
  };
}
