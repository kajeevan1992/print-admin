import { NextResponse } from 'next/server';
import { buildSeoLiveReadiness } from '@/core/seo/seo-live-readiness.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await buildSeoLiveReadiness(request);
    return NextResponse.json({ ok: true, source: 'internal-seo-live-readiness', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-seo-live-readiness', error: error instanceof Error ? error.message : 'Failed to build SEO live readiness report.' }, { status: 500 });
  }
}
