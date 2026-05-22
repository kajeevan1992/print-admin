import { NextResponse } from 'next/server';
import { getEmailSettings, maskEmailSettings, saveEmailSettings } from '@/core/email/email-settings.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getEmailSettings();
  return NextResponse.json({ ok: true, source: 'internal-email-settings', data: maskEmailSettings(settings) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const settings = await saveEmailSettings(body || {});
    return NextResponse.json({ ok: true, source: 'internal-email-settings', data: maskEmailSettings(settings) });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-email-settings', error: error instanceof Error ? error.message : 'Failed to save email settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
