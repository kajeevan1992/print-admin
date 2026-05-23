import { NextResponse } from 'next/server';
import { emailOutboxStorageStatus, listInternalEmails, sendQueuedInternalEmails, smtpStatusForRequest } from '@/core/email/internal-email.service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const [items, smtp, storage] = await Promise.all([
    listInternalEmails(request),
    smtpStatusForRequest(request),
    emailOutboxStorageStatus(request),
  ]);
  return NextResponse.json({ ok: true, source: 'internal-email-outbox', smtp, storage, data: { items, count: items.length } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'send-queued') return NextResponse.json({ ok: false, error: 'Unsupported email outbox action.' }, { status: 400 });
  const [results, smtp, storage] = await Promise.all([
    sendQueuedInternalEmails(request),
    smtpStatusForRequest(request),
    emailOutboxStorageStatus(request),
  ]);
  return NextResponse.json({ ok: true, source: 'internal-email-outbox', smtp, storage, data: { items: results, count: results.length } });
}
