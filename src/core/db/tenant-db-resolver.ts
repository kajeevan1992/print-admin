import type { TenantContext } from '../tenant/types';
import { getTenantPrisma } from './tenant-prisma';

export async function resolveTenantDb(ctx: TenantContext) {
  const resolved = await getTenantPrisma(ctx);
  return {
    ok: resolved.ok,
    message: resolved.message,
    connectionId: resolved.connection?.id,
    tenantId: resolved.connection?.tenantId || ctx.tenantId,
    siteId: resolved.connection?.siteId || ctx.siteId,
  };
}
