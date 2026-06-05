import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getTenantEmailSettings, queueTestEmail, sendQueuedTenantEmails, verifyTenantEmailSettings } from '@/core/email/email-outbox-sender.service';

export const dynamic = 'force-dynamic';

function number(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clean(value: unknown) {
  return String(value || '').trim();
}

async function listOutbox(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'all';
  const type = url.searchParams.get('type') || 'all';
  const search = clean(url.searchParams.get('search')).toLowerCase();
  const limit = Math.max(1, Math.min(number(url.searchParams.get('limit'), 100), 250));
  const where: Record<string, any> = { tenantId: ctx.tenantId };
  if (status !== 'all') where.status = status;
  if (type !== 'all') where.type = type;
  const rows = await (prisma as any).tenantEmailOutboxEmail.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit });
  let items = rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    to: row.to,
    subject: row.subject,
    body: row.body,
    html: row.html,
    orderId: row.orderId,
    quoteId: row.quoteId,
    uploadId: row.uploadId,
    attempts: row.attempts,
    messageId: row.messageId,
    lastError: row.lastError,
    sentAt: row.sentAt,
    failedAt: row.failedAt,
    createdAt: row.createdAt,
    metadata: row.metadataJson || {},
  }));
  if (search) items = items.filter((item: any) => [item.to, item.subject, item.type, item.status, item.orderId, item.lastError].join(' ').toLowerCase().includes(search));
  const grouped = await (prisma as any).tenantEmailOutboxEmail.groupBy({ by: ['status'], where: { tenantId: ctx.tenantId }, _count: { status: true } }).catch(() => []);
  const summary = { total: 0, queued: 0, sending: 0, sent: 0, failed: 0 } as Record<string, number>;
  grouped.forEach((row: any) => { summary[row.status] = row._count.status; summary.total += row._count.status; });
  const emailSettings = await getTenantEmailSettings(request);
  return { items, count: items.length, summary, emailSettings: emailSettings.safe };
}

export async function GET(request: Request) {
  try {
    const data = await listOutbox(request);
    return NextResponse.json({ ok: true, source: 'internal-email-outbox', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-email-outbox', error: error instanceof Error ? error.message : 'Failed to load email outbox.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'send-queued');
    if (action === 'verify-smtp') {
      const data = await verifyTenantEmailSettings(request);
      return NextResponse.json({ ok: true, source: 'internal-email-outbox', action, data });
    }
    if (action === 'queue-test') {
      const email = await queueTestEmail(request, body.to || body.email || '');
      return NextResponse.json({ ok: true, source: 'internal-email-outbox', action, data: { email } });
    }
    if (action === 'send-test') {
      const email = await queueTestEmail(request, body.to || body.email || '');
      const data = await sendQueuedTenantEmails(request, { limit: 1, onlyType: 'settings-test', dryRun: Boolean(body.dryRun) });
      return NextResponse.json({ ok: true, source: 'internal-email-outbox', action, data: { queued: email, send: data } });
    }
    const data = await sendQueuedTenantEmails(request, {
      limit: number(body.limit, 20),
      onlyType: body.type && body.type !== 'all' ? String(body.type) : undefined,
      dryRun: Boolean(body.dryRun),
    });
    return NextResponse.json({ ok: true, source: 'internal-email-outbox', action: 'send-queued', data });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'internal-email-outbox', error: error instanceof Error ? error.message : 'Failed to process email outbox.' }, { status: 500 });
  }
}
