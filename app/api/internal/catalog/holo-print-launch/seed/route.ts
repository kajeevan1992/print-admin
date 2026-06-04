import { NextResponse } from 'next/server';
import { tenantContextFromRequest } from '@/core/tenant/context';
import { writeInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { holoPrintLaunchCategories, holoPrintLaunchProducts } from '@/data/holo-print-launch-catalogue';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ctx = tenantContextFromRequest(request);
    const categories = [];
    const products = [];

    for (const category of holoPrintLaunchCategories) {
      categories.push(await writeInternalCatalogRecord(ctx, 'categories', category, 'upsert'));
    }

    for (const product of holoPrintLaunchProducts) {
      products.push(await writeInternalCatalogRecord(ctx, 'products', product, 'upsert'));
    }

    return NextResponse.json({
      ok: true,
      source: 'holo-print-launch-catalogue-seed',
      data: {
        categories,
        products,
        categoryCount: categories.length,
        productCount: products.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'holo-print-launch-catalogue-seed', error: error instanceof Error ? error.message : 'Failed to seed Holo Print launch catalogue.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: 'holo-print-launch-catalogue-seed',
    data: {
      message: 'POST to this endpoint to seed the Holo Print launch catalogue.',
      categories: holoPrintLaunchCategories.map((item) => ({ id: item.id, slug: item.slug, name: item.name })),
      products: holoPrintLaunchProducts.map((item) => ({ id: item.id, slug: item.slug, name: item.name, categorySlug: item.categorySlug, priceFromMinor: item.priceFromMinor, paymentMode: item.metadataJson?.paymentMode, taxSettings: item.metadataJson?.taxSettings })),
    },
  });
}
