import { NextResponse } from 'next/server';
import { listOrders } from '@/core/orders/orders.service';
import { listProductionJobTickets } from '@/core/production/internal-production-jobs';
import { listInternalEmails } from '@/core/email/internal-email.service';

export const dynamic = 'force-dynamic';

type MonitorStatus = 'ok' | 'watch' | 'blocked' | 'test-only';

type Risk = {
  id: string;
  level: 'info' | 'watch' | 'blocked';
  label: string;
  detail: string;
  href?: string;
};

function clean(value: unknown) {
  return String(value || '').trim();
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function isTestOrder(order: any) {
  const text = JSON.stringify(order || {}).toLowerCase();
  return String(order?.orderNumber || '').startsWith('TEST-HOLO-') || text.includes('build 67 test data') || text.includes('build_67_safe_test_order');
}

function paymentReleased(value: unknown) {
  return ['paid', 'captured', 'authorized', 'manual-paid', 'test-only'].includes(lower(value));
}

function hasArtworkSignal(order: any, ticket?: any) {
  const orderText = JSON.stringify(order || {}).toLowerCase();
  const ticketText = JSON.stringify(ticket || {}).toLowerCase();
  return Boolean(
    order?.artworkUploadIds?.length ||
    ticket?.artworkUploadId ||
    ticket?.artworkStatus ||
    ticket?.preflightStatus ||
    orderText.includes('send-later') ||
    orderText.includes('need-design') ||
    ticketText.includes('design-required')
  );
}

function ticketFor(order: any, tickets: any[]) {
  const orderId = clean(order?.id);
  const orderNumber = clean(order?.orderNumber);
  return tickets.find((ticket) => clean(ticket.orderId) === orderId || clean(ticket.orderNumber) === orderNumber) || null;
}

function emailsFor(order: any, emails: any[]) {
  const orderId = clean(order?.id);
  const orderNumber = clean(order?.orderNumber);
  const customerEmail = lower(order?.customerEmail);
  return emails.filter((email) => {
    const haystack = `${email.orderId || ''} ${email.quoteId || ''} ${email.subject || ''} ${email.body || ''}`.toLowerCase();
    return (orderId && haystack.includes(orderId.toLowerCase())) || (orderNumber && haystack.includes(orderNumber.toLowerCase())) || (customerEmail && lower(email.to) === customerEmail);
  });
}

function classify(order: any, ticket: any, emails: any[]) {
  const risks: Risk[] = [];
  const paymentOk = paymentReleased(order?.paymentStatus || order?.payment?.paymentStatus || ticket?.paymentStatus);
  const hasTicket = Boolean(ticket);
  const hasEmail = emails.length > 0;
  const failedEmail = emails.find((email) => ['failed', 'smtp-not-configured', 'needs-email-address'].includes(lower(email.status)));
  const artworkSeen = hasArtworkSignal(order, ticket);
  const dispatchBlocked = ticket && ticket.canDispatch === false;
  const scheduleBlocked = ticket && ticket.canSchedule === false;

  if (!paymentOk) risks.push({ id: 'payment-not-cleared', level: 'blocked', label: 'Payment not released', detail: 'This order is not paid/captured/authorized yet. Production should stay blocked.', href: `/orders/${order.id}` });
  if (!artworkSeen) risks.push({ id: 'artwork-not-seen', level: 'watch', label: 'Artwork/design signal missing', detail: 'No artwork upload, upload-later marker, or design-help state was found yet.', href: `/orders/${order.id}` });
  if (!hasTicket) risks.push({ id: 'production-ticket-missing', level: 'watch', label: 'Production ticket missing', detail: 'No production ticket is linked to this order yet. This may be normal before artwork/proof approval.', href: '/production-planner' });
  if (scheduleBlocked) risks.push({ id: 'schedule-blocked', level: 'blocked', label: 'Production scheduling blocked', detail: ticket?.releaseLabel || ticket?.blockReason || 'Ticket cannot be scheduled yet.', href: '/production-planner' });
  if (dispatchBlocked) risks.push({ id: 'dispatch-blocked', level: 'blocked', label: 'Dispatch blocked', detail: ticket?.releaseLabel || ticket?.blockReason || 'Ticket cannot dispatch until payment/proof gates are clear.', href: '/dispatch-center' });
  if (!hasEmail) risks.push({ id: 'email-not-found', level: 'watch', label: 'No customer/admin email found', detail: 'No matching email outbox record was found for this order yet.', href: '/email-outbox' });
  if (failedEmail) risks.push({ id: 'email-failed', level: 'blocked', label: 'Email delivery problem', detail: `${failedEmail.type || 'Email'} is ${failedEmail.status}: ${failedEmail.lastError || 'No error message.'}`, href: '/email-outbox' });

  const blocked = risks.some((risk) => risk.level === 'blocked');
  const watch = risks.some((risk) => risk.level === 'watch');
  return {
    status: (isTestOrder(order) ? 'test-only' : blocked ? 'blocked' : watch ? 'watch' : 'ok') as MonitorStatus,
    risks,
  };
}

function stage(order: any, ticket: any) {
  if (!order) return 'No order';
  if (!paymentReleased(order?.paymentStatus || order?.payment?.paymentStatus || ticket?.paymentStatus)) return 'Payment gate';
  if (!ticket) return 'Awaiting artwork/proof ticket';
  if (['blocked', 'payment-hold', 'blocked-proof-or-payment'].includes(lower(ticket.status))) return 'Blocked';
  if (['ready-to-print', 'queued'].includes(lower(ticket.status))) return 'Ready for production';
  if (['printing', 'finishing', 'packing'].includes(lower(ticket.status))) return 'In production';
  if (lower(ticket.status) === 'dispatched') return 'Dispatched';
  return ticket.status || order.status || 'Active';
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.max(1, Math.min(25, Number(url.searchParams.get('limit') || 10)));
    const includeTests = url.searchParams.get('includeTests') === 'true';
    const [orders, tickets, emails] = await Promise.all([
      listOrders(request, { limit: 50 }),
      listProductionJobTickets(request),
      listInternalEmails(request),
    ]);

    const liveOrders = orders.filter((order: any) => includeTests || !isTestOrder(order)).slice(0, limit);
    const items = liveOrders.map((order: any) => {
      const ticket = ticketFor(order, tickets as any[]);
      const matchedEmails = emailsFor(order, emails as any[]);
      const classification = classify(order, ticket, matchedEmails);
      return {
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus || order.payment?.paymentStatus || '',
          total: order.total,
          currency: order.currency || 'GBP',
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          shippingMethod: order.shippingMethod || '',
          artworkUploadIds: order.artworkUploadIds || [],
        },
        ticket: ticket ? {
          id: ticket.id,
          status: ticket.status,
          handoffState: ticket.handoffState || '',
          artworkStatus: ticket.artworkStatus || '',
          preflightStatus: ticket.preflightStatus || '',
          customerProofStatus: ticket.customerProofStatus || '',
          paymentGate: ticket.paymentGate || '',
          releaseGate: ticket.releaseGate || '',
          releaseLabel: ticket.releaseLabel || '',
          canSchedule: Boolean(ticket.canSchedule),
          canDispatch: Boolean(ticket.canDispatch),
          dueDate: ticket.dueDate || '',
          updatedAt: ticket.updatedAt || '',
        } : null,
        emails: matchedEmails.slice(0, 6).map((email: any) => ({ id: email.id, type: email.type, status: email.status, to: email.to, subject: email.subject, createdAt: email.createdAt, sentAt: email.sentAt, lastError: email.lastError || '' })),
        stage: stage(order, ticket),
        status: classification.status,
        risks: classification.risks,
        links: {
          order: `/orders/${order.id}`,
          track: `/track-order?orderId=${encodeURIComponent(order.orderNumber || order.id)}&email=${encodeURIComponent(order.customerEmail || '')}`,
          production: '/production-planner',
          dispatch: '/dispatch-center',
          emailOutbox: '/email-outbox',
        },
      };
    });

    const summary = {
      total: items.length,
      ok: items.filter((item) => item.status === 'ok').length,
      watch: items.filter((item) => item.status === 'watch').length,
      blocked: items.filter((item) => item.status === 'blocked').length,
      testOnly: items.filter((item) => item.status === 'test-only').length,
      sourceOrders: orders.length,
      productionTickets: (tickets as any[]).length,
      emails: (emails as any[]).length,
    };

    return NextResponse.json({
      ok: true,
      source: 'first-live-order-monitor',
      mode: 'read-only',
      includeTests,
      limit,
      summary,
      launchStatus: summary.blocked ? 'blocked' : summary.watch ? 'watch' : summary.total ? 'healthy' : 'waiting-for-first-order',
      items,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'first-live-order-monitor', error: error instanceof Error ? error.message : 'First live order monitor failed.' }, { status: 500 });
  }
}
