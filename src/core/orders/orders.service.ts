import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { calculateDeliveryVat, calculateVatLine } from '@/core/tax/vat-rules';

type OrderInput = Record<string, any>;

type EnforcedOrderLine = {
  productId: string | null;
  titleSnapshot: string;
  quantity: number;
  unitPriceMinor: number;
  totalPriceMinor: number;
  metadataJson: Record<string, any>;
};

type EnforcedTotals = {
  currency: string;
  subtotalMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
  itemGrossMinor: number;
  itemVatMinor: number;
  deliveryNetMinor: number;
  deliveryVatMinor: number;
  vatBreakdown: Array<{ rate: number; vatClass: string; netMinor: number; vatMinor: number; grossMinor: number; reasons: string[] }>;
};

function minor(value: unknown) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0; }
function moneyToMinor(value: unknown) { const next = Number(value); if (!Number.isFinite(next) || next < 0) return 0; return next > 10000 ? Math.round(next) : Math.round(next * 100); }
function qty(value: unknown) { const next = Number(value); return Number.isFinite(next) && next > 0 ? Math.round(next) : 1; }
function parseNotes(value: unknown) { if (typeof value !== 'string') return {} as Record<string, any>; try { return JSON.parse(value); } catch { return { note: value }; } }
function compact<T>(items: T[]) { return items.filter(Boolean) as NonNullable<T>[]; }

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const value = String(context.tenantId || '').trim();
  const tenant = (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }))) || (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }))) || (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));
  if (!tenant) throw new Error('No tenant found for internal orders.');
  return tenant.id;
}
function customerFrom(input: OrderInput) { const customer = input.customer || input.payload?.customer || {}; const splitName = `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim(); return { name: String(input.customerName || customer.name || splitName || 'Customer'), email: String(input.customerEmail || customer.email || ''), phone: String(input.customerPhone || customer.phone || ''), company: String(input.customerCompany || customer.company || customer.companyName || customer.company_name || '') }; }
function rawTotals(input: OrderInput) { return input.totals || input.payload?.totals || {}; }
function currencyFrom(input: OrderInput) { const totals = rawTotals(input); return String(input.currency || totals.currency || 'GBP'); }
function statusFrom(input: OrderInput) { if (input?.resolver?.checkoutBlocked || input.checkoutBlocked) return 'ARTWORK_CHECK'; if (input?.resolver?.quoteRequired || input.quoteRequired || input.payment_method === 'Quote request') return 'AWAITING_APPROVAL'; const raw = String(input.status || input.payload?.status || 'AWAITING_PAYMENT').toUpperCase().replace(/-/g, '_'); return ['DRAFT','AWAITING_PAYMENT','ARTWORK_CHECK','AWAITING_APPROVAL','APPROVED','IN_PRODUCTION','QUALITY_CHECK','DISPATCHED','DELIVERED','CANCELLED'].includes(raw) ? raw : 'AWAITING_PAYMENT'; }
function lineTotalMinor(item: Record<string, any>, quantity: number) { return minor(item.totalPriceMinor ?? item.lineTotalMinor ?? item.grossTotalMinor ?? item.netTotalMinor ?? item.priceMinor) || moneyToMinor(item.totalPrice ?? item.total ?? item.lineTotal) || moneyToMinor(item.price) * quantity; }
function rawItems(input: OrderInput) { return Array.isArray(input.items) ? input.items : Array.isArray(input.payload?.items) ? input.payload.items : []; }
function productIdFrom(item: Record<string, any>) { const id = item.productId || item.product_id || item.slug || item.productSlug || item.metadataJson?.productId || ''; return typeof id === 'string' && id.startsWith('c') ? id : null; }
function titleFrom(item: Record<string, any>) { return String(item.titleSnapshot || item.productName || item.name || item.title || 'Storefront order item'); }
function addVatBucket(map: Map<number, any>, line: { vatRate: number; vatClass: string; netMinor: number; vatMinor: number; grossMinor: number; vatReason?: string }) {
  const current = map.get(line.vatRate) || { rate: line.vatRate, vatClass: line.vatClass, netMinor: 0, vatMinor: 0, grossMinor: 0, reasons: [] as string[] };
  current.netMinor += line.netMinor;
  current.vatMinor += line.vatMinor;
  current.grossMinor += line.grossMinor;
  if (line.vatReason && !current.reasons.includes(line.vatReason)) current.reasons.push(line.vatReason);
  map.set(line.vatRate, current);
}

function enforceVatAndBuildItems(input: OrderInput): { items: EnforcedOrderLine[]; totals: EnforcedTotals } {
  const currency = currencyFrom(input);
  const raw = rawItems(input);
  const buckets = new Map<number, any>();
  const items: EnforcedOrderLine[] = raw.map((item: Record<string, any>) => {
    const quantity = qty(item.quantity ?? item.qty);
    const grossMinor = lineTotalMinor(item, quantity);
    const vat = calculateVatLine(item, quantity, grossMinor);
    addVatBucket(buckets, { ...vat, vatReason: vat.vatReason });
    return {
      productId: productIdFrom(item),
      titleSnapshot: titleFrom(item),
      quantity,
      unitPriceMinor: vat.unitGrossMinor,
      totalPriceMinor: vat.grossMinor,
      metadataJson: {
        ...item,
        vatRate: vat.vatRate,
        vatClass: vat.vatClass,
        vatReason: vat.vatReason,
        vatMinor: vat.vatMinor,
        netTotalMinor: vat.netMinor,
        grossTotalMinor: vat.grossMinor,
        unitNetMinor: vat.unitNetMinor,
        unitGrossMinor: vat.unitGrossMinor,
        taxEnforcedAt: new Date().toISOString(),
      },
    };
  });
  const totals = rawTotals(input);
  const itemGrossMinor = items.reduce((sum, item) => sum + item.totalPriceMinor, 0);
  const itemVatMinor = items.reduce((sum, item) => sum + minor(item.metadataJson.vatMinor), 0);
  const itemNetMinor = Math.max(0, itemGrossMinor - itemVatMinor);
  const shippingMinor = minor(input.shippingMinor ?? totals.shippingMinor ?? totals.deliveryMinor) || moneyToMinor(totals.delivery ?? input.deliveryFee);
  const deliveryVat = calculateDeliveryVat(input.delivery || input.shipping || input.deliveryMethod, shippingMinor);
  if (shippingMinor > 0) addVatBucket(buckets, { ...deliveryVat, vatReason: deliveryVat.vatReason });
  const subtotalMinor = itemNetMinor + deliveryVat.netMinor;
  const taxMinor = itemVatMinor + deliveryVat.vatMinor;
  const totalMinor = itemGrossMinor + shippingMinor;
  return {
    items,
    totals: {
      currency,
      subtotalMinor,
      shippingMinor,
      taxMinor,
      totalMinor,
      itemGrossMinor,
      itemVatMinor,
      deliveryNetMinor: deliveryVat.netMinor,
      deliveryVatMinor: deliveryVat.vatMinor,
      vatBreakdown: [...buckets.values()].sort((a, b) => a.rate - b.rate),
    },
  };
}
function extractArtworkUploadIds(input: OrderInput) { const values = [input.artworkUploadId, input.artwork_upload_id, input.artwork_reference?.id, input.artwork_reference?.upload?.id, input.artwork?.id, input.artwork?.upload?.id, ...(Array.isArray(input.artworkUploadIds) ? input.artworkUploadIds : [])]; return [...new Set(values.filter(Boolean).map(String))]; }
function addressToText(address: any) { if (!address) return ''; if (typeof address === 'string') return address; return compact([address.address1, address.address2, address.city, address.postcode, address.country]).join(', '); }
function paymentFrom(input: OrderInput, existing: Record<string, any> = {}) {
  return {
    paymentStatus: String(input.paymentStatus || existing.paymentStatus || 'unpaid'),
    paymentProvider: String(input.paymentProvider || existing.paymentProvider || ''),
    paymentReference: String(input.paymentReference || existing.paymentReference || ''),
    stripeCheckoutSessionId: String(input.stripeCheckoutSessionId || existing.stripeCheckoutSessionId || ''),
    stripePaymentIntentId: String(input.stripePaymentIntentId || existing.stripePaymentIntentId || ''),
    stripeRefundId: String(input.stripeRefundId || existing.stripeRefundId || ''),
    stripeRefundStatus: String(input.stripeRefundStatus || existing.stripeRefundStatus || ''),
    paidAt: input.paidAt || existing.paidAt || '',
    refundedAt: input.refundedAt || existing.refundedAt || '',
    refundAmountMinor: input.refundAmountMinor || existing.refundAmountMinor || '',
    refundNote: input.refundNote || existing.refundNote || '',
    paymentFailureReason: input.paymentFailureReason || existing.paymentFailureReason || '',
  };
}

function normalize(order: Record<string, any>) {
  const noteData = parseNotes(order.notes);
  const items = Array.isArray(order.items) ? order.items : [];
  const payment = paymentFrom({}, noteData.payment || noteData);
  return {
    id: order.id, orderNumber: order.orderNumber, status: order.status, currency: order.currency,
    subtotalMinor: order.subtotalMinor, shippingMinor: order.shippingMinor, taxMinor: order.taxMinor, totalMinor: order.totalMinor,
    total: Number(order.totalMinor || 0) / 100,
    vatBreakdown: noteData.vatBreakdown || [], taxEnforcedAt: noteData.taxEnforcedAt || '',
    notes: noteData.note || '', internalNotes: noteData.internalNotes || [], quoteReference: noteData.quoteReference || '',
    customerName: order.customer?.name || noteData.customer?.name || '', customerEmail: order.customer?.email || noteData.customer?.email || '', customerPhone: noteData.customer?.phone || '', customerCompany: noteData.customer?.company || '',
    shippingAddress: noteData.shippingAddress || '', billingAddress: noteData.billingAddress || '', shippingMethod: noteData.shippingMethod || '', artworkUploadIds: noteData.artworkUploadIds || [], resolver: noteData.resolver || {},
    payment, paymentStatus: payment.paymentStatus, paymentProvider: payment.paymentProvider, paymentReference: payment.paymentReference,
    stripeCheckoutSessionId: payment.stripeCheckoutSessionId, stripePaymentIntentId: payment.stripePaymentIntentId, stripeRefundId: payment.stripeRefundId, stripeRefundStatus: payment.stripeRefundStatus,
    paidAt: payment.paidAt, refundedAt: payment.refundedAt, refundAmountMinor: payment.refundAmountMinor, refundNote: payment.refundNote, paymentFailureReason: payment.paymentFailureReason,
    items: items.map((item: any) => ({ id: item.id, productId: item.productId || item.metadataJson?.productId || item.metadataJson?.slug || item.id, productName: item.titleSnapshot || item.metadataJson?.name || 'Order item', sku: item.metadataJson?.sku || item.metadataJson?.productId || '', quantity: item.quantity || 1, unitPrice: Number(item.unitPriceMinor || 0) / 100, totalPrice: Number(item.totalPriceMinor || 0) / 100, thumbnail: item.metadataJson?.thumbnail || '', vatRate: item.metadataJson?.vatRate, vatClass: item.metadataJson?.vatClass, vatReason: item.metadataJson?.vatReason, vatMinor: item.metadataJson?.vatMinor, netTotalMinor: item.metadataJson?.netTotalMinor, grossTotalMinor: item.metadataJson?.grossTotalMinor, metadataJson: item.metadataJson || {} })),
    createdAt: order.createdAt, updatedAt: order.updatedAt, source: 'internal-orders-db',
  };
}

export async function saveOrder(request: Request, input: OrderInput) {
  const tenantId = await tenantIdFromRequest(request);
  const customer = customerFrom(input);
  const enforced = enforceVatAndBuildItems(input);
  const totals = enforced.totals;
  const items = enforced.items;
  const artworkUploadIds = extractArtworkUploadIds(input);
  const orderNumber = String(input.orderNumber || input.quoteReference || input.payload?.quoteReference || `ORD-${Date.now()}`);
  const orderId = String(input.id || input.orderId || '').trim();
  const user = customer.email ? await prisma.user.findFirst({ where: { tenantId, email: customer.email }, select: { id: true } }) : null;
  const existingRow = orderId ? await prisma.order.findFirst({ where: { tenantId, OR: [{ id: orderId }, { orderNumber: orderId }] }, include: { items: true, customer: true } }) : await prisma.order.findFirst({ where: { tenantId, orderNumber }, include: { items: true, customer: true } });
  const existingNotes = existingRow ? parseNotes(existingRow.notes) : {};
  const payment = paymentFrom(input, existingNotes.payment || existingNotes);
  const notes = JSON.stringify({ note: input.notes || existingNotes.note || '', internalNotes: input.internalNotes || existingNotes.internalNotes || [], customer, quoteReference: input.quoteReference || input.payload?.quoteReference || existingNotes.quoteReference || '', totals, vatBreakdown: totals.vatBreakdown, taxEnforcedAt: new Date().toISOString(), artworkUploadIds: artworkUploadIds.length ? artworkUploadIds : existingNotes.artworkUploadIds || [], resolver: input.resolver || existingNotes.resolver || {}, artworkPreflight: input.artwork_preflight || input.artworkPreflight || existingNotes.artworkPreflight || null, shippingAddress: addressToText(input.delivery_address || input.shippingAddress) || existingNotes.shippingAddress || '', billingAddress: addressToText(input.billing_address || input.billingAddress) || existingNotes.billingAddress || '', shippingMethod: input.delivery?.publicLabel || input.delivery?.label || input.shippingMethod || existingNotes.shippingMethod || '', payment, rawCheckout: input.rawCheckout || existingNotes.rawCheckout || input });
  const existing = existingRow ? { id: existingRow.id } : null;
  const data = { tenantId, customerId: user?.id || null, orderNumber, status: statusFrom(input) as any, currency: totals.currency, subtotalMinor: totals.subtotalMinor, shippingMinor: totals.shippingMinor, taxMinor: totals.taxMinor, totalMinor: totals.totalMinor, notes };
  const order = existing ? await prisma.order.update({ where: { id: existing.id }, data: { ...data, items: { deleteMany: {}, create: items } } as any, include: { items: true, customer: true } }) : await prisma.order.create({ data: { ...data, items: { create: items } } as any, include: { items: true, customer: true } });
  return normalize(order);
}
export async function getOrder(request: Request, id: string) { const tenantId = await tenantIdFromRequest(request); const order = await prisma.order.findFirst({ where: { tenantId, OR: [{ id }, { orderNumber: id }] }, include: { items: true, customer: true } }); return order ? normalize(order) : null; }
export async function listOrders(request: Request, options: { email?: string | null; status?: string | null; limit?: number; search?: string | null } = {}) { const tenantId = await tenantIdFromRequest(request); const orders = await prisma.order.findMany({ where: { tenantId, ...(options.status ? { status: statusFrom({ status: options.status }) as any } : {}) }, include: { items: true, customer: true }, orderBy: { createdAt: 'desc' }, take: Math.max(1, Math.min(100, Number(options.limit || 50))) }); let normalized = orders.map(normalize); if (options.email) normalized = normalized.filter((order) => order.customerEmail.toLowerCase() === String(options.email).toLowerCase()); if (options.search) { const term = String(options.search).toLowerCase(); normalized = normalized.filter((order) => [order.orderNumber, order.customerName, order.customerEmail, order.customerCompany].join(' ').toLowerCase().includes(term)); } return normalized; }
export async function updateOrder(request: Request, id: string, patch: OrderInput) { const existing = await getOrder(request, id); if (!existing) return null; return saveOrder(request, { ...existing, ...patch, id: existing.id, orderNumber: existing.orderNumber }); }