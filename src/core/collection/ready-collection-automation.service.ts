import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { queueCollectionNotification } from './collection-notifications.service';
import { sendQueuedTenantEmails } from '@/core/email/email-outbox-sender.service';

const READY_STATUSES = new Set(['QUALITY_CHECK', 'DISPATCHED', 'DELIVERED']);
const PROCESSABLE_STATUSES = ['QUALITY_CHECK', 'DISPATCHED', 'DELIVERED'];

function clean(value: unknown) { return String(value || '').trim(); }
function upper(value: unknown) { return clean(value).toUpperCase().replace(/-/g, '_'); }
function bool(value: unknown) { return value === true || String(value || '').toLowerCase() === 'true' || String(value || '') === '1'; }
function parseNotes(value: unknown) { if (typeof value !== 'string') return {} as Record<string, any>; try { return JSON.parse(value); } catch { return { note: String(value || '') }; } }

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const value = clean(context.tenantId);
  const tenant = (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }).catch(() => null))) || (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }).catch(() => null))) || (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }).catch(() => null));
  return tenant?.id || value || 'platform-demo';
}

function isCollectionOrder(order: any) {
  const notes = parseNotes(order?.notes);
  const checkout = notes.rawCheckout || notes.checkout || {};
  const fulfilment = checkout.fulfilmentSelection || checkout.delivery || notes.fulfilmentSelection || notes.delivery || order?.fulfilmentSelection || order?.delivery || {};
  const mode = upper(checkout.fulfilmentMode || order?.fulfilmentMode || fulfilment.mode || fulfilment.fulfilmentMode || fulfilment.type || notes.shippingMethod || order?.shippingMethod || '');
  const label = [notes.shippingMethod, order?.shippingMethod, fulfilment.label, fulfilment.publicLabel, fulfilment.checkoutDescription].map(clean).join(' ').toLowerCase();
  return mode.includes('COLLECTION') || label.includes('collect');
}

function shouldSendNow(options: { sendNow?: boolean } = {}) {
  if (typeof options.sendNow === 'boolean') return options.sendNow;
  return bool(process.env.COLLECTION_READY_AUTO_SEND || process.env.AUTO_SEND_COLLECTION_READY_EMAILS);
}

export async function runReadyCollectionAutomationForOrder(request: Request, order: any, options: { previousStatus?: string; source?: string; sendNow?: boolean; force?: boolean } = {}) {
  const currentStatus = upper(order?.status);
  const previousStatus = upper(options.previousStatus || '');
  const becameReady = READY_STATUSES.has(currentStatus) && (!previousStatus || !READY_STATUSES.has(previousStatus));
  const stillReady = READY_STATUSES.has(currentStatus);
  if (!order?.id && !order?.orderNumber) return { ok: false, skipped: true, reason: 'order-missing', orderId: '' };
  if (!stillReady) return { ok: true, skipped: true, reason: 'order-not-ready-status', orderId: order.id || order.orderNumber, status: currentStatus };
  if (!becameReady && !options.force) return { ok: true, skipped: true, reason: 'already-ready-status', orderId: order.id || order.orderNumber, status: currentStatus };
  if (!isCollectionOrder(order)) return { ok: true, skipped: true, reason: 'not-a-collection-order', orderId: order.id || order.orderNumber, status: currentStatus };

  const queued = await queueCollectionNotification(request, order.id || order.orderNumber, { force: true, sendWhenNotReady: false, createdBy: options.source || 'ready-collection-automation' });
  const sendNow = shouldSendNow(options);
  const sent = sendNow && queued.ok ? await sendQueuedTenantEmails(request, { limit: 10, onlyType: 'collection-ready', dryRun: false }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Auto-send failed.' })) : null;
  return { ok: queued.ok, skipped: false, reason: queued.reason || '', becameReady, status: currentStatus, previousStatus, orderId: order.id, orderNumber: order.orderNumber, queued, sent, sendNow };
}

export async function runReadyCollectionAutomationForOrderId(request: Request, orderId: string, options: { sendNow?: boolean; force?: boolean; source?: string } = {}) {
  const tenantId = await tenantIdFromRequest(request);
  const order = await prisma.order.findFirst({ where: { tenantId, OR: [{ id: orderId }, { orderNumber: orderId }] }, include: { items: true, customer: true } });
  if (!order) return { ok: false, skipped: true, reason: 'order-not-found', orderId };
  return runReadyCollectionAutomationForOrder(request, order, { ...options, source: options.source || 'ready-collection-automation-manual' });
}

export async function runReadyCollectionAutomationBatch(request: Request, options: { limit?: number; sendNow?: boolean; force?: boolean } = {}) {
  const tenantId = await tenantIdFromRequest(request);
  const limit = Math.max(1, Math.min(Number(options.limit || 50), 100));
  const orders = await prisma.order.findMany({ where: { tenantId, status: { in: PROCESSABLE_STATUSES as any } }, include: { items: true, customer: true }, orderBy: { updatedAt: 'desc' }, take: limit });
  const results = [];
  for (const order of orders) results.push(await runReadyCollectionAutomationForOrder(request, order, { force: options.force ?? true, sendNow: options.sendNow, source: 'ready-collection-automation-batch' }));
  return {
    count: results.length,
    queued: results.filter((result: any) => result.queued?.queued).length,
    duplicate: results.filter((result: any) => result.queued?.duplicate).length,
    skipped: results.filter((result: any) => result.skipped).length,
    sent: results.reduce((sum: number, result: any) => sum + Number(result.sent?.results?.filter?.((item: any) => item.ok)?.length || 0), 0),
    results,
  };
}

export function readyCollectionStatuses() { return [...READY_STATUSES]; }
