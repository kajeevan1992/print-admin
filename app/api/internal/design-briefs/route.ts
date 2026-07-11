import { NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { queueOrderCustomerEmail } from '@/core/email/order-notifications.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

const CONFIG_RESOURCE = 'admin-config' as any;
const DESIGN_BRIEFS_KEY = 'customer-design-briefs-v1';
const TICKETS_KEY = 'production-job-tickets';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';

type Store = Record<string, any>;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function nowIso() { return new Date().toISOString(); }
function text(value: unknown) { return String(value || '').trim(); }
function moneyMinor(value: unknown) { const next = Number(value || 0); return Number.isFinite(next) && next > 0 ? Math.round(next) : 0; }
function form(params: Record<string, string | number | boolean | undefined | null>) { const body = new URLSearchParams(); Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') body.append(key, String(value)); }); return body; }
function stripeSecret() { return process.env.STRIPE_SECRET_KEY || ''; }
function appBase(request: Request) { const url = new URL(request.url); return `${url.protocol}//${url.host}`; }
function customerEmail(brief: Store) { return text(brief.customerEmail || brief.customer?.email).toLowerCase(); }
function storefrontBase(request: Request) { return String(process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL || appBase(request)).replace(/\/$/, ''); }
function designBriefUrl(request: Request, brief: Store, state: 'success' | 'cancel') {
  const params = new URLSearchParams({ orderId: String(brief.orderNumber || brief.orderId || ''), designQuote: state, session_id: '{CHECKOUT_SESSION_ID}' });
  if (customerEmail(brief)) params.set('email', customerEmail(brief));
  return `${storefrontBase(request)}/design-brief?${params.toString()}`;
}
function proofReviewUrl(request: Request, brief: Store) {
  const params = new URLSearchParams({ orderId: String(brief.orderNumber || brief.orderId || '') });
  if (customerEmail(brief)) params.set('email', customerEmail(brief));
  return `${storefrontBase(request)}/proof-action?${params.toString()}`;
}
async function stripePost(path: string, params: Record<string, string | number | boolean | undefined | null>) {
  if (!stripeSecret()) throw new Error('Stripe is not configured. Add STRIPE_SECRET_KEY to create design quote payment links.');
  const response = await fetch(`${STRIPE_API_BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${stripeSecret()}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(params) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Stripe request failed: ${path}`);
  return payload;
}
async function createDesignQuoteSession(request: Request, brief: Store, amountMinor: number) {
  const tenant = tenantContextFromRequest(request);
  const orderNumber = text(brief.orderNumber || brief.orderId);
  const session = await stripePost('/checkout/sessions', {
    mode: 'payment',
    success_url: designBriefUrl(request, brief, 'success'),
    cancel_url: designBriefUrl(request, brief, 'cancel'),
    customer_email: customerEmail(brief) || undefined,
    client_reference_id: text(brief.orderId || brief.orderNumber || brief.id),
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][unit_amount]': amountMinor,
    'line_items[0][price_data][product_data][name]': `Design work for order ${orderNumber}`,
    'line_items[0][price_data][product_data][description]': text(brief.productName || brief.designType || 'Design support'),
    'metadata[paymentType]': 'design-quote',
    'metadata[designBriefId]': brief.id,
    'metadata[orderId]': brief.orderId || '',
    'metadata[orderNumber]': brief.orderNumber || '',
    'metadata[tenantId]': tenant.tenantId || '',
    'payment_intent_data[metadata][paymentType]': 'design-quote',
    'payment_intent_data[metadata][designBriefId]': brief.id,
    'payment_intent_data[metadata][orderId]': brief.orderId || '',
    'payment_intent_data[metadata][orderNumber]': brief.orderNumber || '',
    'payment_intent_data[metadata][tenantId]': tenant.tenantId || '',
  });
  return { id: session.id, url: session.url || '', paymentIntentId: session.payment_intent || '', amountMinor };
}
function designQuoteEmailOrder(brief: Store) {
  return {
    id: text(brief.orderId || brief.orderNumber || brief.id),
    orderNumber: text(brief.orderNumber || brief.orderId || brief.id),
    customerName: text(brief.customerName || 'Customer'),
    customerEmail: customerEmail(brief),
    currency: 'GBP',
    totalMinor: moneyMinor(brief.quoteAmountMinor || brief.designQuoteAmountMinor || 0),
    status: 'DESIGN_QUOTE_SENT',
    paymentStatus: brief.designQuotePaymentStatus || 'pending',
    items: [{ productName: `Design work${brief.productName ? ` - ${brief.productName}` : ''}`, quantity: 1 }],
  };
}
function proofReviewEmailOrder(brief: Store) {
  return {
    id: text(brief.orderId || brief.orderNumber || brief.id),
    orderNumber: text(brief.orderNumber || brief.orderId || brief.id),
    customerName: text(brief.customerName || 'Customer'),
    customerEmail: customerEmail(brief),
    currency: 'GBP',
    totalMinor: 0,
    status: 'PROOF_READY_FOR_REVIEW',
    paymentStatus: brief.paymentStatus || 'paid',
    items: [{ productName: `Proof review${brief.productName ? ` - ${brief.productName}` : ''}`, quantity: 1 }],
  };
}
async function queueDesignQuotePaymentEmail(request: Request, brief: Store, paymentUrl: string, staffNote: string) {
  if (!paymentUrl) return { ok: false, skipped: true, reason: 'Missing design quote payment URL.' };
  if (!customerEmail(brief)) return { ok: false, skipped: true, reason: 'Missing customer email.' };
  return queueOrderCustomerEmail(request, 'customer-design-quote-payment-link', designQuoteEmailOrder(brief), { paymentUrl, note: staffNote, actor: 'design-brief-review' });
}
async function queueProofReviewEmail(request: Request, brief: Store, proofUrl: string, staffNote: string) {
  if (!customerEmail(brief)) return { ok: false, skipped: true, reason: 'Missing customer email.' };
  return queueOrderCustomerEmail(request, 'customer-proof-review-ready', proofReviewEmailOrder(brief), { proofUrl, reviewUrl: proofReviewUrl(request, brief), note: staffNote, actor: 'design-proof-review' });
}
async function readItems(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const metadata = (record as any)?.metadataJson || {};
    if (Array.isArray(metadata.items)) return metadata.items as Store[];
    if (Array.isArray(metadata.store?.items)) return metadata.store.items as Store[];
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}
async function writeItems(request: Request, key: string, title: string, items: Store[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: key,
    slug: key,
    name: title,
    title,
    description: title,
    metadataJson: { items, savedAt: nowIso(), storageKey: key, source: 'internal-design-brief-review' },
  } as any);
}
function matchTicket(ticket: Store, brief: Store) {
  const keys = [brief.orderId, brief.orderNumber, brief.designBriefId, brief.id].filter(Boolean).map(String);
  return keys.some((key) => [ticket.orderId, ticket.orderNumber, ticket.designBriefId, ticket.id].filter(Boolean).map(String).includes(key));
}
function enrichBrief(brief: Store, tickets: Store[]) {
  const ticket = tickets.find((row) => matchTicket(row, brief)) || null;
  return {
    ...brief,
    ticket: ticket ? {
      id: ticket.id,
      status: ticket.status,
      artworkStatus: ticket.artworkStatus,
      preflightStatus: ticket.preflightStatus,
      customerProofStatus: ticket.customerProofStatus,
      handoffState: ticket.handoffState,
      paymentStatus: ticket.paymentStatus,
      designQuoteStatus: ticket.designQuoteStatus || brief.designQuoteStatus || 'needs-review',
      designQuotePaymentStatus: ticket.designQuotePaymentStatus || brief.designQuotePaymentStatus || '',
      designQuotePaymentUrl: ticket.designQuotePaymentUrl || brief.designQuotePaymentUrl || '',
      designQuoteEmailQueuedAt: ticket.designQuoteEmailQueuedAt || brief.designQuoteEmailQueuedAt || '',
      proofEmailQueuedAt: ticket.proofEmailQueuedAt || brief.proofEmailQueuedAt || '',
      proofEmailStatus: ticket.proofEmailStatus || brief.proofEmailStatus || '',
      designProofUrl: ticket.designProofUrl || brief.designProofUrl || '',
      blockReason: ticket.blockReason || '',
      owner: ticket.owner || ticket.assignedOperator || 'Prepress Team',
      updatedAt: ticket.updatedAt || '',
    } : null,
  };
}
function summary(items: Store[]) {
  return {
    total: items.length,
    needsReview: items.filter((item) => text(item.designQuoteStatus || item.status) === 'needs-review' || text(item.status) === 'submitted').length,
    quoteRequired: items.filter((item) => text(item.designQuoteStatus) === 'quote-required').length,
    quoteSent: items.filter((item) => text(item.designQuoteStatus) === 'quote-sent').length,
    quotePaid: items.filter((item) => text(item.designQuotePaymentStatus) === 'paid').length,
    readyForDesign: items.filter((item) => ['no-extra-charge', 'approved-to-design', 'design-in-progress', 'proof-sent'].includes(text(item.designQuoteStatus))).length,
  };
}
function allowedQuoteStatus(value: string) {
  return ['needs-review', 'quote-required', 'quote-sent', 'no-extra-charge', 'approved-to-design', 'design-in-progress', 'proof-sent', 'waiting-customer', 'closed'].includes(value);
}
function ticketPatchFor(status: string, note: string, proofUrl: string) {
  if (status === 'quote-required') return { designQuoteStatus: status, handoffState: 'blocked', status: 'artwork-check', blockReason: 'Design quote is required before design work starts.' };
  if (status === 'quote-sent') return { designQuoteStatus: status, handoffState: 'blocked', status: 'artwork-check', blockReason: 'Design quote sent. Waiting for customer approval/payment before design starts.' };
  if (status === 'no-extra-charge' || status === 'approved-to-design') return { designQuoteStatus: status, handoffState: 'blocked', status: 'design-ready', artworkStatus: 'design-ready', blockReason: 'Design brief reviewed. Design can start; print production remains blocked until design proof is approved.' };
  if (status === 'design-in-progress') return { designQuoteStatus: status, handoffState: 'blocked', status: 'design-in-progress', artworkStatus: 'design-in-progress', blockReason: 'Design is in progress. Print production remains blocked until design proof is approved.' };
  if (status === 'proof-sent') return { designQuoteStatus: status, handoffState: 'blocked', status: 'artwork-check', artworkStatus: 'design-proof-ready', preflightStatus: 'pass', customerProofStatus: 'pending-customer-approval', designProofUrl: proofUrl, proofSentAt: nowIso(), blockReason: 'Design proof sent to customer. Waiting for approval before print production can start.' };
  if (status === 'waiting-customer') return { designQuoteStatus: status, handoffState: 'blocked', status: 'artwork-check', blockReason: 'Waiting for customer response on design brief.' };
  if (status === 'closed') return { designQuoteStatus: status, handoffState: 'blocked', status: 'closed', blockReason: note || 'Design brief closed by staff.' };
  return { designQuoteStatus: 'needs-review', handoffState: 'blocked', status: 'artwork-check', blockReason: 'Design brief needs staff review.' };
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: Request) {
  try {
    const [briefs, tickets] = await Promise.all([readItems(request, DESIGN_BRIEFS_KEY), readItems(request, TICKETS_KEY)]);
    const items = briefs.map((brief) => enrichBrief(brief, tickets)).sort((a, b) => String(b.submittedAt || b.updatedAt || '').localeCompare(String(a.submittedAt || a.updatedAt || '')));
    return json({ ok: true, source: 'internal-design-brief-review', summary: summary(items), items });
  } catch (error) {
    return json({ ok: false, source: 'internal-design-brief-review', error: error instanceof Error ? error.message : 'Design brief review lookup failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const id = text(body.id || body.briefId);
    const designQuoteStatus = text(body.designQuoteStatus || body.status || 'needs-review');
    const staffNote = text(body.staffNote || body.note);
    const designProofUrl = text(body.designProofUrl || body.proofUrl);
    const quoteAmountMinor = moneyMinor(body.quoteAmountMinor || 0);
    const generatePaymentLink = body.generatePaymentLink !== false;
    const sendCustomerEmail = body.sendCustomerEmail !== false;
    if (!id) return json({ ok: false, error: 'brief id is required.' }, { status: 400 });
    if (!allowedQuoteStatus(designQuoteStatus)) return json({ ok: false, error: `Unsupported design quote status: ${designQuoteStatus}` }, { status: 400 });
    const briefs = await readItems(request, DESIGN_BRIEFS_KEY);
    const current = briefs.find((brief) => String(brief.id) === id);
    if (!current) return json({ ok: false, error: 'Design brief was not found.' }, { status: 404 });
    const at = nowIso();
    let paymentSession: Store | null = null;
    if (designQuoteStatus === 'quote-sent' && quoteAmountMinor > 0 && generatePaymentLink) {
      paymentSession = await createDesignQuoteSession(request, { ...current, quoteAmountMinor }, quoteAmountMinor);
    }
    const emailTargetUrl = paymentSession?.url || current.designQuotePaymentUrl || '';
    const quoteEmailResult = designQuoteStatus === 'quote-sent' && quoteAmountMinor > 0 && sendCustomerEmail
      ? await queueDesignQuotePaymentEmail(request, { ...current, quoteAmountMinor }, emailTargetUrl, staffNote).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Design quote email queue failed.' }))
      : { skipped: true };
    const quoteEmailQueued = Boolean((quoteEmailResult as any)?.ok && !(quoteEmailResult as any)?.skipped);
    const proofEmailResult = designQuoteStatus === 'proof-sent' && sendCustomerEmail
      ? await queueProofReviewEmail(request, { ...current, designProofUrl: designProofUrl || current.designProofUrl || '' }, designProofUrl || current.designProofUrl || '', staffNote).catch((error) => ({ ok: false, error: error instanceof Error ? error.message : 'Proof review email queue failed.' }))
      : { skipped: true };
    const proofEmailQueued = Boolean((proofEmailResult as any)?.ok && !(proofEmailResult as any)?.skipped);
    const updatedBrief = {
      ...current,
      designQuoteStatus,
      status: current.status || 'submitted',
      quoteAmountMinor: quoteAmountMinor || current.quoteAmountMinor || 0,
      staffNote: staffNote || current.staffNote || '',
      designProofUrl: designProofUrl || current.designProofUrl || '',
      proofSentAt: designQuoteStatus === 'proof-sent' ? at : current.proofSentAt || '',
      ...(paymentSession ? { designQuotePaymentUrl: paymentSession.url, stripeDesignQuoteSessionId: paymentSession.id, stripeDesignQuotePaymentIntentId: paymentSession.paymentIntentId || current.stripeDesignQuotePaymentIntentId || '', designQuotePaymentStatus: 'pending', designQuotePaymentRequestedAt: at } : {}),
      ...(quoteEmailQueued ? { designQuoteEmailQueuedAt: at, designQuoteEmailStatus: 'queued' } : { designQuoteEmailStatus: (quoteEmailResult as any)?.error ? 'failed' : current.designQuoteEmailStatus || '' }),
      ...(proofEmailQueued ? { proofEmailQueuedAt: at, proofEmailStatus: 'queued' } : { proofEmailStatus: (proofEmailResult as any)?.error ? 'failed' : current.proofEmailStatus || '' }),
      reviewedAt: at,
      reviewedBy: body.actor || 'staff',
      history: [{ at, action: `design-brief-${designQuoteStatus}`, note: staffNote, quoteAmountMinor: quoteAmountMinor || current.quoteAmountMinor || 0, stripeDesignQuoteSessionId: paymentSession?.id || '', designProofUrl: designProofUrl || current.designProofUrl || '', designQuoteEmailStatus: quoteEmailQueued ? 'queued' : (quoteEmailResult as any)?.skipped ? 'skipped' : (quoteEmailResult as any)?.error ? 'failed' : '', proofEmailStatus: proofEmailQueued ? 'queued' : (proofEmailResult as any)?.skipped ? 'skipped' : (proofEmailResult as any)?.error ? 'failed' : '' }, ...(Array.isArray(current.history) ? current.history : [])].slice(0, 80),
      updatedAt: at,
    };
    const nextBriefs = briefs.map((brief) => String(brief.id) === id ? updatedBrief : brief);
    await writeItems(request, DESIGN_BRIEFS_KEY, 'Customer Design Briefs', nextBriefs);

    const tickets = await readItems(request, TICKETS_KEY).catch(() => []);
    let ticketUpdated = false;
    const patch = ticketPatchFor(designQuoteStatus, staffNote, updatedBrief.designProofUrl || '');
    const nextTickets = tickets.map((ticket) => {
      if (!matchTicket(ticket, updatedBrief)) return ticket;
      ticketUpdated = true;
      return { ...ticket, ...patch, designBriefId: updatedBrief.id, designBriefStatus: 'submitted', designStaffNote: staffNote || ticket.designStaffNote || '', designQuoteAmountMinor: updatedBrief.quoteAmountMinor || ticket.designQuoteAmountMinor || 0, designQuotePaymentStatus: updatedBrief.designQuotePaymentStatus || ticket.designQuotePaymentStatus || '', designQuotePaymentUrl: updatedBrief.designQuotePaymentUrl || ticket.designQuotePaymentUrl || '', stripeDesignQuoteSessionId: updatedBrief.stripeDesignQuoteSessionId || ticket.stripeDesignQuoteSessionId || '', designProofUrl: updatedBrief.designProofUrl || ticket.designProofUrl || '', designQuoteEmailQueuedAt: updatedBrief.designQuoteEmailQueuedAt || ticket.designQuoteEmailQueuedAt || '', designQuoteEmailStatus: updatedBrief.designQuoteEmailStatus || ticket.designQuoteEmailStatus || '', proofEmailQueuedAt: updatedBrief.proofEmailQueuedAt || ticket.proofEmailQueuedAt || '', proofEmailStatus: updatedBrief.proofEmailStatus || ticket.proofEmailStatus || '', productionNotes: [ticket.productionNotes, staffNote ? `Design staff note: ${staffNote}` : '', `Design quote status: ${designQuoteStatus}.`, updatedBrief.designProofUrl && designQuoteStatus === 'proof-sent' ? `Design proof URL sent for approval: ${updatedBrief.designProofUrl}` : '', paymentSession?.url ? `Design quote payment link created: ${paymentSession.url}` : '', quoteEmailQueued ? 'Design quote payment email queued for customer.' : '', proofEmailQueued ? 'Design proof review email queued for customer.' : ''].filter(Boolean).join(' '), updatedAt: at };
    });
    if (ticketUpdated) await writeItems(request, TICKETS_KEY, 'Production Job Tickets', nextTickets);
    return json({ ok: true, source: 'internal-design-brief-review', brief: updatedBrief, paymentSession, emailResult: designQuoteStatus === 'proof-sent' ? proofEmailResult : quoteEmailResult, quoteEmailResult, proofEmailResult, ticketUpdated, message: designQuoteStatus === 'proof-sent' ? (proofEmailQueued ? 'Design proof marked as sent and emailed to customer for approval.' : 'Design proof marked as sent for customer approval.') : paymentSession?.url ? (quoteEmailQueued ? 'Design quote payment link created and emailed to customer.' : 'Design quote payment link created.') : 'Design brief review state updated.' });
  } catch (error) {
    return json({ ok: false, source: 'internal-design-brief-review', error: error instanceof Error ? error.message : 'Design brief review update failed.' }, { status: 500 });
  }
}
