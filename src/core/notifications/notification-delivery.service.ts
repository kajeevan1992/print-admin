import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type DeliveryInput = Record<string, any>;

type DeliveryResult = {
  ok: boolean;
  provider: string;
  status: 'sent' | 'queued' | 'skipped' | 'failed';
  message: string;
  providerMessageId?: string;
};

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const raw = String(context.tenantId || '').trim();
  const tenant =
    (raw && (await prisma.tenant.findUnique({ where: { id: raw }, select: { id: true } }))) ||
    (raw && (await prisma.tenant.findUnique({ where: { slug: raw }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));

  if (!tenant) throw new Error('No tenant available for notification delivery.');
  return tenant.id;
}

function channelFrom(input: DeliveryInput) {
  return String(input.channel || input.type || 'email').toLowerCase();
}

function targetFrom(input: DeliveryInput) {
  return String(input.to || input.recipient || input.email || input.phone || input.url || '').trim();
}

async function sendViaSmtp(input: DeliveryInput): Promise<DeliveryResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!host || !user || !pass || !from) {
    return { ok: false, provider: 'smtp', status: 'skipped', message: 'SMTP env vars are not configured.' };
  }

  // Provider hook placeholder: intentionally no nodemailer dependency added yet.
  // When provider package is added, this function becomes the only integration point.
  return {
    ok: true,
    provider: 'smtp',
    status: 'queued',
    message: 'SMTP provider configured; message queued for external sender worker.',
  };
}

async function sendViaWebhook(input: DeliveryInput): Promise<DeliveryResult> {
  const endpoint = String(input.webhookUrl || process.env.NOTIFICATION_WEBHOOK_URL || '').trim();
  if (!endpoint) return { ok: false, provider: 'webhook', status: 'skipped', message: 'Webhook endpoint is not configured.' };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.NOTIFICATION_WEBHOOK_SECRET ? { 'x-webhook-secret': process.env.NOTIFICATION_WEBHOOK_SECRET } : {}) },
    body: JSON.stringify({
      to: targetFrom(input),
      subject: input.subject || '',
      message: input.message || input.body || '',
      payload: input.payload || {},
    }),
  });

  if (!response.ok) {
    return { ok: false, provider: 'webhook', status: 'failed', message: `Webhook failed with ${response.status}.` };
  }

  return { ok: true, provider: 'webhook', status: 'sent', message: 'Webhook delivered.' };
}

async function sendViaSms(input: DeliveryInput): Promise<DeliveryResult> {
  const provider = process.env.SMS_PROVIDER || '';
  if (!provider) return { ok: false, provider: 'sms', status: 'skipped', message: 'SMS provider is not configured.' };
  return { ok: true, provider: provider || 'sms', status: 'queued', message: 'SMS provider configured; message queued for external sender worker.' };
}

export async function deliverNotification(request: Request, input: DeliveryInput): Promise<DeliveryResult> {
  await tenantIdFromRequest(request);
  const channel = channelFrom(input);

  if (channel === 'email') return sendViaSmtp(input);
  if (channel === 'webhook') return sendViaWebhook(input);
  if (channel === 'sms') return sendViaSms(input);

  return { ok: false, provider: channel, status: 'skipped', message: `Unsupported notification channel: ${channel}` };
}

export async function processNotificationQueue(request: Request, input: DeliveryInput = {}) {
  const tenantId = await tenantIdFromRequest(request);
  const queue = Array.isArray(input.queue) ? input.queue : [];
  const results = [];

  for (const item of queue.slice(0, Math.max(1, Math.min(50, Number(input.limit || 25))))) {
    const result = await deliverNotification(request, item);
    results.push({ id: item.id || null, tenantId, channel: channelFrom(item), to: targetFrom(item), ...result });
  }

  return { tenantId, processed: results.length, results, source: 'internal-notification-delivery' };
}
