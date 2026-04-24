import { fail, ok } from '@/lib/api/responses';
import { listProducts } from '@/lib/services/products';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? undefined;

  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const products = await listProducts(tenantId);

  return ok(
    products.map((product) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      subtitle: product.subtitle,
      productType: product.productType,
      priceFromMinor: product.priceFromMinor,
      currency: product.currency,
    }))
  );
}
