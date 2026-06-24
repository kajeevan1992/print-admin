import { NextResponse } from 'next/server';
import { buildStorefrontLiveFlowFinal } from '@/core/launch/storefront-live-flow-final.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const data = await buildStorefrontLiveFlowFinal(request);
    return NextResponse.json({ ok: true, source: 'storefront-live-flow-final', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'storefront-live-flow-final', error: error instanceof Error ? error.message : 'Storefront live flow final test failed.' }, { status: 500 });
  }
}
