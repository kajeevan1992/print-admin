import { NextResponse } from 'next/server';
import { readyCollectionStatuses, runReadyCollectionAutomationBatch, runReadyCollectionAutomationForOrderId } from '@/core/collection/ready-collection-automation.service';

export const dynamic = 'force-dynamic';

function bool(value: unknown) {
  return value === true || String(value || '').toLowerCase() === 'true' || String(value || '') === '1';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId') || '';
    if (orderId) {
      const data = await runReadyCollectionAutomationForOrderId(request, orderId, { force: bool(url.searchParams.get('force')), sendNow: bool(url.searchParams.get('sendNow')), source: 'ready-collection-automation-api-get' });
      return NextResponse.json({ ok: true, source: 'internal-ready-collection-automation', statuses: readyCollectionStatuses(), data });
    }
    return NextResponse.json({ ok: true, source: 'internal-ready-collection-automation', statuses: readyCollectionStatuses(), data: { message: 'Pass orderId to process one order or POST to process a batch.' } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-ready-collection-automation', error: error instanceof Error ? error.message : 'Ready collection automation failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const orderId = String(body.orderId || body.orderNumber || '').trim();
    if (orderId) {
      const data = await runReadyCollectionAutomationForOrderId(request, orderId, { force: body.force !== false, sendNow: bool(body.sendNow), source: 'ready-collection-automation-api-post' });
      return NextResponse.json({ ok: true, source: 'internal-ready-collection-automation', data });
    }
    const data = await runReadyCollectionAutomationBatch(request, { limit: Number(body.limit || 50), force: body.force !== false, sendNow: bool(body.sendNow) });
    return NextResponse.json({ ok: true, source: 'internal-ready-collection-automation', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-ready-collection-automation', error: error instanceof Error ? error.message : 'Ready collection automation failed.' }, { status: 500 });
  }
}
