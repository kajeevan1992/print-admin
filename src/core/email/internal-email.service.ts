import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { smtpSettingsFromTenant } from './email-settings.service';

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
};

type QueueEmailInput = Omit<InternalEmailRecord, 'id' | 'status' | 'createdAt' | 'attempts'> & {
  id?: string;
  status?: InternalEmailStatus;
  createdAt?: string;
  attempts?: number;
};

function dataDir() {
  return path.join(process.cwd(), '.data');
}

function outboxPath() {
  return path.join(dataDir(), 'email-outbox.json');
}

function settings() {
  return smtpSettingsFromTenant();
}

function smtpConfigured() {
  return settings().configured;
}

function fromAddress() {
  return settings().from || process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@holoprint.local';
}

async function readOutbox(): Promise<InternalEmailRecord[]> {
  await mkdir(dataDir(), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(outboxPath(), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOutbox(items: InternalEmailRecord[]) {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(outboxPath(), JSON.stringify(items, null, 2));
  return items;
}

export async function listInternalEmails() {
  return readOutbox();
}

export async function queueInternalEmail(input: QueueEmailInput) {
  const now = new Date().toISOString();
  const outbox = await readOutbox();
  const record: InternalEmailRecord = {
    ...input,
    id: input.id || `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: input.status || (input.to ? 'queued' : 'needs-email-address'),
    createdAt: input.createdAt || now,
    attempts: input.attempts || 0,
  };
  await writeOutbox([record, ...outbox]);
  return record;
}

export async function upsertInternalEmail(record: InternalEmailRecord) {
  const outbox = await readOutbox();
  const exists = outbox.some((item) => item.id === record.id);
  const next = exists ? outbox.map((item) => item.id === record.id ? record : item) : [record, ...outbox];
  await writeOutbox(next);
  return record;
}

function createTransport() {
  const s = settings();
  if (!s.configured) return null;
  return nodemailer.createTransport({
    host: s.host,
    port: Number(s.port || 587),
    secure: Boolean(s.secure) || Number(s.port) === 465,
    auth: {
      user: s.user,
      pass: s.pass,
    },
  });
}

export async function sendInternalEmail(emailId: string) {
  const outbox = await readOutbox();
  const email = outbox.find((item) => item.id === emailId);
  if (!email) throw new Error('Email outbox record not found.');
  const now = new Date().toISOString();

  if (!email.to) {
    const next = { ...email, status: 'needs-email-address' as InternalEmailStatus, failedAt: now, lastError: 'Missing recipient email address.', attempts: (email.attempts || 0) + 1 };
    await upsertInternalEmail(next);
    return next;
  }

  const transport = createTransport();
  if (!transport) {
    const next = { ...email, status: 'smtp-not-configured' as InternalEmailStatus, failedAt: now, lastError: 'SMTP is not configured in Email Settings or env.', attempts: (email.attempts || 0) + 1 };
    await upsertInternalEmail(next);
    return next;
  }

  try {
    const s = settings();
    const result = await transport.sendMail({
      from: fromAddress(),
      replyTo: s.replyTo || undefined,
      to: email.to,
      subject: email.subject,
      text: email.body,
      html: email.html || email.body.replace(/\n/g, '<br />'),
    });
    const next = { ...email, status: 'sent' as InternalEmailStatus, sentAt: now, failedAt: undefined, lastError: undefined, attempts: (email.attempts || 0) + 1, messageId: result.messageId };
    await upsertInternalEmail(next);
    return next;
  } catch (error) {
    const next = { ...email, status: 'failed' as InternalEmailStatus, failedAt: now, lastError: error instanceof Error ? error.message : 'SMTP send failed.', attempts: (email.attempts || 0) + 1 };
    await upsertInternalEmail(next);
    return next;
  }
}

export async function sendQueuedInternalEmails() {
  const outbox = await readOutbox();
  const pending = outbox.filter((item) => ['queued', 'failed', 'smtp-not-configured'].includes(item.status));
  const results: InternalEmailRecord[] = [];
  for (const email of pending) {
    results.push(await sendInternalEmail(email.id));
  }
  return results;
}

export function smtpStatus() {
  const s = settings();
  return {
    configured: smtpConfigured(),
    host: s.host || '',
    port: s.port || '',
    from: fromAddress(),
    replyTo: s.replyTo || '',
    source: s.configured ? 'tenant-email-settings' : 'env-or-empty',
  };
}
