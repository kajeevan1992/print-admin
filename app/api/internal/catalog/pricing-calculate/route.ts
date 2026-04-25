import { NextResponse } from 'next/server';
import { getInternalCatalogRecord } from '../../../../../src/core/catalog/internal-catalog.service';
import { calculatePricingPreview } from '../../../../../src/core/catalog/pricing-engine';
import { tenantContextFromRequest } from '../../../../../src/core/tenant/context';

export const dynamic = 'force-dynamic';

type Body = {
  productId?: string;
  productSlug?: string;
  selections?: Record<string, unknown>;
  quantity?: number;
};

function productIdFromUrl(request: Request) {
  const url = new URL(request.url);
  return url.searchParams.get('productId') || url.searchParams.get('productSlug') || url.searchParams.get('slug') || '';
}

function quantityFromUrl(request: Request) {
  const url = new URL(request.url);
  const value = Number(url.searchParams.get('quantity') || '');
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export async function GET(request: Request) {
  try {
    const productId = productIdFromUrl(request);
    if (!productId) return NextResponse.json({ ok: false, error: 'productId or productSlug is required.' }, { status: 400 });
    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const payload = calculatePricingPreview({ product, selections: {}, quantity: quantityFromUrl(request) });
    return NextResponse.json({ ok: true, source: 'internal-pricing-foundation', data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing calculation preview failed.';
    return NextResponse.json({ ok: false, source: 'internal-pricing-foundation', error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const productId = body.productId || body.productSlug;
    if (!productId) return NextResponse.json({ ok: false, error: 'productId or productSlug is required.' }, { status: 400 });
    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const payload = calculatePricingPreview({ product, selections: body.selections || {}, quantity: body.quantity });
    return NextResponse.json({ ok: true, source: 'internal-pricing-foundation', data: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing calculation preview failed.';
    return NextResponse.json({ ok: false, source: 'internal-pricing-foundation', error: message }, { status: 500 });
  }
}
