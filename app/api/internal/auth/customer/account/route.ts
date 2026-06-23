import { NextResponse } from 'next/server';
import { listCustomerOrders } from '@/core/orders/customer-order-history.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await listCustomerOrders();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Customer account could not load.' }, { status: 401 });
  }
}
