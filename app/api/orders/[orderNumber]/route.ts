import { fail, ok } from '@/lib/api/responses';
import { getOrderByNumber } from '@/lib/services/orders';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: Request, context: { params: { orderNumber: string } }) {
  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const order = await getOrderByNumber(context.params.orderNumber);

  if (!order) {
    return fail('ORDER_NOT_FOUND', 'No order matched the requested order number.', 404);
  }

  return ok(order);
}
