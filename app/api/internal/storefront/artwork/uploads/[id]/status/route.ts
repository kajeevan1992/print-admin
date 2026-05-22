import { NextResponse } from 'next/server';
import { updateArtworkReview } from '@/core/storefront/internal-artwork-storage';
import { requestArtworkReupload } from '@/core/storefront/internal-artwork-reupload';

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function handle(request: Request, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!allowed.includes(action)) return json({ ok: false, error: 'Invalid artwork status.' }, { status: 400 });

    if (action === 'replacement-requested') {
      const result = await requestArtworkReupload(context.params.id, {
        note: body.note || '',
        customerEmail: body.customerEmail || '',
        customerName: body.customerName || '',
        storefrontBaseUrl: body.storefrontBaseUrl || body.storefrontUrl || '',
        adminBaseUrl: body.adminBaseUrl || body.adminUrl || '',
        orderNumber: body.orderNumber || '',
        productName: body.productName || '',
      });
      return json({ ok: true, source: 'internal-storefront-artwork-reupload-request', upload: result.upload, email: result.email, reuploadLink: result.reuploadLink });
    }

    const upload = await updateArtworkReview(context.params.id, {
      action: action as any,
      actor: body.actor || 'admin',
      note: body.note || '',
      orderId: body.orderId,
      quoteId: body.quoteId,
    });
    return json({ ok: true, source: 'internal-storefront-artwork-status', upload });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Failed to update artwork status.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
