import { ordersMock } from '@/data/orders';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Order, OrderStatus, PaymentStatus, ProductionStage } from '@/modules/orders/types';

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

export const ordersService = {
  listOrders: async (params?: { search?: string; status?: OrderStatus | 'all' }): Promise<PaginatedResponse<Order>> => {
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
    const order = readStore().find((item) => item.id === id);
    if (!order) throw new Error('Order not found');
    return ok(order);
  },

  updateOrderStatus: async (id: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
    await wait();
    const order = readStore().find((item) => item.id === id);
    if (!order) throw new Error('Order not found');
    const updated: Order = {
      ...order,
      status,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      activity: [
        {
          id: `act-${Date.now()}`,
          label: 'Order status updated',
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          tone: 'warning',
          description: `Status changed to ${status}.`
        },
        ...order.activity
      ]
    };
    writeStore(readStore().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  },

  updateProductionStage: async (id: string, productionStage: ProductionStage): Promise<ApiResponse<Order>> => {
    await wait();
    const order = readStore().find((item) => item.id === id);
    if (!order) throw new Error('Order not found');
    const updated: Order = {
      ...order,
      productionStage,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      activity: [
        {
          id: `act-${Date.now()}`,
          label: 'Production stage updated',
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          tone: 'warning',
          description: `Production stage moved to ${productionStage}.`
        },
        ...order.activity
      ]
    };
    writeStore(readStore().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  },

  updatePaymentStatus: async (id: string, paymentStatus: PaymentStatus): Promise<ApiResponse<Order>> => {
    await wait();
    const order = readStore().find((item) => item.id === id);
    if (!order) throw new Error('Order not found');
    const updated: Order = {
      ...order,
      paymentStatus,
      updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      activity: [
        {
          id: `act-${Date.now()}`,
          label: 'Payment status updated',
          timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
          tone: paymentStatus === 'paid' ? 'success' : 'warning',
          description: `Payment status changed to ${paymentStatus}.`
        },
        ...order.activity
      ]
    };
    writeStore(readStore().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  },

  addNote: async (id: string, note: string): Promise<ApiResponse<Order>> => {
    await wait();
    const trimmed = note.trim();
    const order = readStore().find((item) => item.id === id);
    if (!order) throw new Error('Order not found');
    if (!trimmed) return ok(order);
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const updated: Order = {
      ...order,
      notes: [trimmed, ...order.notes],
      updatedAt: timestamp,
      activity: [
        {
          id: `act-${Date.now()}`,
          label: 'Internal note added',
          timestamp,
          tone: 'default',
          description: trimmed
        },
        ...order.activity
      ]
    };
    writeStore(readStore().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  }
};
