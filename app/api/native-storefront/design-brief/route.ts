import { NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { getOrder, updateOrder } from '@/core/orders/orders.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

const CONFIG_RESOURCE = 'admin-config' as any;
const DESIGN_BRIEFS_KEY = 'customer-design-briefs-v1';
const TICKETS_KEY = 'production-job-tickets';

type Store = Record<string, any>;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } }); }
function text(value: unknown) { return String(value || '').trim(); }
function nowIso() { return new Date().toISOString(); }
function noteList(order: Store, note: string) { return [...(Array.isArray(order?.internalNotes) ? order.internalNotes : []), note].filter(Boolean); }
async function readItems(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    const json = (record as any)?.metadataJson || {};
    if (Array.isArray(json.items)) return json.items as Store[];
    if (Array.isArray(json.store?.items)) return json.store.items as Store[];
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}
async function writeItems(request: Request, key: string, title: string, items: Store[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, { id: key, slug: key, name: title, title, description: title, metadataJson: { items, savedAt: nowIso(), storageKey: key, source: 'customer-design-brief' } } as any);
}
function matchTicket(ticket: Store, order: Store) {
  const keys = [order.id, order.orderNumber].filter(Boolean).map(String);
  return keys.some((key) => [ticket.orderId, ticket.orderNumber, ticket.id].filter(Boolean).map(String).includes(key));
}
async function syncTicket(request: Request, order: Store, brief: Store) {
  const tickets = await readItems(request, TICKETS_KEY).catch(() => []);
  let changed = false;
  const next = tickets.map((ticket) => {
    if (!matchTicket(ticket, order)) return ticket;
    changed = true;
    return {
      ...ticket,
      designBriefStatus: 'submitted',
      designBriefId: brief.id,
      designBriefSubmittedAt: brief.submittedAt,
      designQuoteStatus: ticket.designQuoteStatus || 'needs-review',
      artworkStatus: ticket.artworkStatus === 'design-required' ? 'design-brief-submitted' : ticket.artworkStatus,
      customerProofStatus: ticket.customerProofStatus || 'pending-review',
      handoffState: 'blocked',
      status: ticket.status || 'artwork-check',
      blockReason: 'Design brief received. Staff must review requirements and confirm any extra design charge before design starts.',
      productionNotes: [ticket.productionNotes, `Design brief submitted: ${brief.id}.`, brief.summary].filter(Boolean).join(' '),
      updatedAt: nowIso(),
    };
  });
  if (changed) await writeItems(request, TICKETS_KEY, 'Production Job Tickets', next);
  return { updated: changed };
}
function briefFromForm(form: FormData, order: Store) {
  const id = `design-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const designType = text(form.get('designType'));
  const designGoal = text(form.get('designGoal'));
  const suppliedText = text(form.get('suppliedText'));
  const brandColours = text(form.get('brandColours'));
  const logoStatus = text(form.get('logoStatus'));
  const inspiration = text(form.get('inspiration'));
  const mustInclude = text(form.get('mustInclude'));
  const avoid = text(form.get('avoid'));
  const deadline = text(form.get('deadline'));
  const budgetExpectation = text(form.get('budgetExpectation'));
  const summary = [designType, designGoal, suppliedText ? `Text supplied: ${suppliedText.slice(0, 160)}` : '', brandColours ? `Colours: ${brandColours}` : '', logoStatus ? `Logo: ${logoStatus}` : '', budgetExpectation ? `Budget expectation: ${budgetExpectation}` : ''].filter(Boolean).join(' | ');
  return {
    id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName || order.customer?.name || '',
    customerEmail: order.customerEmail || order.customer?.email || '',
    productName: order.items?.[0]?.productName || order.items?.[0]?.titleSnapshot || '',
    designType,
    designGoal,
    suppliedText,
    brandColours,
    logoStatus,
    inspiration,
    mustInclude,
    avoid,
    deadline,
    budgetExpectation,
    summary,
    status: 'submitted',
    designQuoteStatus: 'needs-review',
    source: 'customer-design-brief-page',
    submittedAt: nowIso(),
  };
}

export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: corsHeaders() }); }

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = text(url.searchParams.get('orderId') || url.searchParams.get('orderNumber'));
    const email = text(url.searchParams.get('email')).toLowerCase();
    if (!orderId) return json({ ok: false, error: 'orderId is required.' }, { status: 400 });
    if (!email) return json({ ok: false, error: 'Customer email is required to view design brief status.' }, { status: 400 });
    const order = await getOrder(request, orderId);
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    const orderEmail = text((order as Store).customerEmail || (order as Store).customer?.email).toLowerCase();
    if (!orderEmail || email !== orderEmail) return json({ ok: false, error: 'Order email does not match.' }, { status: 403 });
    const briefs = await readItems(request, DESIGN_BRIEFS_KEY).catch(() => []);
    const orderBriefs = briefs.filter((brief) => String(brief.orderId) === String((order as Store).id) || String(brief.orderNumber) === String((order as Store).orderNumber));
    return json({ ok: true, source: 'customer-design-brief', order: { id: (order as Store).id, orderNumber: (order as Store).orderNumber, customerName: (order as Store).customerName, customerEmail: (order as Store).customerEmail, paymentStatus: (order as Store).paymentStatus }, briefs: orderBriefs });
  } catch (error) {
    return json({ ok: false, source: 'customer-design-brief', error: error instanceof Error ? error.message : 'Design brief lookup failed.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const orderId = text(form.get('orderId') || form.get('orderNumber'));
    const email = text(form.get('email')).toLowerCase();
    if (!orderId) return json({ ok: false, error: 'orderId is required.' }, { status: 400 });
    if (!email) return json({ ok: false, error: 'Customer email is required to submit a design brief.' }, { status: 400 });
    const order = await getOrder(request, orderId);
    if (!order) return json({ ok: false, error: 'Order was not found.' }, { status: 404 });
    const orderRecord = order as Store;
    const orderEmail = text(orderRecord.customerEmail || orderRecord.customer?.email).toLowerCase();
    if (!orderEmail || email !== orderEmail) return json({ ok: false, error: 'Order email does not match.' }, { status: 403 });
    const designGoal = text(form.get('designGoal'));
    if (!designGoal) return json({ ok: false, error: 'Please explain what design you need.' }, { status: 400 });
    const brief = briefFromForm(form, orderRecord);
    const briefs = await readItems(request, DESIGN_BRIEFS_KEY).catch(() => []);
    const next = [brief, ...briefs.filter((item) => String(item.id) !== brief.id)].slice(0, 500);
    await writeItems(request, DESIGN_BRIEFS_KEY, 'Customer Design Briefs', next);
    const ticketSync = await syncTicket(request, orderRecord, brief).catch((error) => ({ updated: false, error: error instanceof Error ? error.message : 'Ticket sync failed.' }));
    await updateOrder(request, orderRecord.id, { internalNotes: noteList(orderRecord, `Customer design brief submitted: ${brief.id}. Staff must review and quote any extra design charge.`) }).catch(() => null);
    return json({ ok: true, source: 'customer-design-brief', brief, ticketSync, message: 'Design brief received. Our team will review it and confirm any extra design charge before design starts.' });
  } catch (error) {
    return json({ ok: false, source: 'customer-design-brief', error: error instanceof Error ? error.message : 'Design brief submission failed.' }, { status: 500 });
  }
}
