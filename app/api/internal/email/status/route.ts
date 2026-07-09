import { NextResponse } from 'next/server';
import { emailOutboxStorageStatus, listInternalEmails, smtpStatusForRequest } from '@/core/email/internal-email.service';

export const dynamic = 'force-dynamic';

const requiredOrderEmailTypes = [
  'customer-order-confirmation',
  'admin-new-order',
  'customer-payment-received',
  'customer-payment-link',
];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}
function countBy<T extends string>(items: Array<Record<string, any>>, key: string, values: T[]) {
  return values.reduce((acc, value) => ({ ...acc, [value]: items.filter((item) => String(item[key]) === value).length }), {} as Record<T, number>);
}
function latest(items: Array<Record<string, any>>, status?: string) {
  const filtered = status ? items.filter((item) => item.status === status) : items;
  return filtered.slice(0, 10).map((item) => ({ id: item.id, type: item.type, status: item.status, to: item.to, subject: item.subject, orderId: item.orderId, attempts: item.attempts || 0, lastError: item.lastError || '', createdAt: item.createdAt, sentAt: item.sentAt || '', failedAt: item.failedAt || '' }));
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  try {
    const [emails, smtp, storage] = await Promise.all([
      listInternalEmails(request),
      smtpStatusForRequest(request),
      emailOutboxStorageStatus(request),
    ]);
    const statusCounts = countBy(emails, 'status', ['queued', 'sent', 'failed', 'needs-email-address', 'smtp-not-configured'] as const);
    const typeCounts = requiredOrderEmailTypes.reduce((acc, type) => ({ ...acc, [type]: emails.filter((item) => item.type === type).length }), {} as Record<string, number>);
    const blockingCount = statusCounts.failed + statusCounts['needs-email-address'] + statusCounts['smtp-not-configured'];
    const queuedCount = statusCounts.queued;
    const checks = [
      { key: 'smtpConfigured', label: 'SMTP is configured', ok: Boolean(smtp.configured), value: smtp.configured ? 'configured' : 'missing' },
      { key: 'fromAddress', label: 'From address available', ok: Boolean(smtp.from), value: smtp.from || '' },
      { key: 'outboxStorage', label: 'Email outbox storage available', ok: Boolean(storage.dbReady || storage.mode === 'file-fallback'), value: storage.mode },
      { key: 'blockingEmails', label: 'No failed/misconfigured emails blocking launch', ok: blockingCount === 0, value: blockingCount },
      { key: 'queuedEmails', label: 'Queued emails visible for sender', ok: true, value: queuedCount },
    ];
    const readyForLaunchEmails = Boolean(smtp.configured) && blockingCount === 0;
    return json({
      ok: true,
      source: 'internal-email-launch-status',
      readyForLaunchEmails,
      smtp,
      storage,
      requiredOrderEmailTypes,
      summary: {
        total: emails.length,
        queued: statusCounts.queued,
        sent: statusCounts.sent,
        failed: statusCounts.failed,
        needsEmailAddress: statusCounts['needs-email-address'],
        smtpNotConfigured: statusCounts['smtp-not-configured'],
        blocking: blockingCount,
      },
      typeCounts,
      checks,
      latestEmails: latest(emails),
      latestFailures: latest(emails, 'failed'),
    });
  } catch (error) {
    return json({ ok: false, source: 'internal-email-launch-status', error: error instanceof Error ? error.message : 'Email launch status failed.' }, { status: 500 });
  }
}
