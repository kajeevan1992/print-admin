import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { updateArtworkReview } from '@/core/storefront/internal-artwork-storage';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { requestArtworkReupload } from '@/core/storefront/internal-artwork-reupload';
import { queueArtworkStatusEmail } from '@/core/storefront/internal-artwork-notifications';
import { createProductionJobFromApprovedArtwork } from '@/core/production/internal-production-jobs';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

const allowed = ['pending-review', 'approved', 'rejected', 'replacement-requested'];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

async function handle(request: Request, context: RouteContext) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!allowed.includes(action)) return json({ ok: false, error: 'Invalid artwork status.' }, { status: 400 });

    if (action === 'replacement-requested') {
      const result = await requestArtworkReupload(context.params.id, {
        note: body.note || '', customerEmail: body.customerEmail || '', customerName: body.customerName || '',
        storefrontBaseUrl: body.storefrontBaseUrl || body.storefrontUrl || '', adminBaseUrl: body.adminBaseUrl || body.adminUrl || '',
        orderNumber: body.orderNumber || '', productName: body.productName || '',
      });
      const upload = await saveArtworkMetadataDb(result.upload, ctx).catch(() => null) || result.upload;
      const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
      return json({ ok: true, source: 'internal-storefront-artwork-reupload-request', storage, upload, email: result.email, reuploadLink: result.reuploadLink });
    }

    const uploadRaw = await updateArtworkReview(context.params.id, {
      action: action as any, actor: body.actor || 'admin', note: body.note || '', orderId: body.orderId, quoteId: body.quoteId,
    });
    const upload = await saveArtworkMetadataDb(uploadRaw, ctx).catch(() => null) || uploadRaw;

    let email = null;
    let productionJob = null;
    if (action === 'approved') {
      productionJob = await createProductionJobFromApprovedArtwork(request, upload, {
        orderId: body.orderId, orderNumber: body.orderNumber, customerName: body.customerName, customerEmail: body.customerEmail,
        productName: body.productName, quantity: body.quantity, dueDate: body.dueDate, machine: body.machine, material: body.material,
        supplier: body.supplier, note: body.note,
      }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Failed to create production job.' }));
    }

    if (action === 'approved' || action === 'rejected' || action === 'pending-review') {
      email = await queueArtworkStatusEmail({
        action: action as any, upload, customerEmail: body.customerEmail || '', customerName: body.customerName || '',
        orderNumber: body.orderNumber || '', productName: body.productName || '', note: body.note || '', sendNow: body.sendEmailNow === true,
      }, request).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Failed to queue customer notification.' }));
    }

    const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
    return json({ ok: true, source: 'internal-storefront-artwork-status', storage, upload, email, productionJob });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Failed to update artwork status.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) { return handle(request, context); }
export async function POST(request: Request, context: RouteContext) { return handle(request, context); }
