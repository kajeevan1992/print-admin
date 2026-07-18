import { NextRequest, NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getOrder } from '@/core/orders/orders.service';
import { ensureInvoiceForPaidOrder, syncInvoiceFromPaymentOrder } from '@/core/invoices/formal-invoices.service';
import { buildFinanceReconciliation, listFinanceReconciliationRuns, saveFinanceReconciliationRun } from '@/core/finance/accounting-reconciliation.service';

export const dynamic = 'force-dynamic';
function clean(value: unknown) { return String(value || '').trim(); }
function options(request: NextRequest, body: Record<string, any> = {}) { return { from: clean(body.from || request.nextUrl.searchParams.get('from')), to: clean(body.to || request.nextUrl.searchParams.get('to')), storeSlug: clean(body.storeSlug || request.nextUrl.searchParams.get('storeSlug')) }; }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

export async function GET(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const report = await buildFinanceReconciliation(ctx.tenantId, options(request));
    const runs = await listFinanceReconciliationRuns(ctx.tenantId, 20);
    return json({ ok: true, source: 'finance-reconciliation', data: { report, runs } });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Finance reconciliation could not be generated.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = tenantContextFromRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = clean(body.action || 'run');
    let report = await buildFinanceReconciliation(ctx.tenantId, options(request, body));
    const repaired: Array<{ orderId: string; action: string; ok: boolean; message?: string }> = [];
    if (action === 'repair') {
      const repairable = report.issues.filter((item) => ['missing-invoice', 'missing-credit-note'].includes(item.code)).slice(0, 100);
      for (const item of repairable) {
        try {
          const order = await getOrder(request, item.orderId);
          if (!order) throw new Error('Order was not found.');
          const scopedOrder = { ...order, tenantId: ctx.tenantId, tenantSlug: ctx.tenantId, resolver: { ...(order.resolver || {}), tenantSlug: order.resolver?.tenantSlug || ctx.tenantId } };
          if (item.code === 'missing-invoice') await ensureInvoiceForPaidOrder(scopedOrder);
          else await syncInvoiceFromPaymentOrder(scopedOrder);
          repaired.push({ orderId: item.orderId, action: item.code, ok: true });
        } catch (error) {
          repaired.push({ orderId: item.orderId, action: item.code, ok: false, message: error instanceof Error ? error.message : 'Repair failed.' });
        }
      }
      report = await buildFinanceReconciliation(ctx.tenantId, options(request, body));
    }
    await saveFinanceReconciliationRun(report);
    const runs = await listFinanceReconciliationRuns(ctx.tenantId, 20);
    return json({ ok: true, source: 'finance-reconciliation', data: { report, runs, repaired } });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : 'Finance reconciliation could not be completed.' }, { status: 400 });
  }
}
