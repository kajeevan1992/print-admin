import { NextResponse } from 'next/server';
import { listInternalEmails, sendQueuedInternalEmails, smtpStatus } from '@/core/email/internal-email.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await listInternalEmails();
  return NextResponse.json({ ok: true, source: 'internal-email-outbox', smtp: smtpStatus(), data: { items, count: items.length } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'send-queued') return NextResponse.json({ ok: false, error: 'Unsupported email outbox action.' }, { status: 400 });
  const results = await sendQueuedInternalEmails();
  return NextResponse.json({ ok: true, source: 'internal-email-outbox', smtp: smtpStatus(), data: { items: results, count: results.length } });
}
