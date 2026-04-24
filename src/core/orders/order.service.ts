import { prisma } from '@/lib/prisma';
import { hasDatabaseUrl } from '@/lib/api/db-env';
import type { TenantContext } from '../tenant/types';

type ListOptions = { search?: string; page?: number; limit?: number };

function containsSearch(search?: string) {
  const q = search?.trim();
  if (!q) return {};
  return { OR: [{ orderNumber: { contains: q, mode: 'insensitive' as const } }, { notes: { contains: q, mode: 'insensitive' as const } }] };
}

export async function listOrders(ctx: TenantContext, options: ListOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  if (!hasDatabaseUrl()) {
    return { items: [], pagination: { page, limit, total: 0, totalPages: 0 }, source: 'internal-core' as const, databaseConfigured: false };
  }
  const where = { tenantId: ctx.tenantId, ...containsSearch(options.search) };
  const [items, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: { items: true, statusHistory: true, artworks: true } }),
    prisma.order.count({ where }),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, source: 'internal-core' as const, databaseConfigured: true };
}

export async function getOrder(_ctx: TenantContext, _orderId: string) { return null; }
export async function updateOrderStatus(_ctx: TenantContext, _orderId: string, _status: string) { return { ok: true }; }
