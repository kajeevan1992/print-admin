import { NextResponse } from 'next/server';
import { getInternalCatalogRecord } from '../../../../../src/core/catalog/internal-catalog.service';
import { buildPricingQuoteInputPayload } from '../../../../../src/core/catalog/pricing-quote-input';
import { tenantContextFromRequest } from '../../../../../src/core/tenant/context';

export const dynamic = 'force-dynamic';

type Body = {
  productId?: string;
  productSlug?: string;
  selections?: Record<string, unknown>;
};

function productIdFromUrl(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('productId') || url.searchParams.get('productSlug') || url.searchParams.get('slug') || '';
}

export async function GET(request: Request) {
  try {
    const productId = productIdFromUrl(request);
    if (!productId) return NextResponse.json({ ok: false, error: 'productId or productSlug is required.' }, { status: 400 });
    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const payload = buildPricingQuoteInputPayload(product, {});
    return NextResponse.json({ ok: true, source: 'internal-core-db', data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing quote input payload failed.';
    return NextResponse.json({ ok: false, source: 'internal-core', error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const productId = body.productId || body.productSlug;
    if (!productId) return NextResponse.json({ ok: false, error: 'productId or productSlug is required.' }, { status: 400 });
    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const payload = buildPricingQuoteInputPayload(product, body.selections || {});
    return NextResponse.json({ ok: true, source: 'internal-core-db', data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing quote input payload failed.';
    return NextResponse.json({ ok: false, source: 'internal-core', error: message }, { status: 500 });
  }
}
