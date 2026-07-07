import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/core/orders/orders.service';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { saveArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

type Row = Record<string, any>;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function text(value: unknown) { return String(value || '').trim(); }
function uploadFile(value: FormDataEntryValue | null) { return value && typeof value !== 'string' && value.size > 0 ? value as File : null; }
function firstProductId(order: Row) { return text(order.items?.[0]?.productId || order.items?.[0]?.sku || order.items?.[0]?.productName || 'storefront-product').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '') || 'storefront-product'; }
function compact(upload: Row | null) { if (!upload) return null; return { id: upload.id, productId: upload.productId, orderId: upload.orderId, originalName: upload.originalName, mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, fileUrl: upload.fileUrl, downloadUrl: upload.downloadUrl, preflight: upload.preflight, reviewStatus: upload.reviewStatus, createdAt: upload.createdAt }; }
function preflightLabel(upload: Row | null) { const status = text(upload?.preflight?.preflight?.status || upload?.preflight?.status).toLowerCase(); if (status === 'warning') return 'Artwork uploaded with preflight warnings.'; if (['blocked', 'fail', 'failed'].includes(status)) return 'Artwork uploaded, but preflight found an issue.'; if (['pass', 'passed'].includes(status)) return 'Artwork uploaded and passed preflight.'; return 'Artwork uploaded and queued for review.'; }

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const orderId = text(form.get('orderId') || form.get('orderNumber'));
    const email = text(form.get('email')).toLowerCase();
    const file = uploadFile(form.get('file'));
    if (!orderId) return json({ ok: false, error: 'orderId or orderNumber is required.' }, { status: 400 });
    if (!file) return json({ ok: false, error: 'Artwork file is required.' }, { status: 400 });
    const order = await getOrder(request, orderId) as Row | null;
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    if (email && order.customerEmail && email !== String(order.customerEmail).toLowerCase()) return json({ ok: false, error: 'Order email does not match.' }, { status: 403 });
    const ctx = tenantContextFromRequest(request);
    const uploadForm = new FormData();
    uploadForm.set('file', file, file.name || 'artwork.pdf');
    uploadForm.set('productId', firstProductId(order));
    uploadForm.set('orderId', text(order.orderNumber || orderId));
    const saved = await saveArtworkUpload(ctx, uploadForm);
    const dbSaved = await saveArtworkMetadataDb(saved, ctx).catch(() => null);
    const upload = (dbSaved || saved) as Row;
    const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
    return json({ ok: true, source: 'native-storefront-artwork-revision', data: { orderNumber: order.orderNumber, upload: compact(upload), storage, message: preflightLabel(upload) } });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-artwork-revision', error: error instanceof Error ? error.message : 'Artwork upload failed.' }, { status: 500 });
  }
}
