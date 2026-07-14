import { NextResponse } from 'next/server';
import { previewLaunchTestOrder, listLaunchTestOrders } from '@/core/launch/launch-test-order-generator.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('list') === 'true') {
      const data = await listLaunchTestOrders(request);
      return NextResponse.json({ ok: true, source: 'internal-launch-test-order', data });
    }
    const data = await previewLaunchTestOrder(request, {
      scenario: url.searchParams.get('scenario') || 'collection',
      status: url.searchParams.get('status') || 'QUALITY_CHECK',
      productSlug: url.searchParams.get('productSlug') || 'business-cards',
      locationSlug: url.searchParams.get('locationSlug') || 'sidcup',
      customerEmail: url.searchParams.get('customerEmail') || 'launch-test@holoprint.co.uk',
      customerName: url.searchParams.get('customerName') || 'Launch Test Customer',
    });
    return NextResponse.json({ ok: true, source: 'internal-launch-test-order', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-test-order', error: error instanceof Error ? error.message : 'Launch test order preview failed.' }, { status: 500 });
  }
}
