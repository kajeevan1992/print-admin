import { fail, ok } from '@/lib/api/responses';
import { listProducts } from '@/lib/services/products';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? undefined;

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
