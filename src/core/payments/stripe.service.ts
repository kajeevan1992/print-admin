import crypto from 'crypto';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { queueOrderCustomerEmail } from '@/core/email/order-notifications.service';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { getOrder, updateOrder } from '@/core/orders/orders.service';
import { canCreatePaymentSessionForOrder } from '@/core/payments/payment-rules';

type StripeSessionInput = { orderId: string; successUrl?: string; cancelUrl?: string; customerEmail?: string };
type StripeRefundInput = { orderId: string; amountMinor?: number; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'; note?: string; actor?: string };
type StripeEvent = { id?: string; type?: string; data?: { object?: any } };

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;
const CONFIG_RESOURCE = 'admin-config' as any;
const TICKETS_KEY = 'production-job-tickets';
const DESIGN_BRIEFS_KEY = 'customer-design-briefs-v1';
const WEBHOOK_EVENTS_KEY = 'stripe-webhook-events';
const PAYMENT_RECEIVED_EMAIL_MARKER = 'customer-payment-received email queued';

function secretKey() { return process.env.STRIPE_SECRET_KEY || ''; }
export function stripePublicConfig() { return { publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || '', enabled: Boolean(process.env.STRIPE_SECRET_KEY), mode: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test' }; }
function assertStripeConfigured() { if (!secretKey()) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY in Coolify environment variables.'); }
function form(params: Record<string, string | number | boolean | undefined | null>) { const body = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') body.append(key, String(value)); }); return body; }
function appBase(request: Request) { const url = new URL(request.url); return `${url.protocol}//${url.host}`; }
function defaultReturnUrl(request: Request, path: string, orderId: string) { const base = String(process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || appBase(request)).replace(/\/$/, ''); return `${base}${path}?orderId=${encodeURIComponent(orderId)}&session_id={CHECKOUT_SESSION_ID}`; }
function paymentGate(status: string) { return ['paid', 'captured', 'authorized'].includes(String(status || '').toLowerCase()) ? 'paid' : 'awaiting-payment'; }
function stripeObjectOrderId(object: any) { return String(object?.metadata?.orderId || object?.client_reference_id || object?.orderId || '').trim(); }
function stripeObjectTenantId(object: any) { return String(object?.metadata?.tenantId || object?.tenantId || '').trim(); }
function stripeObjectPaymentType(object: any) { return String(object?.metadata?.paymentType || object?.metadata?.type || object?.paymentType || '').trim().toLowerCase(); }
function stripeObjectDesignBriefId(object: any) { return String(object?.metadata?.designBriefId || object?.designBriefId || '').trim(); }
function noteList(order: any, note: string) { return [...(Array.isArray(order?.internalNotes) ? order.internalNotes : []), note].filter(Boolean); }
function hasNote(order: any, marker: string) { return (Array.isArray(order?.internalNotes) ? order.internalNotes : []).some((note: unknown) => String(note || '').toLowerCase().includes(marker.toLowerCase())); }
function nowIso() { return new Date().toISOString(); }
function requestWithStripeTenant(request: Request, object: any) {
  const tenantId = stripeObjectTenantId(object);
  if (!tenantId) return request;
  const url = new URL(request.url);
  url.searchParams.set('tenantId', tenantId);
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', tenantId);
  return new Request(url.toString(), { method: 'GET', headers });
}
async function readConfigItems(request: Request, key: string) { try { const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key); const metadata = (record as any)?.metadataJson || {}; if (Array.isArray(metadata.items)) return metadata.items as Record<string, any>[]; if (Array.isArray(metadata.store?.items)) return metadata.store.items as Record<string, any>[]; return []; } catch (error) { const message = error instanceof Error ? error.message : ''; if (message.includes('was not found')) return []; throw error; } }
async function writeConfigItems(request: Request, key: string, title: string, items: Record<string, any>[], source = 'stripe-payment-sync') { return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: key, slug: key, name: title, title, description: title, metadataJson: { items, savedAt: nowIso(), storageKey: key, source } } as any); }
async function readTickets(request: Request) { return readConfigItems(request, TICKETS_KEY); }
async function writeTickets(request: Request, items: Record<string, any>[]) { return writeConfigItems(request, TICKETS_KEY, 'Production Job Tickets', items, 'stripe-payment-sync'); }
async function readDesignBriefs(request: Request) { return readConfigItems(request, DESIGN_BRIEFS_KEY); }
async function writeDesignBriefs(request: Request, items: Record<string, any>[]) { return writeConfigItems(request, DESIGN_BRIEFS_KEY, 'Customer Design Briefs', items, 'stripe-design-quote-sync'); }
function designTicketMatch(ticket: Record<string, any>, brief: Record<string, any>) { const keys = [brief.id, brief.orderId, brief.orderNumber, brief.stripeDesignQuoteSessionId, brief.stripeDesignQuotePaymentIntentId].filter(Boolean).map(String); return keys.some((key) => [ticket.designBriefId, ticket.orderId, ticket.orderNumber, ticket.stripeDesignQuoteSessionId, ticket.stripeDesignQuotePaymentIntentId, ticket.id].filter(Boolean).map(String).includes(key)); }
async function syncTicketPayment(request: Request, order: any, status: string, note: string) {
  const items = await readTickets(request).catch(() => []);
  if (!items.length) return { updated: false, reason: 'no tickets' };
  let changed = false;
  const now = nowIso();
  const next = items.map((ticket) => {
    const match = [ticket.orderId, ticket.orderNumber, ticket.id].filter(Boolean).map(String).includes(String(order.id)) || [ticket.orderId, ticket.orderNumber].filter(Boolean).map(String).includes(String(order.orderNumber));
    if (!match) return ticket;
    changed = true;
    const gate = paymentGate(status);
    const proofReady = ['approved', 'ready-for-print'].includes(String(ticket.customerProofStatus || '').toLowerCase()) || String(ticket.artworkStatus || '').toLowerCase() === 'approved' || String(ticket.handoffState || '').toLowerCase() === 'ready-for-print';
    const blockedByPayment = gate !== 'paid';
    return { ...ticket, paymentStatus: status, paymentGate: gate, paymentProvider: 'stripe', orderStatus: order.status, paidAt: ['paid', 'captured', 'authorized'].includes(status) ? now : ticket.paidAt || '', status: proofReady && !blockedByPayment ? 'ready-to-print' : blockedByPayment ? 'payment-hold' : ticket.status, handoffState: proofReady && !blockedByPayment ? 'ready-for-print' : blockedByPayment ? 'blocked' : ticket.handoffState, blockReason: blockedByPayment ? 'Payment has not been captured or authorised.' : '', updatedAt: now, productionNotes: [ticket.productionNotes, note].filter(Boolean).join(' ') };
  });
  if (changed) await writeTickets(request, next);
  return { updated: changed };
}
async function syncDesignQuotePayment(request: Request, object: any, eventType: string, status: 'paid' | 'pending' | 'failed' | 'cancelled') {
  const scopedRequest = requestWithStripeTenant(request, object);
  const briefId = stripeObjectDesignBriefId(object);
  const sessionId = String(object?.object === 'checkout.session' ? object?.id || '' : object?.checkout_session || '').trim();
  const paymentIntentId = String(object?.object === 'payment_intent' ? object?.id || '' : object?.payment_intent || '').trim();
  if (!briefId && !sessionId && !paymentIntentId) return { ok: false, skipped: true, reason: 'Stripe design quote object has no brief/session/payment intent reference.' };
  const briefs = await readDesignBriefs(scopedRequest).catch(() => []);
  const current = briefs.find((brief) => String(brief.id) === briefId || (sessionId && String(brief.stripeDesignQuoteSessionId || '') === sessionId) || (paymentIntentId && String(brief.stripeDesignQuotePaymentIntentId || '') === paymentIntentId));
  if (!current) return { ok: false, skipped: true, reason: `Design brief not found for Stripe design quote event ${briefId || sessionId || paymentIntentId}.` };
  const at = nowIso();
  const paid = status === 'paid';
  const failed = ['failed', 'cancelled'].includes(status);
  const note = paid ? `Stripe design quote paid. Event: ${eventType}.` : failed ? `Stripe design quote payment ${status}. Event: ${eventType}.` : `Stripe design quote payment update: ${status}. Event: ${eventType}.`;
  const updatedBrief = {
    ...current,
    designQuotePaymentStatus: status,
    designQuotePaidAt: paid ? at : current.designQuotePaidAt || '',
    designQuoteStatus: paid ? 'approved-to-design' : failed ? 'quote-sent' : current.designQuoteStatus || 'quote-sent',
    stripeDesignQuoteSessionId: sessionId || current.stripeDesignQuoteSessionId || '',
    stripeDesignQuotePaymentIntentId: paymentIntentId || current.stripeDesignQuotePaymentIntentId || '',
    updatedAt: at,
    history: [{ at, action: paid ? 'design-quote-paid' : `design-quote-${status}`, note, stripeSessionId: sessionId, stripePaymentIntentId: paymentIntentId }, ...(Array.isArray(current.history) ? current.history : [])].slice(0, 100),
  };
  await writeDesignBriefs(scopedRequest, briefs.map((brief) => String(brief.id) === String(current.id) ? updatedBrief : brief));
  const tickets = await readTickets(scopedRequest).catch(() => []);
  let ticketUpdated = false;
  const nextTickets = tickets.map((ticket) => {
    if (!designTicketMatch(ticket, updatedBrief)) return ticket;
    ticketUpdated = true;
    return {
      ...ticket,
      designBriefId: updatedBrief.id,
      designBriefStatus: 'submitted',
      designQuoteStatus: paid ? 'approved-to-design' : ticket.designQuoteStatus || 'quote-sent',
      designQuotePaymentStatus: status,
      designQuotePaidAt: paid ? at : ticket.designQuotePaidAt || '',
      stripeDesignQuoteSessionId: sessionId || ticket.stripeDesignQuoteSessionId || '',
      stripeDesignQuotePaymentIntentId: paymentIntentId || ticket.stripeDesignQuotePaymentIntentId || '',
      status: paid ? 'design-ready' : ticket.status || 'artwork-check',
      artworkStatus: paid ? 'design-ready' : ticket.artworkStatus || 'design-brief-submitted',
      handoffState: 'blocked',
      blockReason: paid ? 'Design quote paid. Design can start; print production remains blocked until final design proof is approved.' : ticket.blockReason || 'Waiting for design quote payment.',
      productionNotes: [ticket.productionNotes, note].filter(Boolean).join(' '),
      updatedAt: at,
    };
  });
  if (ticketUpdated) await writeTickets(scopedRequest, nextTickets);
  return { ok: true, source: 'stripe-design-quote-sync', paid, failed, status, brief: updatedBrief, ticketUpdated, tenantId: stripeObjectTenantId(object) || '' };
}
async function queuePaymentReceivedNotification(request: Request, order: any, source: string) {
  if (!order?.customerEmail) return { skipped: true, reason: 'missing customer email' };
  if (hasNote(order, PAYMENT_RECEIVED_EMAIL_MARKER)) return { skipped: true, reason: 'already queued' };
  const email = await queueOrderCustomerEmail(request, 'customer-payment-received', order, { actor: 'stripe', note: source }).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Payment received email queue failed.' }));
  const marker = `${PAYMENT_RECEIVED_EMAIL_MARKER} from ${source}.`;
  const updated = await updateOrder(request, order.id, { internalNotes: noteList(order, marker) }).catch(() => order);
  return { queued: true, email, order: updated };
}
async function readWebhookEvents(request: Request) { return readConfigItems(request, WEBHOOK_EVENTS_KEY); }
async function writeWebhookEvents(request: Request, events: Record<string, any>[]) { return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: WEBHOOK_EVENTS_KEY, slug: WEBHOOK_EVENTS_KEY, name: 'Stripe Webhook Events', description: 'Recent Stripe webhook events processed for payment lifecycle idempotency', metadataJson: { events: events.slice(0, 100), savedAt: nowIso(), storageKey: WEBHOOK_EVENTS_KEY, source: 'stripe-webhook' } } as any); }
export async function checkStripeWebhookEventProcessed(request: Request, eventId?: string, object?: any) { const scoped = requestWithStripeTenant(request, object || {}); const id = String(eventId || '').trim(); if (!id) return { processed: false, scopedRequest: scoped, reason: 'no event id' }; const events = await readWebhookEvents(scoped).catch(() => []); return { processed: events.some((event) => String(event.id) === id), scopedRequest: scoped, eventCount: events.length }; }
export async function recordStripeWebhookEventProcessed(request: Request, event: StripeEvent, result: any, object?: any) { const scoped = requestWithStripeTenant(request, object || event.data?.object || {}); const id = String(event.id || '').trim(); if (!id) return { recorded: false, reason: 'no event id' }; const events = await readWebhookEvents(scoped).catch(() => []); const next = [{ id, type: event.type || '', orderId: stripeObjectOrderId(object || event.data?.object || {}), tenantId: stripeObjectTenantId(object || event.data?.object || {}), paymentType: stripeObjectPaymentType(object || event.data?.object || {}), designBriefId: stripeObjectDesignBriefId(object || event.data?.object || {}), processedAt: nowIso(), ok: result?.ok !== false }, ...events.filter((item) => String(item.id) !== id)]; await writeWebhookEvents(scoped, next).catch(() => null); return { recorded: true, id, count: next.length };
}

async function stripePost(path: string, params: Record<string, string | number | boolean | undefined | null>) { assertStripeConfigured(); const response = await fetch(`${STRIPE_API_BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(params) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`); return payload; }
async function stripeGet(path: string) { assertStripeConfigured(); const response = await fetch(`${STRIPE_API_BASE}${path}`, { headers: { Authorization: `Bearer ${secretKey()}` } }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`); return payload; }

export async function createStripeCheckoutSession(request: Request, input: StripeSessionInput) {
  const order = await getOrder(request, input.orderId);
  if (!order) throw new Error('Order not found.');
  const readiness = canCreatePaymentSessionForOrder(order);
  if (!readiness.ok) throw new Error(readiness.reason);
  const tenant = tenantContextFromRequest(request);
  const successUrl = input.successUrl || defaultReturnUrl(request, '/payment-success', order.id);
  const cancelUrl = input.cancelUrl || defaultReturnUrl(request, '/payment-cancel', order.id);
  const email = input.customerEmail || order.customerEmail || undefined;
  const session = await stripePost('/checkout/sessions', { mode: 'payment', success_url: successUrl, cancel_url: cancelUrl, customer_email: email, client_reference_id: order.id, 'line_items[0][quantity]': 1, 'line_items[0][price_data][currency]': String(order.currency || 'GBP').toLowerCase(), 'line_items[0][price_data][unit_amount]': order.totalMinor, 'line_items[0][price_data][product_data][name]': `Order ${order.orderNumber}`, 'line_items[0][price_data][product_data][description]': `${order.items?.length || 0} print item(s)`, 'metadata[orderId]': order.id, 'metadata[orderNumber]': order.orderNumber, 'metadata[tenantId]': tenant.tenantId || '', 'payment_intent_data[metadata][orderId]': order.id, 'payment_intent_data[metadata][orderNumber]': order.orderNumber, 'payment_intent_data[metadata][tenantId]': tenant.tenantId || '' });
  await updateOrder(request, order.id, { paymentStatus: 'pending', paymentProvider: 'stripe', stripeCheckoutSessionId: session.id, stripePaymentIntentId: session.payment_intent || '', paymentFailureReason: '', internalNotes: noteList(order, `Stripe checkout session created: ${session.id}`) });
  await syncTicketPayment(request, order, 'pending', `Stripe checkout session created: ${session.id}.`).catch(() => null);
  return { session, order };
}

export async function getStripeCheckoutSession(sessionId: string) { return stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`); }
export async function markStripeCheckoutCancelled(request: Request, input: { orderId: string; sessionId?: string; actor?: string }) { const order = await getOrder(request, input.orderId); if (!order) throw new Error('Order not found.'); if (String(order.paymentStatus || '').toLowerCase() === 'paid') return { ok: true, order, skipped: true, reason: 'Order is already paid.' }; const note = `Stripe checkout cancelled by ${input.actor || 'customer'}.${input.sessionId ? ` Session: ${input.sessionId}.` : ''}`; const updated = await updateOrder(request, order.id, { status: order.status === 'AWAITING_PAYMENT' ? 'AWAITING_PAYMENT' : order.status, paymentStatus: 'cancelled', paymentProvider: order.paymentProvider || 'stripe', stripeCheckoutSessionId: input.sessionId || order.stripeCheckoutSessionId || '', paymentFailureReason: 'customer-cancelled-checkout', internalNotes: noteList(order, note) }); await syncTicketPayment(request, updated, 'cancelled', note).catch(() => null); return { ok: true, order: updated, cancelled: true }; }
async function resolvePaymentIntentForOrder(request: Request, order: any) { if (order.stripePaymentIntentId) return String(order.stripePaymentIntentId); if (order.stripeCheckoutSessionId) { const session = await getStripeCheckoutSession(String(order.stripeCheckoutSessionId)); if (session?.payment_intent) { await updateOrder(request, order.id, { stripePaymentIntentId: session.payment_intent, paymentProvider: 'stripe', internalNotes: noteList(order, `Stripe payment intent resolved from session ${session.id}: ${session.payment_intent}`) }); return String(session.payment_intent); } } return ''; }
export async function createStripeRefundForOrder(request: Request, input: StripeRefundInput) { const order = await getOrder(request, input.orderId); if (!order) throw new Error('Order not found.'); const paymentIntentId = await resolvePaymentIntentForOrder(request, order); if (!paymentIntentId) throw new Error('No Stripe payment intent is linked to this order, so a real Stripe refund cannot be created. Use refund note for manual/offline refunds.'); const amountMinor = Number(input.amountMinor || 0); if (amountMinor < 0) throw new Error('Refund amount cannot be negative.'); const refund = await stripePost('/refunds', { payment_intent: paymentIntentId, amount: amountMinor > 0 ? Math.round(amountMinor) : undefined, reason: input.reason || 'requested_by_customer', 'metadata[orderId]': order.id, 'metadata[orderNumber]': order.orderNumber, 'metadata[actor]': input.actor || 'admin', 'metadata[note]': input.note || '' }); return { refund, order, paymentIntentId }; }

export async function applyStripeCheckoutSessionToOrder(request: Request, session: any, eventType = 'manual') {
  if (stripeObjectPaymentType(session) === 'design-quote') {
    const status = session.payment_status === 'paid' || eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded' ? 'paid' : eventType === 'checkout.session.async_payment_failed' || session.payment_status === 'failed' || session.status === 'expired' ? 'failed' : 'pending';
    return syncDesignQuotePayment(request, session, eventType, status as 'paid' | 'pending' | 'failed' | 'cancelled');
  }
  const scopedRequest = requestWithStripeTenant(request, session);
  const orderId = stripeObjectOrderId(session);
  if (!orderId) return { ok: false, skipped: true, reason: 'Stripe session has no order metadata.' };
  const order = await getOrder(scopedRequest, String(orderId));
  if (!order) return { ok: false, skipped: true, reason: `Order not found: ${orderId}` };
  const paid = session.payment_status === 'paid' || eventType === 'checkout.session.completed' || eventType === 'checkout.session.async_payment_succeeded';
  const failed = eventType === 'checkout.session.async_payment_failed' || session.payment_status === 'failed' || session.status === 'expired';
  const nextStatus = paid ? (order.status === 'AWAITING_PAYMENT' ? 'ARTWORK_CHECK' : order.status) : order.status;
  const nextPaymentStatus = paid ? 'paid' : failed ? 'failed' : session.payment_status || 'pending';
  const note = paid ? `Stripe payment confirmed. Session: ${session.id}.` : failed ? `Stripe payment failed or expired. Session: ${session.id}.` : `Stripe payment update (${eventType}). Session: ${session.id}.`;
  const updated = await updateOrder(scopedRequest, order.id, { status: nextStatus, paymentStatus: nextPaymentStatus, paymentProvider: 'stripe', stripeCheckoutSessionId: session.id, stripePaymentIntentId: session.payment_intent || order.stripePaymentIntentId || '', paidAt: paid ? nowIso() : order.paidAt, paymentFailureReason: failed ? eventType : '', internalNotes: noteList(order, note) });
  await syncTicketPayment(scopedRequest, updated, nextPaymentStatus, note).catch(() => null);
  const paymentEmail = paid ? await queuePaymentReceivedNotification(scopedRequest, updated, `stripe-session-${session.id || eventType}`).catch((error) => ({ queued: false, error: error instanceof Error ? error.message : 'Payment email queue failed.' })) : { skipped: true };
  return { ok: true, order: (paymentEmail as any)?.order || updated, paid, failed, eventType, tenantId: stripeObjectTenantId(session) || '', paymentEmail };
}

export async function applyStripePaymentIntentToOrder(request: Request, intent: any, eventType = 'manual') {
  if (stripeObjectPaymentType(intent) === 'design-quote') {
    const rawStatus = String(intent.status || '').toLowerCase();
    const status = eventType === 'payment_intent.succeeded' || rawStatus === 'succeeded' ? 'paid' : eventType === 'payment_intent.payment_failed' || rawStatus === 'requires_payment_method' || rawStatus === 'canceled' ? 'failed' : rawStatus === 'processing' ? 'pending' : 'pending';
    return syncDesignQuotePayment(request, intent, eventType, status as 'paid' | 'pending' | 'failed' | 'cancelled');
  }
  const scopedRequest = requestWithStripeTenant(request, intent);
  const orderId = stripeObjectOrderId(intent);
  if (!orderId) return { ok: false, skipped: true, reason: 'Stripe payment intent has no order metadata.' };
  const order = await getOrder(scopedRequest, String(orderId));
  if (!order) return { ok: false, skipped: true, reason: `Order not found: ${orderId}` };
  const status = String(intent.status || '').toLowerCase();
  const paid = eventType === 'payment_intent.succeeded' || status === 'succeeded';
  const authorized = status === 'requires_capture';
  const failed = eventType === 'payment_intent.payment_failed' || status === 'requires_payment_method' || status === 'canceled';
  const nextPaymentStatus = paid ? 'paid' : authorized ? 'authorized' : failed ? 'failed' : status === 'processing' ? 'pending' : order.paymentStatus || 'pending';
  const nextStatus = ['paid', 'authorized'].includes(nextPaymentStatus) && order.status === 'AWAITING_PAYMENT' ? 'ARTWORK_CHECK' : order.status;
  const note = `Stripe payment intent update (${eventType}). Intent: ${intent.id}. Status: ${intent.status || 'unknown'}.`;
  const updated = await updateOrder(scopedRequest, order.id, { status: nextStatus, paymentStatus: nextPaymentStatus, paymentProvider: 'stripe', stripePaymentIntentId: intent.id || order.stripePaymentIntentId || '', paidAt: paid ? nowIso() : order.paidAt, paymentFailureReason: failed ? eventType : '', internalNotes: noteList(order, note) });
  await syncTicketPayment(scopedRequest, updated, nextPaymentStatus, note).catch(() => null);
  const paymentEmail = paid ? await queuePaymentReceivedNotification(scopedRequest, updated, `stripe-payment-intent-${intent.id || eventType}`).catch((error) => ({ queued: false, error: error instanceof Error ? error.message : 'Payment email queue failed.' })) : { skipped: true };
  return { ok: true, order: (paymentEmail as any)?.order || updated, paid, authorized, failed, eventType, tenantId: stripeObjectTenantId(intent) || '', paymentEmail };
}

export async function applyStripeRefundToOrder(request: Request, refund: any, eventType = 'manual') {
  const scopedRequest = requestWithStripeTenant(request, refund);
  const orderId = stripeObjectOrderId(refund);
  if (!orderId) return { ok: false, skipped: true, reason: 'Stripe refund has no order metadata.' };
  const order = await getOrder(scopedRequest, String(orderId));
  if (!order) return { ok: false, skipped: true, reason: `Order not found: ${orderId}` };
  const refundStatus = String(refund.status || '').toLowerCase();
  const succeeded = refundStatus === 'succeeded';
  const nextPaymentStatus = succeeded ? 'refunded' : 'refund-pending';
  const note = `Stripe refund update (${eventType}). Refund: ${refund.id}. Status: ${refund.status || 'unknown'}.`;
  const updated = await updateOrder(scopedRequest, order.id, { paymentStatus: nextPaymentStatus, paymentProvider: 'stripe', stripeRefundId: refund.id || order.stripeRefundId || '', stripeRefundStatus: refund.status || order.stripeRefundStatus || '', refundAmountMinor: refund.amount || order.refundAmountMinor || '', refundedAt: succeeded ? nowIso() : order.refundedAt, refundNote: refund.reason || order.refundNote || '', internalNotes: noteList(order, note) });
  await syncTicketPayment(scopedRequest, updated, nextPaymentStatus, note).catch(() => null);
  return { ok: true, order: updated, refunded: succeeded, eventType, tenantId: stripeObjectTenantId(refund) || '' };
}

function parseStripeSignature(header: string) { return header.split(',').reduce((acc, part) => { const [key, value] = part.split('='); if (key && value) { if (!acc[key]) acc[key] = []; acc[key].push(value); } return acc; }, {} as Record<string, string[]>); }
function verifyStripeSignature(raw: string, header: string, secret: string) { const parsed = parseStripeSignature(header); const timestamp = Number(parsed.t?.[0] || 0); const signatures = parsed.v1 || []; if (!timestamp || !signatures.length) throw new Error('Invalid Stripe signature header.'); const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp); if (age > SIGNATURE_TOLERANCE_SECONDS) throw new Error('Stripe webhook timestamp is outside tolerance.'); const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`, 'utf8').digest('hex'); const expectedBuffer = Buffer.from(expected, 'hex'); const valid = signatures.some((signature) => { const actualBuffer = Buffer.from(signature, 'hex'); return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer); }); if (!valid) throw new Error('Stripe webhook signature verification failed.'); }
export async function parseStripeWebhookEvent(request: Request): Promise<StripeEvent> { const raw = await request.text(); const signingSecret = process.env.STRIPE_WEBHOOK_SECRET || ''; const signature = request.headers.get('stripe-signature') || ''; if (signingSecret) verifyStripeSignature(raw, signature, signingSecret); return JSON.parse(raw || '{}'); }
