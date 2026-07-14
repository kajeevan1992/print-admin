import { NextResponse } from 'next/server';
import { getInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { listInternalEmails } from '@/core/email/internal-email.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

const CONFIG_RESOURCE = 'admin-config' as any;
const DESIGN_BRIEFS_KEY = 'customer-design-briefs-v1';
const TICKETS_KEY = 'production-job-tickets';
const REQUIRED_PROOF_EMAIL_TYPES = ['customer-design-quote-payment-link', 'customer-proof-review-ready', 'admin-proof-decision'];
const RELEASED_PAYMENT_STATES = ['paid', 'captured', 'authorized', 'manual-paid'];

type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
type Store = Record<string, any>;

type Check = {
  id: string;
  group: string;
  label: string;
  status: CheckStatus;
  detail: string;
  action?: string;
  href?: string;
  data?: Record<string, any>;
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Id, X-Site-Id, X-Database-Connection-Id',
  };
}

function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { ...corsHeaders(), ...(init?.headers || {}) } });
}

function clean(value: unknown) {
  return String(value || '').trim();
}

function normal(value: unknown) {
  return clean(value).toLowerCase().replace(/_/g, '-');
}

function check(status: CheckStatus, id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string): Check {
  return { id, group, label, status, detail, action, data, href };
}

function pass(id: string, group: string, label: string, detail: string, data?: Record<string, any>, href?: string) {
  return check('pass', id, group, label, detail, undefined, data, href);
}

function warn(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string) {
  return check('warn', id, group, label, detail, action, data, href);
}

function fail(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string) {
  return check('fail', id, group, label, detail, action, data, href);
}

function skip(id: string, group: string, label: string, detail: string, action?: string, data?: Record<string, any>, href?: string) {
  return check('skip', id, group, label, detail, action, data, href);
}

function safeMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Check failed.';
}

function readItemsFromRecord(record: any) {
  const metadata = record?.metadataJson || {};
  if (Array.isArray(metadata.items)) return metadata.items as Store[];
  if (Array.isArray(metadata.store?.items)) return metadata.store.items as Store[];
  return [];
}

async function readItems(request: Request, key: string) {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, key);
    return readItemsFromRecord(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

function proofEvents(item: Store | null | undefined) {
  return Array.isArray(item?.proofEvents) ? item?.proofEvents as Store[] : [];
}

function isDesignTicket(ticket: Store) {
  return Boolean(
    ticket.designBriefId ||
    ticket.designProofUrl ||
    normal(ticket.artworkStatus).includes('design') ||
    normal(ticket.status).includes('design') ||
    normal(ticket.designQuoteStatus).includes('design') ||
    ['proof-sent', 'revision-requested', 'revision-in-progress', 'approved-to-design'].includes(normal(ticket.designQuoteStatus)),
  );
}

function isPaymentReleased(value: unknown) {
  return RELEASED_PAYMENT_STATES.includes(normal(value));
}

function matchTicketToBrief(ticket: Store, brief: Store) {
  const briefKeys = [brief.id, brief.designBriefId, brief.orderId, brief.orderNumber, brief.productionTicketId].filter(Boolean).map(String);
  const ticketKeys = [ticket.designBriefId, ticket.id, ticket.orderId, ticket.orderNumber, ticket.productionTicketId].filter(Boolean).map(String);
  return briefKeys.some((key) => ticketKeys.includes(key));
}

function summarizeProofTicket(ticket: Store) {
  return {
    id: ticket.id,
    orderNumber: ticket.orderNumber,
    status: ticket.status,
    artworkStatus: ticket.artworkStatus,
    customerProofStatus: ticket.customerProofStatus,
    designQuoteStatus: ticket.designQuoteStatus,
    proofVersion: ticket.proofVersion || 0,
    hasProofToken: Boolean(ticket.proofToken),
    hasProofUrl: Boolean(ticket.designProofUrl || ticket.proofUrl),
    proofEvents: proofEvents(ticket).length,
    paymentStatus: ticket.paymentStatus || ticket.paymentGate || '',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(request: Request) {
  const checks: Check[] = [];
  try {
    checks.push(pass('design-brief-customer-api', 'Design proofing', 'Customer design brief API', 'Customer design brief endpoint is available for design-help checkout follow-up.', undefined, '/api/native-storefront/design-brief'));
    checks.push(pass('design-brief-staff-api', 'Design proofing', 'Staff design brief API', 'Staff design brief review endpoint is available for design quote/proof workflow.', undefined, '/api/internal/design-briefs'));
    checks.push(pass('proof-action-api', 'Design proofing', 'Customer proof action API', 'Customer proof approval/revision endpoint is available.', undefined, '/api/native-storefront/proof-action'));
    checks.push(pass('order-status-api', 'Design proofing', 'Customer order status API', 'Track Order status endpoint is available for proof history and next actions.', undefined, '/api/native-storefront/order-status'));

    const [briefs, tickets, emails] = await Promise.all([
      readItems(request, DESIGN_BRIEFS_KEY),
      readItems(request, TICKETS_KEY),
      listInternalEmails(request).catch(() => []),
    ]);

    const designTickets = tickets.filter(isDesignTicket);
    const briefsWithTicket = briefs.filter((brief) => designTickets.some((ticket) => matchTicketToBrief(ticket, brief)));
    const pendingProofs = designTickets.filter((ticket) => normal(ticket.customerProofStatus) === 'pending-customer-approval');
    const pendingWithoutSecureLink = pendingProofs.filter((ticket) => !ticket.proofToken || !Number(ticket.proofVersion || 0));
    const pendingWithoutProofFile = pendingProofs.filter((ticket) => !clean(ticket.designProofUrl || ticket.proofUrl));
    const revisionTickets = designTickets.filter((ticket) => ['revision-requested', 'design-revision-requested'].includes(normal(ticket.customerProofStatus || ticket.artworkStatus || ticket.designQuoteStatus)));
    const proofEventCount = designTickets.reduce((total, ticket) => total + proofEvents(ticket).length, 0) + briefs.reduce((total, brief) => total + proofEvents(brief).length, 0);
    const quotePaymentHolds = [...briefs, ...designTickets].filter((item) => item.designQuotePaymentUrl && !isPaymentReleased(item.designQuotePaymentStatus));
    const approvedPaymentHolds = designTickets.filter((ticket) => normal(ticket.customerProofStatus) === 'approved' && !isPaymentReleased(ticket.paymentStatus || ticket.paymentGate));
    const proofEmailCounts = Object.fromEntries(REQUIRED_PROOF_EMAIL_TYPES.map((type) => [type, emails.filter((email: Store) => email.type === type).length]));
    const proofEmailIssues = emails.filter((email: Store) => REQUIRED_PROOF_EMAIL_TYPES.includes(email.type) && ['failed', 'needs-email-address', 'smtp-not-configured'].includes(email.status));

    if (briefs.length) checks.push(pass('design-brief-storage', 'Design proofing', 'Design brief storage', `${briefs.length} customer design brief record(s) loaded.`, { total: briefs.length, linkedToTicket: briefsWithTicket.length }, '/design-briefs'));
    else checks.push(skip('design-brief-storage', 'Design proofing', 'Design brief storage', 'No design-help brief records found yet. This is okay before a test design-help order.', 'Run one test order using “Design help” before final launch.', { total: 0 }, '/design-briefs'));

    if (designTickets.length) checks.push(pass('design-ticket-storage', 'Design proofing', 'Design production tickets', `${designTickets.length} design/proof production ticket(s) found.`, { sample: designTickets.slice(0, 6).map(summarizeProofTicket) }, '/artwork-uploads'));
    else checks.push(skip('design-ticket-storage', 'Design proofing', 'Design production tickets', 'No design/proof production tickets found yet.', 'Place a design-help test order and confirm a production ticket appears.', { total: 0 }, '/artwork-uploads'));

    if (briefs.length && briefsWithTicket.length < briefs.length) checks.push(warn('design-brief-ticket-linkage', 'Design proofing', 'Brief-ticket linkage', `${briefs.length - briefsWithTicket.length} design brief(s) do not appear linked to a production ticket.`, 'Open Design Briefs and confirm each customer brief links to a production ticket before launch.', { totalBriefs: briefs.length, linkedToTicket: briefsWithTicket.length }, '/design-briefs'));
    else if (briefs.length) checks.push(pass('design-brief-ticket-linkage', 'Design proofing', 'Brief-ticket linkage', 'All stored design briefs appear linked to production tickets.', { totalBriefs: briefs.length, linkedToTicket: briefsWithTicket.length }, '/design-briefs'));

    if (pendingWithoutSecureLink.length) checks.push(fail('pending-proof-secure-links', 'Design proofing', 'Pending proof secure links', `${pendingWithoutSecureLink.length} pending proof(s) are missing proof token/version.`, 'Resend or send a new proof version so every pending proof has a secure token and version.', { sample: pendingWithoutSecureLink.slice(0, 6).map(summarizeProofTicket) }, '/design-briefs'));
    else if (pendingProofs.length) checks.push(pass('pending-proof-secure-links', 'Design proofing', 'Pending proof secure links', `${pendingProofs.length} pending proof(s) have secure token/version data.`, { pendingProofs: pendingProofs.length }, '/design-briefs'));
    else checks.push(skip('pending-proof-secure-links', 'Design proofing', 'Pending proof secure links', 'No pending customer proof approvals currently exist.', 'Send a test proof and confirm it appears here before launch.', undefined, '/design-briefs'));

    if (pendingWithoutProofFile.length) checks.push(fail('pending-proof-files', 'Design proofing', 'Pending proof files', `${pendingWithoutProofFile.length} pending proof(s) are missing a proof file URL.`, 'Add the proof file URL before asking the customer to approve.', { sample: pendingWithoutProofFile.slice(0, 6).map(summarizeProofTicket) }, '/design-briefs'));
    else if (pendingProofs.length) checks.push(pass('pending-proof-files', 'Design proofing', 'Pending proof files', 'Every pending proof has a proof file/preview URL.', { pendingProofs: pendingProofs.length }, '/design-briefs'));

    if (proofEventCount) checks.push(pass('proof-event-audit', 'Design proofing', 'Proof event audit trail', `${proofEventCount} proof event(s) recorded across design briefs/tickets.`, { proofEventCount }, '/design-briefs'));
    else checks.push(skip('proof-event-audit', 'Design proofing', 'Proof event audit trail', 'No proof event history found yet.', 'Send, resend and respond to one test proof before final launch.', { proofEventCount: 0 }, '/design-briefs'));

    if (revisionTickets.length) checks.push(warn('design-revisions-open', 'Design proofing', 'Open design revisions', `${revisionTickets.length} design proof revision(s) are open.`, 'Finish or resend revised proofs before launch if these are real customer jobs.', { sample: revisionTickets.slice(0, 6).map(summarizeProofTicket) }, '/design-briefs'));
    else checks.push(pass('design-revisions-open', 'Design proofing', 'Open design revisions', 'No open design proof revisions are currently blocking launch.', undefined, '/design-briefs'));

    if (quotePaymentHolds.length) checks.push(warn('design-quote-payment-holds', 'Design proofing', 'Design quote payment holds', `${quotePaymentHolds.length} design quote payment(s) are still pending.`, 'For test data this is fine; for real jobs, collect payment or close the quote before launch.', { count: quotePaymentHolds.length }, '/design-briefs'));
    else checks.push(pass('design-quote-payment-holds', 'Design proofing', 'Design quote payment holds', 'No unpaid extra design quote links are currently open.', undefined, '/design-briefs'));

    if (approvedPaymentHolds.length) checks.push(warn('approved-proof-payment-holds', 'Design proofing', 'Approved proof payment holds', `${approvedPaymentHolds.length} approved proof(s) are still held by print payment.`, 'Collect print payment before production release.', { sample: approvedPaymentHolds.slice(0, 6).map(summarizeProofTicket) }, '/orders'));
    else checks.push(pass('approved-proof-payment-holds', 'Design proofing', 'Approved proof payment holds', 'No approved proofs are waiting on print payment release.', undefined, '/orders'));

    if (proofEmailIssues.length) checks.push(warn('proof-email-queue-health', 'Design proofing', 'Proof email queue health', `${proofEmailIssues.length} proof/design email issue(s) need review.`, 'Open Email Send Controls and fix failed/missing-recipient proof emails before launch.', { issues: proofEmailIssues.slice(0, 8), counts: proofEmailCounts }, '/email-send-controls'));
    else checks.push(pass('proof-email-queue-health', 'Design proofing', 'Proof email queue health', 'No failed proof/design emails are currently blocking launch.', { counts: proofEmailCounts }, '/email-send-controls'));

    checks.push(pass('proof-email-template-types', 'Design proofing', 'Proof email template types', 'Design quote payment, customer proof review and admin proof decision email types are tracked for launch readiness.', { requiredTypes: REQUIRED_PROOF_EMAIL_TYPES, counts: proofEmailCounts }, '/api/internal/email/status'));

    const summary = {
      total: checks.length,
      pass: checks.filter((item) => item.status === 'pass').length,
      warn: checks.filter((item) => item.status === 'warn').length,
      fail: checks.filter((item) => item.status === 'fail').length,
      skip: checks.filter((item) => item.status === 'skip').length,
    };
    const score = Math.max(0, Math.round(((summary.pass + summary.skip * 0.5) / Math.max(1, summary.total)) * 100 - summary.fail * 10 - summary.warn * 3));
    const launchStatus = summary.fail ? 'blocked' : summary.warn ? 'review' : 'ready';

    return json({
      ok: summary.fail === 0,
      source: 'design-proof-launch-readiness',
      launchStatus,
      score,
      summary,
      checks,
      nextActions: checks.filter((item) => item.status === 'fail' || item.status === 'warn').map((item) => ({ id: item.id, label: item.label, status: item.status, action: item.action, href: item.href })).slice(0, 10),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json({ ok: false, source: 'design-proof-launch-readiness', error: safeMessage(error) }, { status: 500 });
  }
}
