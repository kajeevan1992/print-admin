import { NextResponse } from 'next/server';
import { updateArtworkReview } from '@/core/storefront/internal-artwork-storage';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { id: string } };

const allowed = ['pending-review', 'approved', 'rejected', 'replacement-requested'];

async function handle(request: Request, context: RouteContext) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || '').trim();
    if (!allowed.includes(action)) return NextResponse.json({ ok: false, error: 'Invalid artwork status.' }, { status: 400 });
    const upload = await updateArtworkReview(context.params.id, {
      action: action as any,
      actor: body.actor || 'admin',
      note: body.note || '',
      orderId: body.orderId,
      quoteId: body.quoteId,
    });
    return NextResponse.json({ ok: true, source: 'internal-storefront-artwork-status', upload });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Failed to update artwork status.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
