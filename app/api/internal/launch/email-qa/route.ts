import { NextResponse } from 'next/server';
import { buildEmailOrderNotificationQa } from '@/core/launch/email-order-notification-qa.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const data = await buildEmailOrderNotificationQa(request, { mode: 'dry-run' });
    return NextResponse.json({ ok: true, source: 'internal-launch-email-qa', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-email-qa', error: error instanceof Error ? error.message : 'Email QA failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = String(body.action || body.mode || '') === 'queue-test-notifications' ? 'queue-test-notifications' : 'dry-run';
    const data = await buildEmailOrderNotificationQa(request, { mode });
    return NextResponse.json({ ok: true, source: 'internal-launch-email-qa', action: mode, data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-launch-email-qa', error: error instanceof Error ? error.message : 'Email QA action failed.' }, { status: 500 });
  }
}
