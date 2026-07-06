import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { calculateNativeStorefrontPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';

export const dynamic = 'force-dynamic';

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function number(value: FormDataEntryValue | null, fallback = 0) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback; }
function parseJson(value: string): NativeSelectedOptionRow[] { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed as NativeSelectedOptionRow[] : []; } catch { return []; } }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function productName(product: Record<string, any>, fallback: string) { return String(product.name || product.title || product.metadataJson?.name || product.metadataJson?.title || fallback); }

function taxPatch(price: Awaited<ReturnType<typeof calculateNativeStorefrontPrice>>) {
  return {
    ...(price.taxSettings ? { taxSettings: price.taxSettings } : {}),
    ...(price.vatRate !== undefined && price.vatRate !== null ? { vatRate: price.vatRate } : {}),
  };
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const tenantSlug = slug(clean(form.get('tenantSlug')));
    const storeSlug = slug(clean(form.get('storeSlug')));
    const productSlug = slug(clean(form.get('productSlug')));
    const categorySlug = slug(clean(form.get('categorySlug')));
    const productTitle = clean(form.get('productTitle')) || productSlug;
    const customerName = clean(form.get('customerName'));
    const customerEmail = clean(form.get('customerEmail'));
    const customerPhone = clean(form.get('customerPhone'));
    const artworkStatus = clean(form.get('artworkStatus')) || 'send-later';
    const selectedOptions = parseJson(clean(form.get('selectedOptions')));
    const requestedQuantity = Math.max(1, number(form.get('quantity'), 1));

    if (!tenantSlug || !storeSlug || !productSlug || !customerName || !customerEmail) return NextResponse.json({ ok: false, error: 'Missing checkout customer or product details.' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const storeBase = `/native-stores/${tenantSlug}/${storeSlug}`;
    const tenantRequest = tenantScopedRequest(request, tenantSlug);
    const price = await calculateNativeStorefrontPrice({ request: tenantRequest, tenantSlug, productSlug, selectedOptions, quantity: requestedQuantity });
    const orderNumber = `WEB-${Date.now()}`;
    const lineQuantity = price.quantity;
    const finalPriceMinor = price.finalPriceMinor;
    const unitPriceMinor = Math.max(1, Math.round(finalPriceMinor / lineQuantity));
    const resolvedProductTitle = productName(price.product, productTitle);
    const backendTax = taxPatch(price);

    const order = await saveOrder(tenantRequest, {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
      currency: price.currency,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'pending',
      paymentProvider: 'stripe',
      payment_method: 'Pay now by card',
      source: 'native-storefront',
      storeName: storeSlug,
      notes: `Native storefront online order. Artwork: ${artworkStatus}.`,
      internalNotes: [
        `Created from native storefront ${tenantSlug}/${storeSlug}.`,
        `Artwork status: ${artworkStatus}.`,
        'Checkout price calculated by backend pricing engine from selected options and quantity.',
        'Tax/VAT handled from backend admin product tax settings and global tax rules.',
      ],
      items: [{
        id: `${productSlug}-${Date.now()}`,
        productId: productSlug,
        productName: resolvedProductTitle,
        titleSnapshot: resolvedProductTitle,
        quantity: lineQuantity,
        unitPriceMinor,
        totalPriceMinor: finalPriceMinor,
        categorySlug,
        productSlug,
        selectedOptions,
        artworkStatus,
        sku: price.matchedRow.sku || price.matchedRow.oldSku || '',
        resolverSnapshot: {
          source: 'native-storefront-saas-pricing-engine',
          product: { id: price.product.id, slug: price.product.slug, name: resolvedProductTitle, taxSettings: price.taxSettings || null },
          selections: price.resolvedConfig.selections,
          selectedQuantity: price.resolvedConfig.selectedQuantity,
          selectedDelivery: price.resolvedConfig.selectedDelivery,
          matchedRow: price.matchedRow,
          priceMinor: finalPriceMinor,
          vatRate: price.vatRate ?? null,
        },
        ...backendTax,
      }],
      rawCheckout: {
        tenantSlug,
        storeSlug,
        categorySlug,
        productSlug,
        productTitle: resolvedProductTitle,
        quantity: lineQuantity,
        selectedOptions,
        requestedQuantity,
        calculatedFinalPriceMinor: finalPriceMinor,
        pricingSource: price.pricingSource,
        backendTaxSettings: price.taxSettings || null,
        backendVatRate: price.vatRate ?? null,
        resolvedConfig: price.resolvedConfig,
      },
    });

    const successUrl = `${origin}${storeBase}/checkout-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${storeBase}/cart?product=${encodeURIComponent(productSlug)}&category=${encodeURIComponent(categorySlug)}&payment=cancel`;
    const sessionResult = await createStripeCheckoutSession(tenantRequest, { orderId: order.id, customerEmail, successUrl, cancelUrl });
    const paymentUrl = sessionResult.session?.url;
    if (!paymentUrl) return NextResponse.json({ ok: false, error: 'Stripe did not return a payment URL.' }, { status: 500 });
    return NextResponse.redirect(paymentUrl, { status: 303 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'native-storefront-checkout', error: error instanceof Error ? error.message : 'Checkout failed.' }, { status: 500 });
  }
}
