import { queueInternalEmail, sendInternalEmail } from '@/core/email/internal-email.service';

function clean(value: unknown) { return String(value || '').trim(); }
function escapeHtml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function html(body: string) { return `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#111827;white-space:pre-wrap">${escapeHtml(body)}</div>`; }
function scopedRequest(request: Request, tenantSlug: string) { const headers = new Headers(request.headers); headers.set('x-tenant-id', tenantSlug); return new Request(request.url, { method: 'GET', headers }); }

function statusCopy(status: string, collection: boolean) {
  if (status === 'collection-ready') return { subject: 'ready for collection', title: 'Your order is ready for collection', detail: 'Please collect it during the store’s opening hours. Bring your order number with you.' };
  if (status === 'collected') return { subject: 'collected', title: 'Your order was collected', detail: 'Thank you for collecting your order.' };
  if (status === 'delivered') return { subject: 'delivered', title: 'Your order was delivered', detail: 'The shipment has been marked delivered.' };
  if (status === 'exception') return { subject: 'delivery update', title: 'There is a delivery update', detail: 'The store has recorded an exception and is reviewing the next step.' };
  if (status === 'in-transit') return { subject: 'in transit', title: 'Your order is in transit', detail: 'The carrier is moving your shipment through its network.' };
  return collection ? { subject: 'collection update', title: 'Your collection order has been updated', detail: 'Check the order tracker for the latest status.' } : { subject: 'dispatched', title: 'Your order has been dispatched', detail: 'The shipment has been handed to the carrier.' };
}

export async function sendShipmentCustomerEmail(request: Request, input: {
  tenantSlug: string;
  storeSlug: string;
  storeName: string;
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  status: string;
  carrier?: string;
  service?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  note?: string;
}) {
  const brand = clean(input.storeName) || 'Print store';
  const collection = clean(input.service).toLowerCase() === 'collection' || clean(input.carrier).toLowerCase() === 'collection';
  const copy = statusCopy(clean(input.status).toLowerCase(), collection);
  const orderTracker = `${new URL(request.url).origin}/track-order?orderId=${encodeURIComponent(input.orderNumber)}`;
  const trackingLines = collection ? '' : `\nCarrier: ${clean(input.carrier) || 'To be confirmed'}\nService: ${clean(input.service) || 'To be confirmed'}${clean(input.trackingNumber) ? `\nTracking number: ${clean(input.trackingNumber)}` : ''}${clean(input.trackingUrl) ? `\nCarrier tracking: ${clean(input.trackingUrl)}` : ''}`;
  const body = `Hi ${clean(input.customerName) || 'Customer'},\n\n${copy.title}.\n\nOrder: ${clean(input.orderNumber)}${trackingLines}\n\n${copy.detail}${clean(input.note) ? `\n\nStore note:\n${clean(input.note)}` : ''}\n\nView the latest order and shipment timeline:\n${orderTracker}\n\nFor privacy, the tracker will ask for the email address used on the order.\n\nKind regards,\n${brand}`;
  const scoped = scopedRequest(request, input.tenantSlug);
  const queued = await queueInternalEmail({ type: `shipment-${clean(input.status).toLowerCase() || 'update'}`, to: input.customerEmail, subject: `${brand}: order ${input.orderNumber} ${copy.subject}`, body, html: html(body) }, scoped);
  return sendInternalEmail(queued.id, scoped).catch(() => queued);
}
