import { NextResponse } from 'next/server';
import { updateOrderStatus } from '@/core/orders/order.service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const orderId = body?.orderId;
  const status = body?.status;

  if (!orderId || !status) {
    return NextResponse.json({ ok: false, error: { code: 'INVALID_ORDER_STATUS_INPUT', message: 'orderId and status are required.' } }, { status: 400 });
  }

  const data = await updateOrderStatus({ tenantId: body?.tenantId || 'platform-demo' }, String(orderId), String(status));
  return NextResponse.json({ ok: true, source: 'internal-core', data });
}
