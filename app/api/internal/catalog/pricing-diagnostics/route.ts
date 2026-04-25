import { NextResponse } from 'next/server';
import { getInternalCatalogRecord } from '../../../../../src/core/catalog/internal-catalog.service';
import { buildPricingDiagnostics } from '../../../../../src/core/catalog/pricing-diagnostics';
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
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 1;
}

function selectionsFromUrl(request: Request): Record<string, unknown> {
  const url = new URL(request.url);
  const selections: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    if (key.startsWith('select.')) selections[key.replace(/^select\./, '')] = value;
  });
  return selections;
}

function normaliseQuantity(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 1;
}

export async function GET(request: Request) {
  try {
    const productId = productIdFromUrl(request);
    if (!productId) return NextResponse.json({ ok: false, error: 'productId or productSlug is required.' }, { status: 400 });
    const quantity = quantityFromUrl(request);
    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const diagnostics = buildPricingDiagnostics({ product, selections: selectionsFromUrl(request), quantity });
    return NextResponse.json({ ok: true, source: 'internal-pricing-diagnostics-v218', data: diagnostics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing diagnostics failed.';
    return NextResponse.json({ ok: false, source: 'internal-pricing-diagnostics-v218', error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const productId = body.productId || body.productSlug;
    if (!productId) return NextResponse.json({ ok: false, error: 'productId or productSlug is required.' }, { status: 400 });
    const quantity = normaliseQuantity(body.quantity);
    const product = await getInternalCatalogRecord(tenantContextFromRequest(request), 'products', productId);
    const diagnostics = buildPricingDiagnostics({ product, selections: body.selections || {}, quantity });
    return NextResponse.json({ ok: true, source: 'internal-pricing-diagnostics-v218', data: diagnostics });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing diagnostics failed.';
    return NextResponse.json({ ok: false, source: 'internal-pricing-diagnostics-v218', error: message }, { status: 500 });
  }
}
