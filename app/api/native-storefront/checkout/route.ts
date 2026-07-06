import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';

export const dynamic = 'force-dynamic';

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function number(value: FormDataEntryValue | null, fallback = 0) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback; }
function parseJson(value: string) { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }

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
    const quantity = Math.max(1, number(form.get('quantity'), 1));
    const unitPriceMinor = number(form.get('unitPriceMinor'));
    const selectedOptions = parseJson(clean(form.get('selectedOptions')));
    const hasSelectedOptions = selectedOptions.length > 0;

    if (!tenantSlug || !storeSlug || !productSlug || !customerName || !customerEmail) return NextResponse.json({ ok: false, error: 'Missing checkout customer or product details.' }, { status: 400 });
    if (hasSelectedOptions) return NextResponse.json({ ok: false, error: 'Online payment is blocked for option-priced products until the server-side SaaS pricing calculation is connected. This prevents charging the base/from price by mistake.' }, { status: 400 });
    if (!unitPriceMinor || unitPriceMinor <= 0) return NextResponse.json({ ok: false, error: 'This product needs a valid server-calculated price before online payment can start.' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const storeBase = `/native-stores/${tenantSlug}/${storeSlug}`;
    const tenantRequest = tenantScopedRequest(request, tenantSlug);
    const orderNumber = `WEB-${Date.now()}`;
    const totalPriceMinor = unitPriceMinor * quantity;
    const order = await saveOrder(tenantRequest, {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      customer: { name: customerName, email: customerEmail, phone: customerPhone },
      currency: 'GBP',
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'pending',
      paymentProvider: 'stripe',
      payment_method: 'Pay now by card',
      source: 'native-storefront',
      storeName: storeSlug,
      notes: `Native storefront online order. Artwork: ${artworkStatus}.`,
      internalNotes: [`Created from native storefront ${tenantSlug}/${storeSlug}.`, `Artwork status: ${artworkStatus}.`, 'Checkout price accepted only because no product option pricing was present.'],
      items: [{
        id: `${productSlug}-${Date.now()}`,
        productId: productSlug,
        productName: productTitle,
        titleSnapshot: productTitle,
        quantity,
        unitPriceMinor,
        totalPriceMinor,
        categorySlug,
        productSlug,
        selectedOptions,
        artworkStatus,
        taxSettings: { taxClass: 'zero', vatRate: 0, preset: 'holo-not-vat-registered' },
        vatRate: 0,
        vatClass: 'zero',
      }],
      rawCheckout: { tenantSlug, storeSlug, categorySlug, productSlug, productTitle, quantity, unitPriceMinor, selectedOptions, artworkStatus, pricingSource: 'static-no-options-only' },
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
