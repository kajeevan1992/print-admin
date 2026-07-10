import { NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
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
function nowIso() { return new Date().toISOString(); }
function text(value: unknown) { return String(value || '').trim(); }
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
      handoffState: ticket.handoffState,
      paymentStatus: ticket.paymentStatus,
      designQuoteStatus: ticket.designQuoteStatus || brief.designQuoteStatus || 'needs-review',
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
    readyForDesign: items.filter((item) => ['no-extra-charge', 'approved-to-design', 'design-in-progress'].includes(text(item.designQuoteStatus))).length,
  };
}
function allowedQuoteStatus(value: string) {
  return ['needs-review', 'quote-required', 'quote-sent', 'no-extra-charge', 'approved-to-design', 'design-in-progress', 'waiting-customer', 'closed'].includes(value);
}
function ticketPatchFor(status: string, note: string) {
  if (status === 'quote-required') return { designQuoteStatus: status, handoffState: 'blocked', status: 'artwork-check', blockReason: 'Design quote is required before design work starts.' };
  if (status === 'quote-sent') return { designQuoteStatus: status, handoffState: 'blocked', status: 'artwork-check', blockReason: 'Design quote sent. Waiting for customer approval/payment before design starts.' };
  if (status === 'no-extra-charge' || status === 'approved-to-design') return { designQuoteStatus: status, handoffState: 'blocked', status: 'design-ready', artworkStatus: 'design-ready', blockReason: 'Design brief reviewed. Design can start; print production remains blocked until design proof is approved.' };
  if (status === 'design-in-progress') return { designQuoteStatus: status, handoffState: 'blocked', status: 'design-in-progress', artworkStatus: 'design-in-progress', blockReason: 'Design is in progress. Print production remains blocked until design proof is approved.' };
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
    const quoteAmountMinor = Number(body.quoteAmountMinor || 0);
    if (!id) return json({ ok: false, error: 'brief id is required.' }, { status: 400 });
    if (!allowedQuoteStatus(designQuoteStatus)) return json({ ok: false, error: `Unsupported design quote status: ${designQuoteStatus}` }, { status: 400 });
    const briefs = await readItems(request, DESIGN_BRIEFS_KEY);
    const current = briefs.find((brief) => String(brief.id) === id);
    if (!current) return json({ ok: false, error: 'Design brief was not found.' }, { status: 404 });
    const at = nowIso();
    const updatedBrief = {
      ...current,
      designQuoteStatus,
      status: current.status || 'submitted',
      quoteAmountMinor: Number.isFinite(quoteAmountMinor) && quoteAmountMinor > 0 ? Math.round(quoteAmountMinor) : current.quoteAmountMinor || 0,
      staffNote: staffNote || current.staffNote || '',
      reviewedAt: at,
      reviewedBy: body.actor || 'staff',
      history: [{ at, action: `design-brief-${designQuoteStatus}`, note: staffNote, quoteAmountMinor: Number.isFinite(quoteAmountMinor) ? quoteAmountMinor : 0 }, ...(Array.isArray(current.history) ? current.history : [])].slice(0, 80),
      updatedAt: at,
    };
    const nextBriefs = briefs.map((brief) => String(brief.id) === id ? updatedBrief : brief);
    await writeItems(request, DESIGN_BRIEFS_KEY, 'Customer Design Briefs', nextBriefs);

    const tickets = await readItems(request, TICKETS_KEY).catch(() => []);
    let ticketUpdated = false;
    const patch = ticketPatchFor(designQuoteStatus, staffNote);
    const nextTickets = tickets.map((ticket) => {
      if (!matchTicket(ticket, updatedBrief)) return ticket;
      ticketUpdated = true;
      return { ...ticket, ...patch, designBriefId: updatedBrief.id, designBriefStatus: 'submitted', designStaffNote: staffNote || ticket.designStaffNote || '', designQuoteAmountMinor: updatedBrief.quoteAmountMinor || ticket.designQuoteAmountMinor || 0, productionNotes: [ticket.productionNotes, staffNote ? `Design staff note: ${staffNote}` : '', `Design quote status: ${designQuoteStatus}.`].filter(Boolean).join(' '), updatedAt: at };
    });
    if (ticketUpdated) await writeItems(request, TICKETS_KEY, 'Production Job Tickets', nextTickets);
    return json({ ok: true, source: 'internal-design-brief-review', brief: updatedBrief, ticketUpdated, message: 'Design brief review state updated.' });
  } catch (error) {
    return json({ ok: false, source: 'internal-design-brief-review', error: error instanceof Error ? error.message : 'Design brief review update failed.' }, { status: 500 });
  }
}
