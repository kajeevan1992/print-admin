import { fail, ok } from '@/lib/api/responses';
import { createOrder } from '@/lib/services/orders';
import type { CreateOrderRequest } from '@/types/api-dtos';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as CreateOrderRequest | null;

  if (!body?.tenantId || !body?.currency || !Array.isArray(body.items) || !body.items.length) {
    return fail('INVALID_ORDER_INPUT', 'tenantId, currency, and at least one item are required.', 400);
  }

  const order = await createOrder(body);

  return ok({
    orderNumber: order.orderNumber,
    tenantId: order.tenantId,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
  });
}
