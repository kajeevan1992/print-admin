import { queueInternalEmail } from './internal-email.service';

export type OrderEmailType = 'customer-order-confirmation' | 'admin-new-order' | 'customer-payment-received' | 'customer-payment-link' | 'customer-design-quote-payment-link' | 'customer-proof-review-ready';

type EmailOrder = Record<string, any> & {
  id?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  currency?: string;
  total?: number;
  totalMinor?: number;
  status?: string;
  paymentStatus?: string;
  items?: Array<Record<string, any>>;
};

type QueueOptions = {
  paymentUrl?: string;
  proofUrl?: string;
  reviewUrl?: string;
  note?: string;
  actor?: string;
};

function money(order: EmailOrder) {
  const currency = order.currency || 'GBP';
  const total = typeof order.total === 'number' ? order.total : typeof order.totalMinor === 'number' ? order.totalMinor / 100 : 0;
  return `${currency} ${total.toFixed(2)}`;
}

function adminEmail() {
  return process.env.HOLO_PRINT_ADMIN_EMAIL || process.env.ORDER_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'sales@holoprint.co.uk';
}

function customerEmail(order: EmailOrder) {
  return String(order.customerEmail || order.customer?.email || '').trim();
}

function orderNumber(order: EmailOrder) {
  return String(order.orderNumber || order.id || 'New order');
}

function itemLines(order: EmailOrder) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return 'Items are saved against your order and will be checked by our team.';
  return items.map((item) => {
    const name = item.productName || item.titleSnapshot || item.name || 'Print item';
    const qty = item.quantity || item.qty || 1;
    return `- ${name} x ${qty}`;
  }).join('\n');
}

function subjectFor(type: OrderEmailType, order: EmailOrder) {
  const num = orderNumber(order);
  if (type === 'admin-new-order') return `New Holo Print order: ${num}`;
  if (type === 'customer-payment-received') return `Payment received for ${num}`;
  if (type === 'customer-payment-link') return `Payment link for ${num}`;
  if (type === 'customer-design-quote-payment-link') return `Design quote payment link for ${num}`;
  if (type === 'customer-proof-review-ready') return `Proof ready to review for ${num}`;
  return `Holo Print order received: ${num}`;
}

function bodyFor(type: OrderEmailType, order: EmailOrder, options: QueueOptions = {}) {
  const num = orderNumber(order);
  const name = order.customerName || order.customer?.name || 'Customer';
  const total = money(order);
  const lines = itemLines(order);

  if (type === 'admin-new-order') {
    return `New Holo Print order received.\n\nOrder: ${num}\nCustomer: ${name}\nEmail: ${customerEmail(order) || 'not provided'}\nCompany: ${order.customerCompany || order.customer?.company || 'not provided'}\nStatus: ${order.status || 'pending'}\nPayment: ${order.paymentStatus || 'unpaid'}\nTotal: ${total}\n\nItems:\n${lines}\n\nNext step: open the admin order detail page to check artwork, quote/payment state and production readiness.`;
  }

  if (type === 'customer-payment-received') {
    return `Hi ${name},\n\nThank you — we have received your payment for order ${num}.\n\nTotal: ${total}\n\nYour order will now move into artwork check and production. If we need anything else, our team will contact you.\n\nKind regards,\nHolo Print`;
  }

  if (type === 'customer-payment-link') {
    return `Hi ${name},\n\nYour Holo Print quote/order ${num} has been approved and is ready for payment.\n\nTotal: ${total}\n\nPay securely here:\n${options.paymentUrl || 'Payment link will be sent shortly.'}\n\nOnce payment is complete, we will move your job into artwork check and production.\n\nKind regards,\nHolo Print`;
  }

  if (type === 'customer-design-quote-payment-link') {
    return `Hi ${name},\n\nOur design team has reviewed your design brief for order ${num}.\n\nExtra design charge: ${total}\n\nPlease pay the design quote securely here:\n${options.paymentUrl || 'Payment link will be sent shortly.'}\n\nOnce this design payment is complete, our team can start the design work. Print production will still remain on hold until the final design/proof is approved.\n\n${options.note ? `Note from our team:\n${options.note}\n\n` : ''}Kind regards,\nHolo Print`;
  }

  if (type === 'customer-proof-review-ready') {
    return `Hi ${name},\n\nYour proof for order ${num} is ready to review.\n\nReview and approve/request changes here:\n${options.reviewUrl || 'Proof review link will be sent shortly.'}\n\n${options.proofUrl ? `Open the proof preview here:\n${options.proofUrl}\n\n` : ''}Please check the proof carefully before approving. Production will only be released after proof approval and payment gates are clear.\n\n${options.note ? `Note from our team:\n${options.note}\n\n` : ''}Kind regards,\nHolo Print`;
  }

  return `Hi ${name},\n\nThank you — we have received your Holo Print order ${num}.\n\nStatus: ${order.status || 'pending'}\nPayment: ${order.paymentStatus || 'unpaid'}\nTotal: ${total}\n\nItems:\n${lines}\n\nIf this order needs manual approval or a quote, we will confirm the final details and send a payment link.\n\nKind regards,\nHolo Print`;
}

function htmlFromText(text: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
}

async function createOutboxEmail(request: Request, type: OrderEmailType, to: string, order: EmailOrder, options: QueueOptions = {}) {
  if (!to) return { ok: false, skipped: true, reason: 'Missing recipient email.' };
  const subject = subjectFor(type, order);
  const body = bodyFor(type, order, options);
  const email = await queueInternalEmail({
    type,
    to,
    subject,
    body,
    html: htmlFromText(body),
    orderId: order.id || order.orderNumber || undefined,
    quoteId: order.quoteReference || undefined,
  }, request);
  return { ok: true, email };
}

export async function queueOrderCustomerEmail(request: Request, type: Exclude<OrderEmailType, 'admin-new-order'>, order: EmailOrder, options: QueueOptions = {}) {
  return createOutboxEmail(request, type, customerEmail(order), order, options);
}

export async function queueAdminNewOrderEmail(request: Request, order: EmailOrder, options: QueueOptions = {}) {
  return createOutboxEmail(request, 'admin-new-order', adminEmail(), order, options);
}

export async function queueOrderPlacedEmails(request: Request, order: EmailOrder) {
  const results = await Promise.allSettled([
    queueOrderCustomerEmail(request, 'customer-order-confirmation', order),
    queueAdminNewOrderEmail(request, order),
  ]);
  return results.map((result) => result.status === 'fulfilled' ? result.value : { ok: false, error: result.reason instanceof Error ? result.reason.message : 'Email queue failed.' });
}
