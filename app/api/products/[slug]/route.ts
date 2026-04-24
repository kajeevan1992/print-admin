import { fail, ok } from '@/lib/api/responses';
import { getProductBySlug } from '@/lib/services/products';
import { hasDatabaseUrl } from '@/lib/api/db-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, context: { params: { slug: string } }) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? undefined;

  if (!hasDatabaseUrl()) {
    return fail('DATABASE_NOT_CONFIGURED', 'DATABASE_URL is not configured.', 503);
  }

  const product = await getProductBySlug(context.params.slug, tenantId);

  if (!product) {
    return fail('PRODUCT_NOT_FOUND', 'No product matched the requested slug.', 404);
  }

  return ok({
    id: product.id,
    slug: product.slug,
    title: product.title,
    subtitle: product.subtitle,
    productType: product.productType,
    priceFromMinor: product.priceFromMinor,
    currency: product.currency,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      priceMinor: variant.priceMinor,
      currency: variant.currency,
    })),
  });
}
