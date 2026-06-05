import { NextResponse } from 'next/server';
import { getTenantEmailSettings, saveTenantEmailSettings, verifyTenantEmailSettings } from '@/core/email/email-outbox-sender.service';

export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function GET(request: Request) {
  try {
    const data = await getTenantEmailSettings(request);
    return json({ ok: true, source: 'internal-email-settings', data });
  } catch (error) {
    return json({ ok: false, source: 'internal-email-settings', error: error instanceof Error ? error.message : 'Failed to load email settings.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const data = await saveTenantEmailSettings(request, body || {});
    return json({ ok: true, source: 'internal-email-settings', data: { tenantId: data.tenantId, settings: { ...data.settings, smtpPass: data.settings.smtpPass ? '********' : '' } } });
  } catch (error) {
    return json({ ok: false, source: 'internal-email-settings', error: error instanceof Error ? error.message : 'Failed to save email settings.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (String(body.action || '') !== 'verify') return json({ ok: false, source: 'internal-email-settings', error: 'Unsupported email settings action.' }, { status: 400 });
    const data = await verifyTenantEmailSettings(request);
    return json({ ok: true, source: 'internal-email-settings', data });
  } catch (error) {
    return json({ ok: false, source: 'internal-email-settings', error: error instanceof Error ? error.message : 'Email settings verification failed.' }, { status: 500 });
  }
}
