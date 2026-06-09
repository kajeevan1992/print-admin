import { NextResponse } from 'next/server';
import { runStorefrontOrderE2e } from '@/core/launch/storefront-order-e2e.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await runStorefrontOrderE2e(request, {
      mode: 'dry-run',
      scenario: (url.searchParams.get('scenario') || 'all') as any,
    });
    return NextResponse.json({ ok: true, source: 'internal-launch-storefront-order-e2e', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-storefront-order-e2e', error: error instanceof Error ? error.message : 'Storefront order E2E test failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'dry-run');
    const mode = action === 'create-test-order' ? 'create-test-order' : 'dry-run';
    const data = await runStorefrontOrderE2e(request, {
      mode,
      scenario: body.scenario || 'all',
    });
    return NextResponse.json({ ok: true, source: 'internal-launch-storefront-order-e2e', action: mode, data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-storefront-order-e2e', error: error instanceof Error ? error.message : 'Storefront order E2E action failed.' }, { status: 500 });
  }
}
