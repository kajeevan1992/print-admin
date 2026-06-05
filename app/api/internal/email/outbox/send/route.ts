import { NextResponse } from 'next/server';
import { queueTestEmail, sendQueuedTenantEmails, verifyTenantEmailSettings } from '@/core/email/email-outbox-sender.service';

export const dynamic = 'force-dynamic';

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'send').trim();

    if (action === 'verify') {
      const data = await verifyTenantEmailSettings(request);
      return json({ ok: true, source: 'internal-email-outbox-send', action, data });
    }

    if (action === 'queue-test') {
      const email = await queueTestEmail(request, String(body.to || body.email || '').trim());
      return json({ ok: true, source: 'internal-email-outbox-send', action, data: { email } });
    }

    if (action === 'test-send') {
      const email = await queueTestEmail(request, String(body.to || body.email || '').trim());
      const send = await sendQueuedTenantEmails(request, { limit: Number(body.limit || 5), onlyType: 'settings-test', dryRun: Boolean(body.dryRun) });
      return json({ ok: true, source: 'internal-email-outbox-send', action, data: { email, send } });
    }

    if (action === 'send') {
      const data = await sendQueuedTenantEmails(request, { limit: Number(body.limit || 20), onlyType: body.type || body.onlyType || undefined, dryRun: Boolean(body.dryRun) });
      return json({ ok: true, source: 'internal-email-outbox-send', action, data });
    }

    return json({ ok: false, source: 'internal-email-outbox-send', error: 'Unsupported outbox action.' }, { status: 400 });
  } catch (error) {
    return json({ ok: false, source: 'internal-email-outbox-send', error: error instanceof Error ? error.message : 'Email outbox action failed.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'send';
  const body = {
    action,
    limit: Number(url.searchParams.get('limit') || 20),
    dryRun: url.searchParams.get('dryRun') === '1' || url.searchParams.get('dryRun') === 'true',
    type: url.searchParams.get('type') || undefined,
    to: url.searchParams.get('to') || undefined,
  };
  return POST(new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(body) }));
}
