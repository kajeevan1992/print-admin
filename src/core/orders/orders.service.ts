import { prisma } from '@/lib/prisma';
import { tenantContextFromRequest } from '@/core/tenant/context';

type OrderInput = Record<string, any>;

function minor(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0;
}

function qty(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 1;
}

function parseNotes(value: unknown) {
  if (typeof value !== 'string') return {} as Record<string, any>;
  try { return JSON.parse(value); } catch { return { note: value }; }
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
  const splitName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  return {
    name: String(input.customerName || customer.name || splitName || ''),
    email: String(input.customerEmail || customer.email || ''),
    phone: String(input.customerPhone || customer.phone || ''),
    company: String(input.customerCompany || customer.company || customer.companyName || ''),
  };
}

function totalsFrom(input: OrderInput) {
  const totals = input.totals || input.payload?.totals || {};
  const subtotalMinor = minor(input.subtotalMinor ?? input.netTotalMinor ?? totals.subtotalMinor ?? totals.netTotalMinor);
  const taxMinor = minor(input.taxMinor ?? input.vatTotalMinor ?? totals.taxMinor ?? totals.vatTotalMinor);
  const shippingMinor = minor(input.shippingMinor ?? totals.shippingMinor ?? totals.deliveryMinor);
  const totalMinor = minor(input.totalMinor ?? input.grossTotalMinor ?? totals.totalMinor ?? totals.grossTotalMinor ?? subtotalMinor + taxMinor + shippingMinor);
  return { currency: String(input.currency || totals.currency || 'GBP'), subtotalMinor, taxMinor, shippingMinor, totalMinor };
}

function statusFrom(input: OrderInput) {
  const raw = String(input.status || input.payload?.status || 'DRAFT').toUpperCase().replace(/-/g, '_');
  return ['DRAFT','AWAITING_PAYMENT','ARTWORK_CHECK','AWAITING_APPROVAL','APPROVED','IN_PRODUCTION','QUALITY_CHECK','DISPATCHED','DELIVERED','CANCELLED'].includes(raw) ? raw : 'DRAFT';
}

function itemsFrom(input: OrderInput) {
  const items = Array.isArray(input.items) ? input.items : Array.isArray(input.payload?.items) ? input.payload.items : [];
  return items.map((item: Record<string, any>) => {
    const quantity = qty(item.quantity ?? item.qty);
    const totalPriceMinor = minor(item.totalPriceMinor ?? item.grossTotalMinor ?? item.netTotalMinor ?? item.priceMinor);
    return {
      productId: typeof item.productId === 'string' && item.productId.startsWith('c') ? item.productId : null,
      titleSnapshot: String(item.titleSnapshot || item.productName || item.name || item.title || 'Storefront order item'),
      quantity,
      unitPriceMinor: minor(item.unitPriceMinor ?? item.unitNetMinor ?? Math.round(totalPriceMinor / quantity)),
      totalPriceMinor,
      metadataJson: item,
    };
  });
}

function normalize(order: Record<string, any>) {
  const noteData = parseNotes(order.notes);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    notes: noteData.note || '',
    quoteReference: noteData.quoteReference || '',
    customerName: order.customer?.name || noteData.customer?.name || '',
    customerEmail: order.customer?.email || noteData.customer?.email || '',
    customerPhone: noteData.customer?.phone || '',
    customerCompany: noteData.customer?.company || '',
    items: order.items || [],
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
  const orderNumber = String(input.orderNumber || input.quoteReference || input.payload?.quoteReference || `ORD-${Date.now()}`);
  const orderId = String(input.id || input.orderId || '').trim();
  const user = customer.email ? await prisma.user.findFirst({ where: { tenantId, email: customer.email }, select: { id: true } }) : null;
  const notes = JSON.stringify({ note: input.notes || '', customer, quoteReference: input.quoteReference || input.payload?.quoteReference || '', totals });
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

export async function listOrders(request: Request, options: { email?: string | null; status?: string | null; limit?: number } = {}) {
  const tenantId = await tenantIdFromRequest(request);
  const orders = await prisma.order.findMany({ where: { tenantId, ...(options.status ? { status: statusFrom({ status: options.status }) as any } : {}) }, include: { items: true, customer: true }, orderBy: { createdAt: 'desc' }, take: Math.max(1, Math.min(100, Number(options.limit || 50))) });
  const normalized = orders.map(normalize);
  return options.email ? normalized.filter((order) => order.customerEmail.toLowerCase() === String(options.email).toLowerCase()) : normalized;
}
