import type { TenantContext } from '../tenant/types';

const now = () => new Date().toISOString();

export async function listOrders(_ctx: TenantContext) {
  return {
    items: [
      {
        id: 'ord-32018',
        orderNumber: 'ORD-32018',
        customerName: 'Northwind Office',
        organizationName: 'Northwind Office',
        email: 'ops@northwindoffice.example',
        status: 'in-production',
        totalMinor: 482000,
        currency: 'GBP',
        createdAt: now(),
        updatedAt: now(),
        tenant: { name: 'Platform Demo' },
        items: [{ id: 'li-1', productName: 'Premium Catalog A4', quantity: 1, unitPriceMinor: 482000, lineTotalMinor: 482000 }],
      },
      {
        id: 'ord-32024',
        orderNumber: 'ORD-32024',
        customerName: 'Acme Office',
        organizationName: 'Acme Office',
        email: 'studio@acmeoffice.example',
        status: 'artwork-review',
        totalMinor: 96000,
        currency: 'GBP',
        createdAt: now(),
        updatedAt: now(),
        tenant: { name: 'Platform Demo' },
        items: [{ id: 'li-2', productName: 'Matte Business Card', quantity: 1, unitPriceMinor: 96000, lineTotalMinor: 96000 }],
      },
    ],
    source: 'internal-core' as const,
  };
}

export async function getOrder(_ctx: TenantContext, _orderId: string) {
  return null;
}

export async function updateOrderStatus(_ctx: TenantContext, _orderId: string, _status: string) {
  return { ok: true };
}
