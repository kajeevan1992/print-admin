import { ordersMock } from '@/data/orders';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Order, OrderStatus } from '@/modules/orders/types';

let ordersStore: Order[] = [...ordersMock];
const STORAGE_KEY = 'print-admin-orders-store';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 80));

function readStore(): Order[] {
  if (typeof window === 'undefined') return ordersStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ordersStore;
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : ordersStore;
  } catch {
    return ordersStore;
  }
}

function writeStore(next: Order[]) {
  ordersStore = next;
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function sortByUpdated(items: Order[]) {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function tryLiveOrders(params?: { search?: string; status?: OrderStatus | 'all' }): Promise<Order[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/proxy/admin-orders', { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) return null;
    const raw = payload?.data?.items || payload?.data || payload?.payload?.data || payload?.payload || [];
    if (!Array.isArray(raw)) return null;
    const term = params?.search?.trim().toLowerCase();
    return sortByUpdated(raw.map((o: any, index: number) => ({
      id: o.id || o.orderNumber || `ord-${index + 1}`,
      orderNumber: o.orderNumber || o.id || `ORD-${index + 1}`,
      customerName: o.customerName || 'Customer',
      organizationName: o.organizationName || o.tenant?.name || '',
      customerEmail: o.email || '',
      createdAt: o.createdAt || o.submittedAt || new Date().toISOString(),
      updatedAt: o.updatedAt || o.createdAt || o.submittedAt || new Date().toISOString(),
      dueDate: o.dueDate || o.submittedAt || new Date().toISOString(),
      status: (['draft','pending','approved','in-production','shipped','completed','cancelled'].includes(o.status) ? o.status : (o.status === 'artwork-review' ? 'pending' : o.status === 'awaiting-approval' ? 'approved' : o.status === 'ready-to-dispatch' ? 'shipped' : 'in-production')) as OrderStatus,
      paymentStatus: 'paid',
      productionStage: 'printing',
      total: typeof o.totalMinor === 'number' ? o.totalMinor / 100 : 0,
      currency: o.currency || 'GBP',
      itemCount: Array.isArray(o.items) ? o.items.length : 0,
      storeName: o.tenant?.name || '',
      shippingMethod: '',
      shippingAddress: '',
      billingAddress: '',
      trackingNumber: '',
      notes: [],
      items: Array.isArray(o.items) ? o.items.map((item:any, i:number) => ({
        id: item.id || `${o.id || index}-item-${i}`,
        productId: item.productId || item.id || `prod-${i}`,
        productName: item.productName || item.name || 'Order item',
        sku: '',
        quantity: item.quantity || 1,
        unitPrice: typeof item.unitPriceMinor === 'number' ? item.unitPriceMinor / 100 : 0,
        totalPrice: typeof item.lineTotalMinor === 'number' ? item.lineTotalMinor / 100 : 0,
        thumbnail: ''
      })) : [],
      activity: []
    }))).filter((order) => {
      const matchesSearch = !term || [order.orderNumber, order.customerName, order.organizationName, order.customerEmail].join(' ').toLowerCase().includes(term);
      const matchesStatus = !params?.status || params.status === 'all' || order.status === params.status;
      return matchesSearch && matchesStatus;
    });
  } catch {
    return null;
  }
}

export const ordersService = {
  listOrders: async (params?: { search?: string; status?: OrderStatus | 'all' }): Promise<PaginatedResponse<Order>> => {
    const live = await tryLiveOrders(params);
    if (live) return okPaginated(live, { page: 1, perPage: Math.max(1, live.length), total: live.length, totalPages: 1 });

    await wait();
    const term = params?.search?.trim().toLowerCase();
    const items = sortByUpdated(
      readStore().filter((order) => {
        const matchesSearch = !term || [order.orderNumber, order.customerName, order.organizationName, order.customerEmail].join(' ').toLowerCase().includes(term);
        const matchesStatus = !params?.status || params.status === 'all' || order.status === params.status;
        return matchesSearch && matchesStatus;
      })
    );
    return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
  },
  getOrder: async (id: string): Promise<ApiResponse<Order>> => {
    await wait();
    const item = readStore().find((order) => order.id === id) ?? ordersStore[0];
    return ok(item);
  },
  saveOrder: async (order: Order): Promise<ApiResponse<Order>> => {
    await wait();
    const items = readStore();
    const next = items.some((item) => item.id === order.id) ? items.map((item) => (item.id === order.id ? order : item)) : [order, ...items];
    writeStore(next);
    return ok(order);
  }
};
