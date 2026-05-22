import { NextResponse } from 'next/server';
import { getEmailSettings, maskEmailSettings, resetAllEmailTemplates, resetEmailTemplate, saveEmailSettings } from '@/core/email/email-settings.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const settings = await getEmailSettings(request);
  return NextResponse.json({ ok: true, source: 'internal-email-settings', data: maskEmailSettings(settings) });
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let settings;
    if (body?.action === 'reset-template' && body?.key) {
      settings = await resetEmailTemplate(body.key, request);
    } else if (body?.action === 'reset-all-templates') {
      settings = await resetAllEmailTemplates(request);
    } else {
      settings = await saveEmailSettings(body || {}, request);
    }
    return NextResponse.json({ ok: true, source: 'internal-email-settings', data: maskEmailSettings(settings) });
  } catch (error) {
    const validation = (error as Error & { validation?: unknown })?.validation;
    return NextResponse.json({ ok: false, source: 'internal-email-settings', error: error instanceof Error ? error.message : 'Failed to save email settings.', validation }, { status: 400 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
