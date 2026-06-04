import { tenantContextFromRequest } from '@/core/tenant/context';
import { readArtworkUploadMetadata, writeArtworkUploadMetadata, type StoredArtworkUpload } from './internal-artwork-storage';
import { readArtworkMetadataDb, saveArtworkMetadataDb } from './internal-artwork-db';

function uniqueIds(values: unknown[]) {
  return [...new Set(values.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
      const item = value as Record<string, any>;
      return [item.id, item.uploadId, item.artworkUploadId, item.upload?.id, item.artwork?.id].filter(Boolean);
    }
    return [value];
  }).map((value) => String(value).trim()).filter(Boolean))];
}

export function collectArtworkUploadIds(input: Record<string, any> = {}) {
  const payload = input.payload || {};
  const checkout = input.checkout || {};
  return uniqueIds([
    input.artworkUploadId,
    input.artwork_upload_id,
    input.artworkUploadIds,
    input.artwork_reference,
    input.artwork,
    input.artworkUpload,
    payload.artworkUploadId,
    payload.artworkUploadIds,
    payload.artwork_reference,
    payload.artwork,
    checkout.artworkUploadId,
    checkout.artworkUploadIds,
    checkout.artwork_reference,
    checkout.artwork,
    ...(Array.isArray(input.items) ? input.items.map((item) => item?.artworkUploadId || item?.metadataJson?.artworkUploadId || item?.metadata?.artworkUploadId) : []),
    ...(Array.isArray(payload.items) ? payload.items.map((item) => item?.artworkUploadId || item?.metadataJson?.artworkUploadId || item?.metadata?.artworkUploadId) : []),
    ...(Array.isArray(checkout.items) ? checkout.items.map((item) => item?.artworkUploadId || item?.metadataJson?.artworkUploadId || item?.metadata?.artworkUploadId) : []),
  ]);
}

async function linkFileUpload(id: string, link: { orderId?: string; quoteId?: string; note?: string }) {
  const current = await readArtworkUploadMetadata(id).catch(() => null);
  if (!current) return null;
  const now = new Date().toISOString();
  const next: StoredArtworkUpload = {
    ...current,
    orderId: link.orderId || current.orderId,
    quoteId: link.quoteId || current.quoteId,
    reviewNote: link.note || current.reviewNote,
    approvalHistory: [
      ...(current.approvalHistory || []),
      { id: `link_${Date.now()}`, action: current.reviewStatus || 'pending-review', actor: 'checkout-linker', note: link.note || 'Artwork linked to order.', createdAt: now },
    ],
  };
  return writeArtworkUploadMetadata(next).catch(() => next);
}

export async function linkArtworkUploadsToOrder(request: Request, input: Record<string, any>, link: { orderId?: string; orderNumber?: string; quoteId?: string; note?: string }) {
  const ctx = tenantContextFromRequest(request);
  const ids = collectArtworkUploadIds(input);
  if (!ids.length || (!link.orderId && !link.orderNumber && !link.quoteId)) {
    return { ok: true, linked: [], count: 0, skipped: true };
  }

  const linked = [];
  for (const id of ids) {
    const existingDb = await readArtworkMetadataDb(id, ctx).catch(() => null);
    const fileUpload = await linkFileUpload(id, { orderId: link.orderId || link.orderNumber, quoteId: link.quoteId, note: link.note });
    const source = existingDb || fileUpload;
    if (source) {
      const next = {
        ...source,
        orderId: link.orderId || link.orderNumber || source.orderId,
        quoteId: link.quoteId || source.quoteId,
        reviewNote: link.note || source.reviewNote,
        approvalHistory: source.approvalHistory || [],
      } as StoredArtworkUpload;
      const saved = await saveArtworkMetadataDb(next, ctx).catch(() => null);
      linked.push(saved || next);
    }
  }

  return { ok: true, linked, count: linked.length, ids };
}
