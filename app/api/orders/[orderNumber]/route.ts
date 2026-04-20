import { fail, ok } from '@/lib/api/responses';
import { getOrderByNumber } from '@/lib/services/orders';

export async function GET(
  _request: Request,
  context: { params: { orderNumber: string } }
) {
  const order = await getOrderByNumber(context.params.orderNumber);

  if (!order) {
    return fail('ORDER_NOT_FOUND', 'No order matched the requested order number.', 404);
  }

  return ok(order);
}
