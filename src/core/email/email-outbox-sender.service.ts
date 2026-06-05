import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type EmailSettingsInput = {
  brandName?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  storefrontUrl?: string;
  adminUrl?: string;
  smtpHost?: string;
  smtpPort?: string | number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  autoSendArtworkEmails?: boolean;
};

type SendOptions = { limit?: number; dryRun?: boolean; onlyType?: string };

function bool(value: unknown) {
  return value === true || String(value || '').toLowerCase() === 'true' || String(value || '') === '1';
}

function number(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

async function ensureTenant(tenantId: string) {
  await (prisma as any).tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: tenantId === 'platform-demo' ? 'HOLO Print' : tenantId,
      slug: tenantId,
      defaultSubdomain: tenantId,
      status: 'ACTIVE',
    },
  });
}

function envSettings(): Required<Omit<EmailSettingsInput, 'autoSendArtworkEmails'>> & { autoSendArtworkEmails: boolean } {
  return {
    brandName: process.env.EMAIL_BRAND_NAME || process.env.SMTP_FROM_NAME || 'HOLO PRINT',
    fromName: process.env.SMTP_FROM_NAME || process.env.EMAIL_FROM_NAME || 'HOLO PRINT',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER || 'sales@holoprint.co.uk',
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'sales@holoprint.co.uk',
    storefrontUrl: process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || '',
    adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL || process.env.ADMIN_URL || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: process.env.SMTP_PORT || '587',
    smtpSecure: bool(process.env.SMTP_SECURE),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
    autoSendArtworkEmails: bool(process.env.AUTO_SEND_ARTWORK_EMAILS),
  };
}

function mergeSettings(db: any) {
  const env = envSettings();
  return {
    brandName: db?.brandName || env.brandName,
    fromName: db?.fromName || env.fromName,
    fromEmail: db?.fromEmail || env.fromEmail,
    replyTo: db?.replyTo || env.replyTo,
    storefrontUrl: db?.storefrontUrl || env.storefrontUrl,
    adminUrl: db?.adminUrl || env.adminUrl,
    smtpHost: db?.smtpHost || env.smtpHost,
    smtpPort: String(db?.smtpPort || env.smtpPort || '587'),
    smtpSecure: Boolean(db?.smtpSecure ?? env.smtpSecure),
    smtpUser: db?.smtpUser || env.smtpUser,
    smtpPass: db?.smtpPass || env.smtpPass,
    autoSendArtworkEmails: Boolean(db?.autoSendArtworkEmails ?? env.autoSendArtworkEmails),
  };
}

export async function getTenantEmailSettings(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const db = await (prisma as any).tenantEmailSettings.findUnique({ where: { tenantId: ctx.tenantId } }).catch(() => null);
  const settings = mergeSettings(db);
  return {
    tenantId: ctx.tenantId,
    settings,
    safe: {
      ...settings,
      smtpPass: settings.smtpPass ? '********' : '',
      configured: Boolean(settings.smtpHost && settings.smtpUser && settings.smtpPass && settings.fromEmail),
    },
  };
}

export async function saveTenantEmailSettings(request: Request, input: EmailSettingsInput) {
  const ctx = tenantContextFromRequest(request);
  await ensureTenant(ctx.tenantId);
  const env = envSettings();
  const data = {
    brandName: input.brandName || env.brandName,
    fromName: input.fromName || env.fromName,
    fromEmail: input.fromEmail || env.fromEmail,
    replyTo: input.replyTo || env.replyTo,
    storefrontUrl: input.storefrontUrl || env.storefrontUrl,
    adminUrl: input.adminUrl || env.adminUrl,
    smtpHost: input.smtpHost || env.smtpHost,
    smtpPort: String(input.smtpPort || env.smtpPort || '587'),
    smtpSecure: Boolean(input.smtpSecure ?? env.smtpSecure),
    smtpUser: input.smtpUser || env.smtpUser,
    smtpPass: input.smtpPass || env.smtpPass,
    autoSendArtworkEmails: Boolean(input.autoSendArtworkEmails ?? env.autoSendArtworkEmails),
    metadataJson: { savedBy: 'build-51-email-settings', savedAt: new Date().toISOString() },
  };
  const saved = await (prisma as any).tenantEmailSettings.upsert({
    where: { tenantId: ctx.tenantId },
    update: data,
    create: { tenantId: ctx.tenantId, ...data },
  });
  return { tenantId: ctx.tenantId, settings: mergeSettings(saved), saved };
}

function fromHeader(settings: ReturnType<typeof mergeSettings>) {
  const name = settings.fromName || settings.brandName || 'HOLO PRINT';
  return `${name} <${settings.fromEmail}>`;
}

function createTransport(settings: ReturnType<typeof mergeSettings>) {
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
    throw new Error('SMTP is not configured. Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM_EMAIL, or save tenant email settings.');
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer') as typeof import('nodemailer');
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: number(settings.smtpPort, 587),
    secure: Boolean(settings.smtpSecure),
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });
}

export async function verifyTenantEmailSettings(request: Request) {
  const { settings, safe } = await getTenantEmailSettings(request);
  const transport = createTransport(settings);
  await transport.verify();
  return { ok: true, settings: safe };
}

export async function queueTestEmail(request: Request, to: string) {
  const ctx = tenantContextFromRequest(request);
  const { settings } = await getTenantEmailSettings(request);
  const recipient = String(to || settings.fromEmail || '').trim();
  if (!recipient) throw new Error('Test recipient email is required.');
  await ensureTenant(ctx.tenantId);
  return (prisma as any).tenantEmailOutboxEmail.create({
    data: {
      id: id('test-email'),
      tenantId: ctx.tenantId,
      type: 'settings-test',
      status: 'queued',
      to: recipient,
      subject: 'Holo Print email test',
      body: `This is a Holo Print email test.\n\nIf you received this, SMTP and the email outbox sender are working.`,
      html: '<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Holo Print email test</h2><p>If you received this, SMTP and the email outbox sender are working.</p></div>',
      metadataJson: { createdBy: 'build-51-settings-test' },
    },
  });
}

async function sendOne(settings: ReturnType<typeof mergeSettings>, email: any, dryRun = false) {
  if (dryRun) return { ok: true, dryRun: true, id: email.id, to: email.to, subject: email.subject };
  const transport = createTransport(settings);
  const result = await transport.sendMail({
    from: fromHeader(settings),
    to: email.to,
    replyTo: settings.replyTo || settings.fromEmail,
    subject: email.subject,
    text: email.body,
    html: email.html || undefined,
  });
  return { ok: true, id: email.id, messageId: result.messageId || '' };
}

export async function sendQueuedTenantEmails(request: Request, options: SendOptions = {}) {
  const ctx = tenantContextFromRequest(request);
  const limit = Math.min(Math.max(number(options.limit, 20), 1), 50);
  const { settings, safe } = await getTenantEmailSettings(request);
  const where: Record<string, any> = { tenantId: ctx.tenantId, status: { in: ['queued', 'failed'] }, attempts: { lt: 5 } };
  if (options.onlyType) where.type = options.onlyType;
  const rows = await (prisma as any).tenantEmailOutboxEmail.findMany({ where, orderBy: { createdAt: 'asc' }, take: limit });
  const results = [];
  for (const email of rows) {
    await (prisma as any).tenantEmailOutboxEmail.update({ where: { id: email.id }, data: { status: options.dryRun ? email.status : 'sending', attempts: { increment: options.dryRun ? 0 : 1 }, lastError: null } });
    try {
      const sent = await sendOne(settings, email, Boolean(options.dryRun));
      if (!options.dryRun) {
        await (prisma as any).tenantEmailOutboxEmail.update({ where: { id: email.id }, data: { status: 'sent', messageId: sent.messageId || '', sentAt: new Date(), lastError: null } });
      }
      results.push(sent);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email send failed.';
      await (prisma as any).tenantEmailOutboxEmail.update({ where: { id: email.id }, data: { status: 'failed', lastError: message, failedAt: new Date() } });
      results.push({ ok: false, id: email.id, error: message });
    }
  }
  return { ok: true, tenantId: ctx.tenantId, settings: safe, count: rows.length, results };
}
