import nodemailer from 'nodemailer';
import { listStoredEmails, saveStoredEmail, emailOutboxStorageStatus } from './email-outbox-db';
import { smtpSettingsFromTenant, smtpSettingsFromTenantRequest } from './email-settings.service';

export type InternalEmailStatus = 'queued' | 'sent' | 'failed' | 'needs-email-address' | 'smtp-not-configured';

export type InternalEmailRecord = {
  id: string;
  type: string;
  status: InternalEmailStatus;
  to: string;
  subject: string;
  body: string;
  html?: string;
  reuploadLink?: string;
  uploadId?: string;
  orderId?: string;
  quoteId?: string;
  createdAt: string;
  sentAt?: string;
  failedAt?: string;
  lastError?: string;
  attempts?: number;
  messageId?: string;
  storageSource?: 'db' | 'file-fallback';
  migratedFromFile?: boolean;
};

type QueueEmailInput = Omit<InternalEmailRecord, 'id' | 'status' | 'createdAt' | 'attempts'> & {
  id?: string;
  status?: InternalEmailStatus;
  createdAt?: string;
  attempts?: number;
};

async function settings(request?: Request) {
  return request ? smtpSettingsFromTenantRequest(request) : smtpSettingsFromTenant();
}

function fromAddress(s: any) {
  return s.from || process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@holoprint.local';
}

export async function listInternalEmails(request?: Request) {
  return listStoredEmails(request);
}

export async function queueInternalEmail(input: QueueEmailInput, request?: Request) {
  const now = new Date().toISOString();
  const record: InternalEmailRecord = {
    ...input,
    id: input.id || `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: input.status || (input.to ? 'queued' : 'needs-email-address'),
    createdAt: input.createdAt || now,
    attempts: input.attempts || 0,
  };
  return saveStoredEmail(record, request);
}

export async function upsertInternalEmail(record: InternalEmailRecord, request?: Request) {
  return saveStoredEmail(record, request);
}

function createTransport(s: any) {
  if (!s.configured) return null;
  return nodemailer.createTransport({
    host: s.host,
    port: Number(s.port || 587),
    secure: Boolean(s.secure) || Number(s.port) === 465,
    auth: { user: s.user, pass: s.pass },
  });
}

export async function sendInternalEmail(emailId: string, request?: Request) {
  const email = (await listStoredEmails(request)).find((item) => item.id === emailId);
  if (!email) throw new Error('Email outbox record not found.');
  const now = new Date().toISOString();
  const s = await settings(request);

  if (!email.to) {
    return upsertInternalEmail({ ...email, status: 'needs-email-address', failedAt: now, lastError: 'Missing recipient email address.', attempts: (email.attempts || 0) + 1 }, request);
  }

  const transport = createTransport(s);
  if (!transport) {
    return upsertInternalEmail({ ...email, status: 'smtp-not-configured', failedAt: now, lastError: 'SMTP is not configured in Email Settings or env.', attempts: (email.attempts || 0) + 1 }, request);
  }

  try {
    const result = await transport.sendMail({
      from: fromAddress(s),
      replyTo: s.replyTo || undefined,
      to: email.to,
      subject: email.subject,
      text: email.body,
      html: email.html || email.body.replace(/\n/g, '<br />'),
    });
    return upsertInternalEmail({ ...email, status: 'sent', sentAt: now, failedAt: undefined, lastError: undefined, attempts: (email.attempts || 0) + 1, messageId: result.messageId }, request);
  } catch (error) {
    return upsertInternalEmail({ ...email, status: 'failed', failedAt: now, lastError: error instanceof Error ? error.message : 'SMTP send failed.', attempts: (email.attempts || 0) + 1 }, request);
  }
}

export async function sendQueuedInternalEmails(request?: Request) {
  const pending = (await listStoredEmails(request)).filter((item) => ['queued', 'failed', 'smtp-not-configured'].includes(item.status));
  const results: InternalEmailRecord[] = [];
  for (const email of pending) {
    results.push(await sendInternalEmail(email.id, request));
  }
  return results;
}

export function smtpStatus() {
  const s = smtpSettingsFromTenant();
  return {
    configured: Boolean(s.configured),
    host: s.host || '',
    port: s.port || '',
    from: fromAddress(s),
    replyTo: s.replyTo || '',
    source: s.configured ? 'tenant-email-settings' : 'env-or-empty',
  };
}

export async function smtpStatusForRequest(request?: Request) {
  const s = await settings(request);
  return {
    configured: Boolean(s.configured),
    host: s.host || '',
    port: s.port || '',
    from: fromAddress(s),
    replyTo: s.replyTo || '',
    source: s.configured ? 'tenant-email-settings-db' : 'env-or-empty',
    storageMode: s.storageMode,
    storageTenantId: s.storageTenantId,
  };
}

export { emailOutboxStorageStatus };
