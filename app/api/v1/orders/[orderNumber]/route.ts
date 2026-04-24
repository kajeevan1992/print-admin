import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { publicFail, publicJson } from '@/core/api/public-api-routing';
import { getOrderByNumber } from '@/lib/services/orders';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: { orderNumber: string } }) {
  const auth = requirePublicApiCredentials(request, ['orders:read']);
  if (!auth.ok) return auth.response;
  if (!hasDatabaseUrl()) return publicFail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  const order = await getOrderByNumber(params.orderNumber);
  if (!order || order.tenantId !== auth.context.tenantId) return publicFail('ORDER_NOT_FOUND', 'Order was not found for this API tenant.', 404);
  return publicJson(order);
}
