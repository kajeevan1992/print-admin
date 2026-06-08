import { NextResponse } from 'next/server';
import { buildTrackingSettingsDashboard, saveTrackingSettings } from '@/core/analytics/tracking-settings.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await buildTrackingSettingsDashboard(request);
    return NextResponse.json({ ok: true, source: 'internal-analytics-tracking-settings', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-analytics-tracking-settings', error: error instanceof Error ? error.message : 'Failed to load tracking settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveTrackingSettings(request, body.settings || body || {});
    const dashboard = await buildTrackingSettingsDashboard(request);
    return NextResponse.json({ ok: true, source: 'internal-analytics-tracking-settings', data: { settings, dashboard } });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-analytics-tracking-settings', error: error instanceof Error ? error.message : 'Failed to save tracking settings.' }, { status: 500 });
  }
}

export async function PUT(request: Request) { return POST(request); }
export async function PATCH(request: Request) { return POST(request); }
