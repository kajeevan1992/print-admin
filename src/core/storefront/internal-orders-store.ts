import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { TenantContext } from '@/core/tenant/types';
import type { Order, OrderLineItem, OrderStatus, PaymentStatus, ProductionStage } from '@/modules/orders/types';

export type InternalOrderRecord = Order & {
  tenantId: string;
  siteId?: string;
  source: 'hosted-checkout' | 'admin' | 'quote-request' | 'internal';
  rawPayload?: unknown;
  artworkUploadIds?: string[];
  quoteRequired?: boolean;
  checkoutBlocked?: boolean;
};

function rootDir() {
  return path.join(process.cwd(), '.data');
}

function storePath() {
  return path.join(rootDir(), 'internal-orders.json');
}

async function readOrders(): Promise<InternalOrderRecord[]> {
  await mkdir(rootDir(), { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(storePath(), 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders: InternalOrderRecord[]) {
  await mkdir(rootDir(), { recursive: true });
  await writeFile(storePath(), JSON.stringify(orders, null, 2));
  return orders;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function money(value: unknown) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function addressToText(address: any) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  return [address.address1, address.address2, address.city, address.postcode, address.country].filter(Boolean).join(', ');
}

function customerName(customer: any) {
  return [customer?.first_name || customer?.firstName, customer?.last_name || customer?.lastName].filter(Boolean).join(' ') || customer?.name || 'Customer';
}

function orderNumber(id: string) {
  return `HP-${new Date().getFullYear()}-${id.replace(/^ord_/, '').slice(0, 8).toUpperCase()}`;
}

function normaliseItems(rawItems: any[] = []): OrderLineItem[] {
  return rawItems.map((item, index) => {
    const qty = Number(item.qty || item.quantity || 1);
    const lineTotal = money(item.totalPrice || item.total || item.lineTotal || (money(item.price) * qty));
    return {
      id: String(item.id || `line-${index + 1}`),
      productId: String(item.productId || item.product_id || item.slug || item.id || `product-${index + 1}`),
      productName: String(item.productName || item.name || item.title || 'Print product'),
      sku: String(item.sku || item.productId || item.slug || ''),
      quantity: qty,
      unitPrice: money(item.unitPrice || item.price || (qty ? lineTotal / qty : 0)),
      totalPrice: lineTotal,
      thumbnail: String(item.thumbnail || item.image || ''),
    };
  });
}

function extractArtworkUploadIds(payload: any) {
  const values = [
    payload?.artworkUploadId,
    payload?.artwork_upload_id,
    payload?.artwork_reference?.id,
    payload?.artwork_reference?.upload?.id,
    payload?.artwork?.id,
    payload?.artwork?.upload?.id,
    ...(Array.isArray(payload?.artworkUploadIds) ? payload.artworkUploadIds : []),
  ];
  return [...new Set(values.filter(Boolean).map(String))];
}

export async function listInternalOrders(params?: { search?: string; status?: OrderStatus | 'all' }) {
  const orders = await readOrders();
  const term = params?.search?.trim().toLowerCase();
  return orders
    .filter((order) => {
      const matchesSearch = !term || [order.orderNumber, order.customerName, order.customerEmail, order.organizationName].join(' ').toLowerCase().includes(term);
      const matchesStatus = !params?.status || params.status === 'all' || order.status === params.status;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export async function getInternalOrder(id: string) {
  const orders = await readOrders();
  return orders.find((order) => order.id === id || order.orderNumber === id) || null;
}

export async function createInternalOrder(ctx: TenantContext, payload: any = {}) {
  const orders = await readOrders();
  const now = new Date().toISOString();
  const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const items = normaliseItems(payload.items || payload.selections || []);
  const total = money(payload?.totals?.total || payload.total || items.reduce((sum, item) => sum + item.totalPrice, 0));
  const quoteRequired = Boolean(payload?.resolver?.quoteRequired || payload.quoteRequired || payload.payment_method === 'Quote request');
  const blocked = Boolean(payload?.resolver?.checkoutBlocked || payload.checkoutBlocked);
  const order: InternalOrderRecord = {
    id,
    tenantId: ctx.tenantId,
    siteId: ctx.siteId,
    source: quoteRequired ? 'quote-request' : 'hosted-checkout',
    orderNumber: orderNumber(id),
    customerName: customerName(payload.customer),
    organizationName: asString(payload.customer?.company_name || payload.customer?.companyName, ''),
    customerEmail: asString(payload.customer?.email, ''),
    createdAt: now,
    updatedAt: now,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: quoteRequired || blocked ? 'pending' : 'approved',
    paymentStatus: quoteRequired ? 'unpaid' : (payload.payment_method === 'Invoice me later' ? 'unpaid' : 'authorized'),
    productionStage: 'prepress',
    total,
    currency: payload.currency || 'GBP',
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    storeName: payload.storeName || 'Hosted Storefront',
    shippingMethod: payload.delivery?.publicLabel || payload.delivery?.label || payload.delivery?.name || '',
    shippingAddress: addressToText(payload.delivery_address),
    billingAddress: addressToText(payload.billing_address),
    trackingNumber: '',
    notes: [payload.notes, quoteRequired ? 'Quote/manual review required from hosted checkout.' : 'Created from hosted checkout.'].filter(Boolean),
    items,
    activity: [
      { id: `act_${Date.now()}`, label: 'Order created', timestamp: now, tone: quoteRequired ? 'warning' : 'success', description: quoteRequired ? 'Hosted checkout created a quote/manual review order.' : 'Hosted checkout created a live internal order.' },
    ],
    rawPayload: payload,
    artworkUploadIds: extractArtworkUploadIds(payload),
    quoteRequired,
    checkoutBlocked: blocked,
  };
  await writeOrders([order, ...orders]);
  return order;
}

export async function updateInternalOrder(id: string, patch: Partial<InternalOrderRecord>) {
  const orders = await readOrders();
  const now = new Date().toISOString();
  const next = orders.map((order) => order.id === id || order.orderNumber === id ? { ...order, ...patch, updatedAt: now } : order);
  await writeOrders(next);
  return next.find((order) => order.id === id || order.orderNumber === id) || null;
}

export async function addInternalOrderNote(id: string, note: string) {
  const order = await getInternalOrder(id);
  if (!order) return null;
  return updateInternalOrder(order.id, { notes: [...(order.notes || []), note], activity: [...(order.activity || []), { id: `act_${Date.now()}`, label: 'Internal note added', timestamp: new Date().toISOString(), tone: 'default', description: note }] });
}

export async function appendArtworkToInternalOrder(orderId: string, uploadId: string) {
  const order = await getInternalOrder(orderId);
  if (!order) return null;
  const ids = [...new Set([...(order.artworkUploadIds || []), uploadId].filter(Boolean))];
  return updateInternalOrder(order.id, { artworkUploadIds: ids });
}
