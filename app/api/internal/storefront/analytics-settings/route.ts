import { NextResponse } from 'next/server';
import { getTrackingSettings, publicTrackingSettings } from '@/core/analytics/tracking-settings.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const settings = await getTrackingSettings(request);
    return NextResponse.json({ ok: true, source: 'internal-storefront-analytics-settings', data: publicTrackingSettings(settings) }, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-storefront-analytics-settings', error: error instanceof Error ? error.message : 'Failed to load storefront analytics settings.' }, { status: 500 });
  }
}
