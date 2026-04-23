import type { TenantContext } from '../tenant/types';

export async function listOrders(_ctx: TenantContext) {
  return { items: [], source: 'internal-core' as const };
}

export async function getOrder(_ctx: TenantContext, _orderId: string) {
  return null;
}

export async function updateOrderStatus(_ctx: TenantContext, _orderId: string, _status: string) {
  return { ok: true };
}
