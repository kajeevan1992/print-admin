import { NextRequest, NextResponse } from 'next/server';
import { calculateNativeStorefrontPrice, formatMinorPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function arrayValue(value: unknown): NativeSelectedOptionRow[] { return Array.isArray(value) ? value as NativeSelectedOptionRow[] : []; }
function objectOptionsToRows(value: unknown): NativeSelectedOptionRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .map(([key, optionValue]) => ({ key, label: key, value: String(optionValue || ''), slug: String(optionValue || '') }))
    .filter((row) => row.value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const tenantSlug = slug(body.tenantSlug || body.tenantId || new URL(request.url).searchParams.get('tenantId') || '');
    const productSlug = slug(body.productSlug || body.productId || body.slug || '');
    const selectedOptions = arrayValue(body.selectedOptions).length ? arrayValue(body.selectedOptions) : objectOptionsToRows(body.options || body.selections);
    const quantity = body.quantity || body.qty || 1;
    const delivery = clean(body.delivery || body.selectedDelivery || body.turnaround || '');

    if (!tenantSlug || !productSlug) {
      return NextResponse.json({ ok: false, source: 'internal-storefront-price', error: 'Missing tenantSlug/tenantId or productSlug/productId.' }, { status: 400 });
    }

    const price = await calculateNativeStorefrontPrice({
      request: tenantScopedRequest(request, tenantSlug),
      tenantSlug,
      productSlug,
      selectedOptions,
      quantity,
      delivery: delivery || null,
      customSize: body.customSize || body.size || null,
    });

    return NextResponse.json({
      ok: true,
      source: 'internal-storefront-price',
      data: {
        product: {
          id: price.product.id,
          slug: price.product.slug,
          name: price.product.name || price.product.title || productSlug,
        },
        currency: price.currency,
        quantity: price.quantity,
        netMinor: price.netPriceMinor,
        vatRate: price.vatRate,
        vatClass: price.vatClass,
        vatReason: price.vatReason,
        vatMinor: price.vatMinor,
        grossMinor: price.finalPriceMinor,
        finalPriceMinor: price.finalPriceMinor,
        formattedPrice: formatMinorPrice(price.finalPriceMinor, price.currency),
        pricingSource: price.pricingSource,
        selectedOptions: price.selectedOptions,
        selections: price.resolvedConfig.selections,
        selectedDelivery: price.resolvedConfig.selectedDelivery,
        sku: price.matchedRow?.sku || price.matchedRow?.oldSku || '',
        taxSettings: price.taxSettings || null,
        taxLine: price.taxLine,
        matchedRow: price.matchedRow,
        resolvedConfig: price.resolvedConfig,
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      source: 'internal-storefront-price',
      error: error instanceof Error ? error.message : 'Storefront price could not be calculated.',
    }, { status: 500 });
  }
}
