import { requirePublicApiCredentials } from '@/core/api/public-api-auth';
import { publicFail, publicJson, readListParams } from '@/core/api/public-api-routing';
import { listOrders } from '@/core/orders/order.service';
import { createOrder } from '@/lib/services/orders';
import { hasDatabaseUrl } from '@/lib/api/db-env';
import type { CreateOrderRequest } from '@/types/api-dtos';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = requirePublicApiCredentials(request, ['orders:read']);
  if (!auth.ok) return auth.response;
  const data = await listOrders({ tenantId: auth.context.tenantId, siteId: auth.context.siteId }, readListParams(request));
  return publicJson(data);
}

export async function POST(request: Request) {
  const auth = requirePublicApiCredentials(request, ['orders:write']);
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Partial<CreateOrderRequest> | null;
  if (!body?.currency || !Array.isArray(body.items) || !body.items.length) return publicFail('INVALID_ORDER_INPUT', 'currency and at least one item are required.', 400);
  if (!hasDatabaseUrl()) return publicFail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  const order = await createOrder({ ...body, tenantId: auth.context.tenantId, currency: body.currency, items: body.items } as CreateOrderRequest);
  return publicJson({ orderNumber: order.orderNumber, tenantId: order.tenantId, status: order.status, currency: order.currency, subtotalMinor: order.subtotalMinor, shippingMinor: order.shippingMinor, taxMinor: order.taxMinor, totalMinor: order.totalMinor }, { status: 201 });
}
