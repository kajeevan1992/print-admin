import { ordersMock } from '@/data/orders';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Order, OrderStatus, PaymentStatus, ProductionStage } from '@/modules/orders/types';

let ordersStore: Order[] = [...ordersMock];
const STORAGE_KEY = 'print-admin-orders-store';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 80));

function readStore(): Order[] { if (typeof window === 'undefined') return ordersStore; try { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return ordersStore; const parsed = JSON.parse(raw) as Order[]; return Array.isArray(parsed) ? parsed : ordersStore; } catch { return ordersStore; } }
function writeStore(next: Order[]) { ordersStore = next; if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
function sortByUpdated(items: Order[]) { return [...items].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); }
function internalStatusToAdmin(status: string): OrderStatus { const raw = String(status || '').toUpperCase(); if (raw === 'DRAFT') return 'draft'; if (raw === 'AWAITING_PAYMENT' || raw === 'ARTWORK_CHECK' || raw === 'AWAITING_APPROVAL') return 'pending'; if (raw === 'APPROVED' || raw === 'QUALITY_CHECK') return 'approved'; if (raw === 'IN_PRODUCTION') return 'in-production'; if (raw === 'DISPATCHED') return 'shipped'; if (raw === 'DELIVERED') return 'completed'; if (raw === 'CANCELLED') return 'cancelled'; return ['draft', 'pending', 'approved', 'in-production', 'shipped', 'completed', 'cancelled'].includes(status) ? status as OrderStatus : 'pending'; }
function internalPaymentToAdmin(value: unknown): PaymentStatus { const raw = String(value || '').toLowerCase(); if (raw.includes('refund-pending')) return 'refund-pending'; if (raw.includes('refund')) return 'refunded'; if (raw.includes('cancel')) return 'cancelled'; if (raw.includes('failed')) return 'failed'; if (raw.includes('captured')) return 'captured'; if (raw.includes('paid')) return 'paid'; if (raw.includes('author')) return 'authorized'; if (raw.includes('pending')) return 'pending'; return 'unpaid'; }
function adminStatusToInternal(status: OrderStatus) { const map: Record<OrderStatus, string> = { draft: 'DRAFT', pending: 'AWAITING_APPROVAL', approved: 'APPROVED', 'in-production': 'IN_PRODUCTION', shipped: 'DISPATCHED', completed: 'DELIVERED', cancelled: 'CANCELLED' }; return map[status] || 'AWAITING_APPROVAL'; }
function adminPaymentToInternal(status: PaymentStatus) { const map: Record<PaymentStatus, string> = { unpaid: 'AWAITING_PAYMENT', pending: 'AWAITING_PAYMENT', authorized: 'APPROVED', captured: 'APPROVED', paid: 'APPROVED', failed: 'AWAITING_PAYMENT', cancelled: 'CANCELLED', 'refund-pending': 'APPROVED', refunded: 'CANCELLED' }; return map[status] || 'AWAITING_PAYMENT'; }
function stageFromInternal(status: string, fallback?: ProductionStage): ProductionStage { if (fallback) return fallback; const raw = String(status || '').toUpperCase(); if (raw === 'IN_PRODUCTION') return 'printing'; if (raw === 'DISPATCHED' || raw === 'DELIVERED') return 'dispatch'; if (raw === 'QUALITY_CHECK') return 'finishing'; return 'prepress'; }

function normaliseInternalOrder(o: any, index = 0): Order {
  const items = Array.isArray(o.items) ? o.items : [];
  const total = typeof o.total === 'number' ? o.total : typeof o.totalMinor === 'number' ? o.totalMinor / 100 : 0;
  const internalNotes = Array.isArray(o.internalNotes) ? o.internalNotes : [];
  return {
    id: o.id || o.orderNumber || `ord-${index + 1}`,
    orderNumber: o.orderNumber || o.id || `ORD-${index + 1}`,
    customerName: o.customerName || 'Customer',
    organizationName: o.customerCompany || o.organizationName || '',
    customerEmail: o.customerEmail || '',
    createdAt: o.createdAt || new Date().toISOString(),
    updatedAt: o.updatedAt || o.createdAt || new Date().toISOString(),
    dueDate: o.dueDate || new Date().toISOString().slice(0, 10),
    status: internalStatusToAdmin(o.status),
    paymentStatus: internalPaymentToAdmin(o.paymentStatus || o.payment?.paymentStatus || o.status),
    paymentProvider: o.paymentProvider || o.payment?.paymentProvider || '',
    paymentReference: o.paymentReference || o.payment?.paymentReference || '',
    stripeCheckoutSessionId: o.stripeCheckoutSessionId || o.payment?.stripeCheckoutSessionId || '',
    stripePaymentIntentId: o.stripePaymentIntentId || o.payment?.stripePaymentIntentId || '',
    stripeRefundId: o.stripeRefundId || o.payment?.stripeRefundId || '',
    stripeRefundStatus: o.stripeRefundStatus || o.payment?.stripeRefundStatus || '',
    paidAt: o.paidAt || o.payment?.paidAt || '',
    refundedAt: o.refundedAt || o.payment?.refundedAt || '',
    refundAmountMinor: o.refundAmountMinor || o.payment?.refundAmountMinor || '',
    refundNote: o.refundNote || o.payment?.refundNote || '',
    paymentFailureReason: o.paymentFailureReason || o.payment?.paymentFailureReason || '',
    productionStage: stageFromInternal(o.status, o.productionStage),
    total,
    currency: o.currency || 'GBP',
    itemCount: o.itemCount || items.reduce((sum: number, item: any) => sum + Number(item.quantity || 1), 0),
    storeName: o.storeName || o.source || 'Internal orders',
    shippingMethod: o.shippingMethod || '',
    shippingAddress: o.shippingAddress || '',
    billingAddress: o.billingAddress || '',
    trackingNumber: o.trackingNumber || '',
    notes: [...(typeof o.notes === 'string' && o.notes ? [o.notes] : []), ...internalNotes],
    items: items.map((item: any, i: number) => ({ id: item.id || `${o.id || index}-item-${i}`, productId: item.productId || item.metadataJson?.productId || `prod-${i}`, productName: item.productName || item.titleSnapshot || item.name || 'Order item', sku: item.sku || item.metadataJson?.sku || item.productId || '', quantity: item.quantity || 1, unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : typeof item.unitPriceMinor === 'number' ? item.unitPriceMinor / 100 : 0, totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : typeof item.totalPriceMinor === 'number' ? item.totalPriceMinor / 100 : 0, thumbnail: item.thumbnail || item.metadataJson?.thumbnail || '' })),
    activity: Array.isArray(o.activity) ? o.activity : [{ id: `act-${o.id || index}`, label: 'Order loaded', timestamp: o.updatedAt || o.createdAt || new Date().toISOString(), tone: 'default', description: 'Loaded from internal orders API.' }],
  };
}

async function tryInternalOrders(params?: { search?: string; status?: OrderStatus | 'all' }): Promise<Order[] | null> { if (typeof window === 'undefined') return null; try { const qs = new URLSearchParams(); if (params?.search) qs.set('search', params.search); if (params?.status && params.status !== 'all') qs.set('status', adminStatusToInternal(params.status)); const res = await fetch(`/api/internal/orders?${qs.toString()}`, { cache: 'no-store' }); const payload = await res.json().catch(() => null); if (!res.ok || !payload?.ok) return null; const raw = payload?.data?.items || payload?.data?.orders || payload?.orders || []; if (!Array.isArray(raw)) return null; return sortByUpdated(raw.map(normaliseInternalOrder)); } catch { return null; } }
async function tryInternalOrder(id: string): Promise<Order | null> { if (typeof window === 'undefined') return null; try { const res = await fetch(`/api/internal/orders/${encodeURIComponent(id)}`, { cache: 'no-store' }); const payload = await res.json().catch(() => null); if (!res.ok || !payload?.ok) return null; const raw = payload?.order || payload?.data?.order; return raw ? normaliseInternalOrder(raw) : null; } catch { return null; } }
async function patchInternalOrder(id: string, patch: Record<string, any>): Promise<Order | null> { if (typeof window === 'undefined') return null; try { const res = await fetch(`/api/internal/orders/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }); const payload = await res.json().catch(() => null); if (!res.ok || !payload?.ok) return null; const raw = payload?.order || payload?.data?.order; return raw ? normaliseInternalOrder(raw) : null; } catch { return null; } }
async function paymentAction(id: string, body: Record<string, any>): Promise<{ order: Order | null; paymentUrl?: string; session?: any }> { if (typeof window === 'undefined') return { order: null }; const res = await fetch(`/api/internal/orders/${encodeURIComponent(id)}/payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await res.json().catch(() => null); if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Payment action failed'); const raw = payload?.order || payload?.data?.order; return { order: raw ? normaliseInternalOrder(raw) : null, paymentUrl: payload?.paymentUrl || payload?.data?.paymentUrl, session: payload?.session || payload?.data?.session }; }

type AdminPaymentAction = 'mark-paid' | 'mark-failed' | 'mark-refunded' | 'refund-note' | 'stripe-refund' | 'approve-quote' | 'create-payment-link';

export const ordersService = {
  listOrders: async (params?: { search?: string; status?: OrderStatus | 'all' }): Promise<PaginatedResponse<Order>> => { const internal = await tryInternalOrders(params); if (internal) return okPaginated(internal, { page: 1, perPage: Math.max(1, internal.length), total: internal.length, totalPages: 1 }); await wait(); const term = params?.search?.trim().toLowerCase(); const items = sortByUpdated(readStore().filter((order) => { const matchesSearch = !term || [order.orderNumber, order.customerName, order.organizationName, order.customerEmail].join(' ').toLowerCase().includes(term); const matchesStatus = !params?.status || params.status === 'all' || order.status === params.status; return matchesSearch && matchesStatus; })); return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 }); },
  getOrder: async (id: string): Promise<ApiResponse<Order>> => { const internal = await tryInternalOrder(id); if (internal) return ok(internal); await wait(); const item = readStore().find((order) => order.id === id || order.orderNumber === id) ?? ordersStore[0]; return ok(item); },
  saveOrder: async (order: Order): Promise<ApiResponse<Order>> => { const patched = await patchInternalOrder(order.id, order); if (patched) return ok(patched); await wait(); const items = readStore(); const next = items.some((item) => item.id === order.id) ? items.map((item) => (item.id === order.id ? order : item)) : [order, ...items]; writeStore(next); return ok(order); },
  updateOrderStatus: async (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => { const patched = await patchInternalOrder(id, { status: adminStatusToInternal(status) }); if (patched) return ok(patched); const current = readStore().find((order) => order.id === id) ?? ordersStore[0]; return ordersService.saveOrder({ ...current, status, updatedAt: new Date().toISOString() }); },
  updatePaymentStatus: async (id: string, paymentStatus: PaymentStatus): Promise<ApiResponse<Order>> => { const patched = await patchInternalOrder(id, { paymentStatus, status: adminPaymentToInternal(paymentStatus) }); if (patched) return ok(patched); const current = readStore().find((order) => order.id === id) ?? ordersStore[0]; return ordersService.saveOrder({ ...current, paymentStatus, updatedAt: new Date().toISOString() }); },
  adminPaymentAction: async (id: string, body: { action: AdminPaymentAction; note?: string; reference?: string; amountMinor?: number; actor?: string; paymentProvider?: string; reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'; storefrontUrl?: string; successUrl?: string; cancelUrl?: string; customerEmail?: string }): Promise<ApiResponse<Order> & { paymentUrl?: string; session?: any }> => { const result = await paymentAction(id, body); if (result.order) return { ...ok(result.order), paymentUrl: result.paymentUrl, session: result.session }; const current = readStore().find((order) => order.id === id) ?? ordersStore[0]; const paymentStatus: PaymentStatus = body.action === 'mark-paid' ? 'paid' : body.action === 'mark-failed' ? 'failed' : body.action === 'mark-refunded' ? 'refunded' : body.action === 'stripe-refund' ? 'refund-pending' : body.action === 'create-payment-link' ? 'pending' : current.paymentStatus; return { ...await ordersService.saveOrder({ ...current, paymentStatus, refundNote: body.note || current.refundNote, updatedAt: new Date().toISOString() }), paymentUrl: result.paymentUrl, session: result.session }; },
  updateProductionStage: async (id: string, productionStage: ProductionStage): Promise<ApiResponse<Order>> => { const patched = await patchInternalOrder(id, { productionStage }); if (patched) return ok(patched); const current = readStore().find((order) => order.id === id) ?? ordersStore[0]; return ordersService.saveOrder({ ...current, productionStage, updatedAt: new Date().toISOString() }); },
  addNote: async (id: string, note: string): Promise<ApiResponse<Order>> => { const currentInternal = await tryInternalOrder(id); if (currentInternal) { const patched = await patchInternalOrder(id, { notes: [...(currentInternal.notes || []), note].join('\n'), internalNotes: [...(currentInternal.notes || []), note] }); if (patched) return ok(patched); } const current = readStore().find((order) => order.id === id) ?? ordersStore[0]; return ordersService.saveOrder({ ...current, notes: [...(current.notes || []), note], updatedAt: new Date().toISOString() }); },
};
