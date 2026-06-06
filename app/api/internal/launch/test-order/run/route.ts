import { NextResponse } from 'next/server';
import { createLaunchTestOrder } from '@/core/launch/launch-test-order-generator.service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body.confirm !== 'CREATE_TEST_ORDER') {
      return NextResponse.json({ ok: false, error: 'Missing confirmation.' }, { status: 400 });
    }
    const data = await createLaunchTestOrder(request, {
      status: body.status || 'QUALITY_CHECK',
      productSlug: body.productSlug || 'business-cards',
      locationSlug: body.locationSlug || 'sidcup',
      customerEmail: body.customerEmail || 'launch-test@holoprint.co.uk',
      customerName: body.customerName || 'Launch Test Customer',
      generatePass: body.generatePass !== false,
      queueNotification: body.queueNotification !== false,
      runAutomation: body.runAutomation !== false,
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Run failed.' }, { status: 500 });
  }
}
