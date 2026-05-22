import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type OrderInput = Record<string, any>;

function minor(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0;
}

function moneyToMinor(value: unknown) {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) return 0;
  // Hosted theme sends pounds. Internal APIs may already send minor units.
  return next > 10000 ? Math.round(next) : Math.round(next * 100);
}

function qty(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 1;
}

function parseNotes(value: unknown) {
  if (typeof value !== 'string') return {} as Record<string, any>;
  try { return JSON.parse(value); } catch { return { note: value }; }
}

function compact<T>(items: T[]) {
  return items.filter(Boolean) as NonNullable<T>[];
}

async function tenantIdFromRequest(request: Request) {
  const context = tenantContextFromRequest(request);
  const value = String(context.tenantId || '').trim();
  const tenant =
    (value && (await prisma.tenant.findUnique({ where: { id: value }, select: { id: true } }))) ||
    (value && (await prisma.tenant.findUnique({ where: { slug: value }, select: { id: true } }))) ||
    (await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }));
  if (!tenant) throw new Error('No tenant found for internal orders.');
  return tenant.id;
}

function customerFrom(input: OrderInput) {
  const customer = input.customer || input.payload?.customer || {};
  const splitName = `${customer.firstName || customer.first_name || ''} ${customer.lastName || customer.last_name || ''}`.trim();
  return {
    name: String(input.customerName || customer.name || splitName || 'Customer'),
    email: String(input.customerEmail || customer.email || ''),
    phone: String(input.customerPhone || customer.phone || ''),
    company: String(input.customerCompany || customer.company || customer.companyName || customer.company_name || ''),
  };
}

function totalsFrom(input: OrderInput) {
  const totals = input.totals || input.payload?.totals || {};
  const subtotalMinor = minor(input.subtotalMinor ?? input.netTotalMinor ?? totals.subtotalMinor ?? totals.netTotalMinor) || moneyToMinor(totals.subtotal ?? input.subtotal);
  const taxMinor = minor(input.taxMinor ?? input.vatTotalMinor ?? totals.taxMinor ?? totals.vatTotalMinor) || moneyToMinor(totals.vat ?? totals.tax ?? input.vat);
  const shippingMinor = minor(input.shippingMinor ?? totals.shippingMinor ?? totals.deliveryMinor) || moneyToMinor(totals.delivery ?? input.deliveryFee);
  const totalMinor = minor(input.totalMinor ?? input.grossTotalMinor ?? totals.totalMinor ?? totals.grossTotalMinor) || moneyToMinor(totals.total ?? input.total) || subtotalMinor + taxMinor + shippingMinor;
  return { currency: String(input.currency || totals.currency || 'GBP'), subtotalMinor, taxMinor, shippingMinor, totalMinor };
}

function statusFrom(input: OrderInput) {
  if (input?.resolver?.checkoutBlocked || input.checkoutBlocked) return 'ARTWORK_CHECK';
  if (input?.resolver?.quoteRequired || input.quoteRequired || input.payment_method === 'Quote request') return 'AWAITING_APPROVAL';
  const raw = String(input.status || input.payload?.status || 'AWAITING_PAYMENT').toUpperCase().replace(/-/g, '_');
  return ['DRAFT','AWAITING_PAYMENT','ARTWORK_CHECK','AWAITING_APPROVAL','APPROVED','IN_PRODUCTION','QUALITY_CHECK','DISPATCHED','DELIVERED','CANCELLED'].includes(raw) ? raw : 'AWAITING_PAYMENT';
}

function lineTotalMinor(item: Record<string, any>, quantity: number) {
  return minor(item.totalPriceMinor ?? item.lineTotalMinor ?? item.grossTotalMinor ?? item.netTotalMinor ?? item.priceMinor) || moneyToMinor(item.totalPrice ?? item.total ?? item.lineTotal) || moneyToMinor(item.price) * quantity;
}

function itemsFrom(input: OrderInput) {
  const items = Array.isArray(input.items) ? input.items : Array.isArray(input.payload?.items) ? input.payload.items : [];
  return items.map((item: Record<string, any>) => {
    const quantity = qty(item.quantity ?? item.qty);
    const totalPriceMinor = lineTotalMinor(item, quantity);
    const unitPriceMinor = minor(item.unitPriceMinor ?? item.unitNetMinor) || moneyToMinor(item.unitPrice ?? item.price) || Math.round(totalPriceMinor / quantity);
    return {
      productId: typeof item.productId === 'string' && item.productId.startsWith('c') ? item.productId : null,
      titleSnapshot: String(item.titleSnapshot || item.productName || item.name || item.title || 'Storefront order item'),
      quantity,
      unitPriceMinor,
      totalPriceMinor,
      metadataJson: item,
    };
  });
}

function extractArtworkUploadIds(input: OrderInput) {
  const values = [
    input.artworkUploadId,
    input.artwork_upload_id,
    input.artwork_reference?.id,
    input.artwork_reference?.upload?.id,
    input.artwork?.id,
    input.artwork?.upload?.id,
    ...(Array.isArray(input.artworkUploadIds) ? input.artworkUploadIds : []),
  ];
  return [...new Set(values.filter(Boolean).map(String))];
}

function addressToText(address: any) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return compact([address.address1, address.address2, address.city, address.postcode, address.country]).join(', ');
}

function normalize(order: Record<string, any>) {
  const noteData = parseNotes(order.notes);
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    total: Number(order.totalMinor || 0) / 100,
    notes: noteData.note || '',
    internalNotes: noteData.internalNotes || [],
    quoteReference: noteData.quoteReference || '',
    customerName: order.customer?.name || noteData.customer?.name || '',
    customerEmail: order.customer?.email || noteData.customer?.email || '',
    customerPhone: noteData.customer?.phone || '',
    customerCompany: noteData.customer?.company || '',
    shippingAddress: noteData.shippingAddress || '',
    billingAddress: noteData.billingAddress || '',
    shippingMethod: noteData.shippingMethod || '',
    artworkUploadIds: noteData.artworkUploadIds || [],
    resolver: noteData.resolver || {},
    items: items.map((item: any) => ({
      id: item.id,
      productId: item.productId || item.metadataJson?.productId || item.metadataJson?.slug || item.id,
      productName: item.titleSnapshot || item.metadataJson?.name || 'Order item',
      sku: item.metadataJson?.sku || item.metadataJson?.productId || '',
      quantity: item.quantity || 1,
      unitPrice: Number(item.unitPriceMinor || 0) / 100,
      totalPrice: Number(item.totalPriceMinor || 0) / 100,
      thumbnail: item.metadataJson?.thumbnail || '',
      metadataJson: item.metadataJson || {},
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    source: 'internal-orders-db',
  };
}

export async function saveOrder(request: Request, input: OrderInput) {
  const tenantId = await tenantIdFromRequest(request);
  const customer = customerFrom(input);
  const totals = totalsFrom(input);
  const items = itemsFrom(input);
  const artworkUploadIds = extractArtworkUploadIds(input);
  const orderNumber = String(input.orderNumber || input.quoteReference || input.payload?.quoteReference || `ORD-${Date.now()}`);
  const orderId = String(input.id || input.orderId || '').trim();
  const user = customer.email ? await prisma.user.findFirst({ where: { tenantId, email: customer.email }, select: { id: true } }) : null;
  const notes = JSON.stringify({
    note: input.notes || '',
    internalNotes: input.internalNotes || [],
    customer,
    quoteReference: input.quoteReference || input.payload?.quoteReference || '',
    totals,
    artworkUploadIds,
    resolver: input.resolver || {},
    artworkPreflight: input.artwork_preflight || input.artworkPreflight || null,
    shippingAddress: addressToText(input.delivery_address || input.shippingAddress),
    billingAddress: addressToText(input.billing_address || input.billingAddress),
    shippingMethod: input.delivery?.publicLabel || input.delivery?.label || input.shippingMethod || '',
    rawCheckout: input,
  });
  const existing = orderId
    ? await prisma.order.findFirst({ where: { tenantId, OR: [{ id: orderId }, { orderNumber: orderId }] }, select: { id: true } })
    : await prisma.order.findFirst({ where: { tenantId, orderNumber }, select: { id: true } });
  const data = { tenantId, customerId: user?.id || null, orderNumber, status: statusFrom(input) as any, currency: totals.currency, subtotalMinor: totals.subtotalMinor, shippingMinor: totals.shippingMinor, taxMinor: totals.taxMinor, totalMinor: totals.totalMinor, notes };
  const order = existing
    ? await prisma.order.update({ where: { id: existing.id }, data: { ...data, items: { deleteMany: {}, create: items } } as any, include: { items: true, customer: true } })
    : await prisma.order.create({ data: { ...data, items: { create: items } } as any, include: { items: true, customer: true } });
  return normalize(order);
}

export async function getOrder(request: Request, id: string) {
  const tenantId = await tenantIdFromRequest(request);
  const order = await prisma.order.findFirst({ where: { tenantId, OR: [{ id }, { orderNumber: id }] }, include: { items: true, customer: true } });
  return order ? normalize(order) : null;
}

export async function listOrders(request: Request, options: { email?: string | null; status?: string | null; limit?: number; search?: string | null } = {}) {
  const tenantId = await tenantIdFromRequest(request);
  const orders = await prisma.order.findMany({ where: { tenantId, ...(options.status ? { status: statusFrom({ status: options.status }) as any } : {}) }, include: { items: true, customer: true }, orderBy: { createdAt: 'desc' }, take: Math.max(1, Math.min(100, Number(options.limit || 50))) });
  let normalized = orders.map(normalize);
  if (options.email) normalized = normalized.filter((order) => order.customerEmail.toLowerCase() === String(options.email).toLowerCase());
  if (options.search) {
    const term = String(options.search).toLowerCase();
    normalized = normalized.filter((order) => [order.orderNumber, order.customerName, order.customerEmail, order.customerCompany].join(' ').toLowerCase().includes(term));
  }
  return normalized;
}

export async function updateOrder(request: Request, id: string, patch: OrderInput) {
  const existing = await getOrder(request, id);
  if (!existing) return null;
  return saveOrder(request, { ...existing, ...patch, id: existing.id, orderNumber: existing.orderNumber });
}
