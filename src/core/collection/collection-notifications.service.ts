import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getOrCreateCollectionPass, listCollectionPasses } from './collection-handover.service';

const SITE_URL = (process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || 'https://holoprint.co.uk').replace(/\/$/, '');

function clean(value: unknown) { return String(value || '').trim(); }
function email(value: unknown) { return clean(value).toLowerCase(); }
function id(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }

async function resolveTenantId(request: Request) {
  const ctx = tenantContextFromRequest(request);
  const value = clean(ctx.tenantId);
  const tenant = (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true, name: true, supportEmail: true } }).catch(() => null))) || (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true, name: true, supportEmail: true } }).catch(() => null))) || (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, supportEmail: true } }).catch(() => null));
  return { tenantId: tenant?.id || value || 'platform-demo', tenantName: tenant?.name || 'HOLO PRINT', supportEmail: tenant?.supportEmail || 'sales@holoprint.co.uk' };
}

async function emailSettings(tenantId: string) {
  const settings = await prisma.tenantEmailSettings.findUnique({ where: { tenantId } }).catch(() => null);
  return {
    brandName: settings?.brandName || 'HOLO PRINT',
    fromName: settings?.fromName || settings?.brandName || 'HOLO PRINT',
    fromEmail: settings?.fromEmail || 'sales@holoprint.co.uk',
    replyTo: settings?.replyTo || settings?.fromEmail || 'sales@holoprint.co.uk',
    storefrontUrl: settings?.storefrontUrl || SITE_URL,
    autoSendArtworkEmails: Boolean(settings?.autoSendArtworkEmails),
  };
}

function passStatusText(pass: any) {
  if (pass.status === 'ready') return 'Your order is ready for collection.';
  if (pass.status === 'collected') return 'This order has already been marked as collected.';
  return 'Your collection pass has been created, but the order is not ready for collection yet.';
}

function buildText(pass: any, settings: any) {
  return [
    `Hello ${pass.customerName || 'Customer'},`,
    '',
    passStatusText(pass),
    '',
    `Order: #${pass.orderNumber}`,
    `Collection PIN: ${pass.pin}`,
    `Collection link: ${pass.qrUrl}`,
    pass.locationLabel ? `Location: ${pass.locationLabel}` : '',
    pass.locationAddress ? `Address: ${pass.locationAddress}` : '',
    pass.pickupInstructions ? `Instructions: ${pass.pickupInstructions}` : '',
    pass.collectionTruth ? `Note: ${pass.collectionTruth}` : '',
    '',
    'Please bring this PIN or QR link with you when collecting.',
    '',
    `Kind regards,`,
    settings.brandName,
  ].filter(Boolean).join('\n');
}

function buildHtml(pass: any, settings: any) {
  const safe = (value: unknown) => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return `
  <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#161A22;line-height:1.6">
    <div style="border:1px solid #E3E8F0;border-radius:24px;padding:24px;background:#fff">
      <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#18A7D0">${safe(settings.brandName)}</div>
      <h1 style="margin:8px 0 4px;font-size:28px;line-height:1.1">${safe(passStatusText(pass))}</h1>
      <p>Hello ${safe(pass.customerName || 'Customer')}, your order <strong>#${safe(pass.orderNumber)}</strong> can be collected using the PIN below.</p>
      <div style="margin:20px 0;padding:20px;border:1px solid #E3E8F0;border-radius:18px;text-align:center;background:#FBFCFF">
        <div style="font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#667487">Collection PIN</div>
        <div style="font-size:42px;font-weight:900;letter-spacing:.18em;color:#161A22">${safe(pass.pin)}</div>
      </div>
      <p><strong>Location:</strong> ${safe(pass.locationLabel || 'Collection point')}</p>
      ${pass.locationAddress ? `<p><strong>Address:</strong> ${safe(pass.locationAddress)}</p>` : ''}
      <p><strong>Instructions:</strong> ${safe(pass.pickupInstructions || 'Bring this PIN and your order confirmation when collecting.')}</p>
      ${pass.collectionTruth ? `<p style="padding:12px;border-radius:14px;background:#FFFBEB;color:#854D0E"><strong>Note:</strong> ${safe(pass.collectionTruth)}</p>` : ''}
      <p><a href="${safe(pass.qrUrl)}" style="display:inline-block;background:#18A7D0;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open QR collection pass</a></p>
      <p style="font-size:12px;color:#667487">If you have any questions, reply to this email.</p>
    </div>
  </div>`;
}

function smsText(pass: any, settings: any) {
  return `${settings.brandName}: Order #${pass.orderNumber} ${pass.status === 'ready' ? 'is ready for collection' : 'collection pass'} — PIN ${pass.pin}. ${pass.qrUrl}`;
}

export async function buildCollectionNotification(request: Request, orderId: string, options: { email?: string; force?: boolean } = {}) {
  const tenant = await resolveTenantId(request);
  const settings = await emailSettings(tenant.tenantId);
  const result = await getOrCreateCollectionPass(request, orderId, { email: options.email, force: options.force });
  if (!result.ok || !result.available || !result.pass) return { ok: false, reason: result.reason || 'collection-pass-unavailable', pass: result.pass || null };
  const pass = result.pass;
  const subject = pass.status === 'ready' ? `Your Holo Print order #${pass.orderNumber} is ready for collection` : `Collection pass for Holo Print order #${pass.orderNumber}`;
  return {
    ok: true,
    reason: '',
    tenant,
    settings,
    pass,
    notification: {
      to: pass.customerEmail,
      subject,
      text: buildText(pass, settings),
      html: buildHtml(pass, settings),
      smsText: smsText(pass, settings),
      qrUrl: pass.qrUrl,
      pin: pass.pin,
      orderId: pass.orderId,
      orderNumber: pass.orderNumber,
      status: pass.status,
      ready: pass.status === 'ready',
    },
  };
}

export async function queueCollectionNotification(request: Request, orderId: string, options: { email?: string; force?: boolean; sendWhenNotReady?: boolean; createdBy?: string } = {}) {
  const built = await buildCollectionNotification(request, orderId, options);
  if (!built.ok) return built;
  const { tenant, notification, pass } = built as any;
  if (!options.sendWhenNotReady && pass.status !== 'ready') return { ...built, ok: false, reason: 'order-not-ready', queued: false };
  const existing = await prisma.tenantEmailOutboxEmail.findFirst({
    where: { tenantId: tenant.tenantId, type: 'collection-ready', orderId: pass.orderId, status: { in: ['queued', 'sent'] } },
    orderBy: { createdAt: 'desc' },
  }).catch(() => null);
  if (existing) return { ...built, queued: false, duplicate: true, outbox: existing };
  const outbox = await prisma.tenantEmailOutboxEmail.create({
    data: {
      id: id('collection-email'),
      tenantId: tenant.tenantId,
      type: 'collection-ready',
      status: 'queued',
      to: notification.to,
      subject: notification.subject,
      body: notification.text,
      html: notification.html,
      reuploadLink: notification.qrUrl,
      orderId: pass.orderId,
      metadataJson: { collectionPass: pass, notification, smsText: notification.smsText, createdBy: options.createdBy || 'collection-notifications', queuedAt: new Date().toISOString() },
    },
  });
  return { ...built, queued: true, duplicate: false, outbox };
}

export async function listCollectionNotifications(request: Request, filters: { search?: string; status?: string } = {}) {
  const tenant = await resolveTenantId(request);
  const rows = await prisma.tenantEmailOutboxEmail.findMany({
    where: { tenantId: tenant.tenantId, type: 'collection-ready', ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  }).catch(() => []);
  let items = rows.map((row) => ({ id: row.id, status: row.status, to: row.to, subject: row.subject, orderId: row.orderId, createdAt: row.createdAt, sentAt: row.sentAt, failedAt: row.failedAt, attempts: row.attempts, metadata: row.metadataJson as any }));
  const q = clean(filters.search).toLowerCase();
  if (q) items = items.filter((item) => [item.to, item.subject, item.orderId, item.metadata?.collectionPass?.orderNumber, item.metadata?.collectionPass?.pin].join(' ').toLowerCase().includes(q));
  const passes = await listCollectionPasses(request, { status: 'all', search: filters.search || '' }).catch(() => ({ items: [], summary: {} }));
  return { items, count: items.length, passes: passes.items || [], passSummary: passes.summary || {}, summary: { queued: items.filter((i) => i.status === 'queued').length, sent: items.filter((i) => i.status === 'sent').length, failed: items.filter((i) => i.status === 'failed').length, total: items.length } };
}
