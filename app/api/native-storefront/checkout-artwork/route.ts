import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { createStorefrontArtworkIntake } from '@/core/storefront/artwork-intake.service';
import { calculateNativeStorefrontPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';

export const dynamic = 'force-dynamic';

function text(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function num(value: FormDataEntryValue | null, fallback = 1) { const next = Number(value); return Number.isFinite(next) && next > 0 ? Math.round(next) : fallback; }
function jsonArray(value: string): NativeSelectedOptionRow[] { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed as NativeSelectedOptionRow[] : []; } catch { return []; } }
function jsonObject(value: string) { try { const parsed = JSON.parse(value || 'null'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : null; } catch { return null; } }
function tenantRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function uploaded(value: FormDataEntryValue | null) { return value && typeof value !== 'string' && value.name && value.size > 0 ? value as File : null; }
function fileMeta(file: File | null) { return file ? { fileName: file.name, sizeBytes: file.size, mimeType: file.type || 'application/octet-stream', uploadedAt: new Date().toISOString() } : null; }
function productName(product: Record<string, any>, fallback: string) { return String(product.name || product.title || product.metadataJson?.name || product.metadataJson?.title || fallback); }
function taxPatch(price: Awaited<ReturnType<typeof calculateNativeStorefrontPrice>>) { return { ...(price.taxSettings ? { taxSettings: price.taxSettings } : {}), ...(price.vatRate !== undefined && price.vatRate !== null ? { vatRate: price.vatRate } : {}) }; }
function artworkLabel(status: string) { if (status === 'ready') return 'Artwork uploaded now'; if (status === 'need-design') return 'Customer needs design help'; return 'Customer will send artwork later'; }

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const tenantSlug = slug(text(form.get('tenantSlug')));
    const storeSlug = slug(text(form.get('storeSlug')));
    const productSlug = slug(text(form.get('productSlug')));
    const categorySlug = slug(text(form.get('categorySlug')));
    const productTitle = text(form.get('productTitle')) || productSlug;
    const customerName = text(form.get('customerName'));
    const customerEmail = text(form.get('customerEmail'));
    const customerPhone = text(form.get('customerPhone'));
    const artworkStatus = text(form.get('artworkStatus')) || 'send-later';
    const artworkNotes = text(form.get('artworkNotes'));
    const selectedDelivery = text(form.get('delivery')) || text(form.get('selectedDelivery')) || text(form.get('turnaround'));
    const selectedOptions = jsonArray(text(form.get('selectedOptions')));
    const priceSnapshot = jsonObject(text(form.get('priceSnapshot')));
    const artworkUpload = uploaded(form.get('artworkFile'));
    const requestedQuantity = num(form.get('quantity'), 1);

    if (!tenantSlug || !storeSlug || !productSlug || !customerName || !customerEmail) {
      return NextResponse.json({ ok: false, error: 'Missing checkout customer or product details.' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    const storeBase = `/native-stores/${tenantSlug}/${storeSlug}`;
    const scopedRequest = tenantRequest(request, tenantSlug);
    const price = await calculateNativeStorefrontPrice({ request: scopedRequest, tenantSlug, productSlug, selectedOptions, quantity: requestedQuantity, delivery: selectedDelivery || null });
    const orderNumber = `WEB-${Date.now()}`;
    const lineQuantity = price.quantity;
    const finalPriceMinor = price.finalPriceMinor;
    const title = productName(price.product, productTitle);

    const artworkIntake = await createStorefrontArtworkIntake({ request: scopedRequest, tenantSlug, storeSlug, orderNumber, productSlug, productTitle: title, categorySlug, customerName, customerEmail, artworkStatus, artworkNotes, artworkFile: artworkUpload }).catch((error) => ({
      intakeId: null,
      intakeSlug: null,
      resource: 'storefront-artwork-intake',
      status: artworkStatus,
      fileStored: false,
      fileStorageStatus: 'intake-create-failed',
      preflightStatus: 'not-started',
      error: error instanceof Error ? error.message : 'Artwork intake record could not be created.',
    }));

    const snapshotTotal = Number(priceSnapshot?.finalPriceMinor ?? priceSnapshot?.grossMinor ?? 0);
    const priceSnapshotAudit = { provided: Boolean(priceSnapshot), matched: Number.isFinite(snapshotTotal) && Math.abs(snapshotTotal - finalPriceMinor) <= 1, snapshotTotalMinor: Number.isFinite(snapshotTotal) ? Math.round(snapshotTotal) : 0, backendTotalMinor: finalPriceMinor };
    const artworkSnapshot = { status: artworkStatus, label: artworkLabel(artworkStatus), notes: artworkNotes, file: fileMeta(artworkUpload), intake: artworkIntake, requiresFollowUp: artworkStatus !== 'ready' || !artworkIntake.fileStored, preflightStatus: artworkIntake.preflightStatus || 'not-started', source: 'native-storefront-checkout-artwork' };

    const order = await saveOrder(scopedRequest, {
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
      notes: `Native storefront online order. Artwork: ${artworkSnapshot.label}.${artworkNotes ? ` Notes: ${artworkNotes}` : ''}`,
      internalNotes: [`Created from native storefront ${tenantSlug}/${storeSlug}.`, `Artwork intake: ${artworkIntake.intakeId || 'not created'}.`, `Artwork storage: ${artworkIntake.fileStorageStatus}.`, selectedDelivery ? `Delivery/turnaround: ${selectedDelivery}.` : '', `Backend price: ${finalPriceMinor}.`].filter(Boolean),
      items: [{
        id: `${productSlug}-${Date.now()}`,
        productId: productSlug,
        productName: title,
        titleSnapshot: title,
        quantity: lineQuantity,
        unitPriceMinor: Math.max(1, Math.round(finalPriceMinor / lineQuantity)),
        totalPriceMinor: finalPriceMinor,
        categorySlug,
        productSlug,
        selectedOptions,
        artworkStatus,
        artworkSnapshot,
        sku: price.matchedRow.sku || price.matchedRow.oldSku || '',
        resolverSnapshot: { source: 'native-storefront-saas-pricing-engine', product: { id: price.product.id, slug: price.product.slug, name: title, taxSettings: price.taxSettings || null }, selections: price.resolvedConfig.selections, selectedQuantity: price.resolvedConfig.selectedQuantity, selectedDelivery: price.resolvedConfig.selectedDelivery, matchedRow: price.matchedRow, priceMinor: finalPriceMinor, vatRate: price.vatRate ?? null, priceSnapshotAudit, artworkSnapshot },
        ...taxPatch(price),
      }],
      rawCheckout: { tenantSlug, storeSlug, categorySlug, productSlug, productTitle: title, quantity: lineQuantity, selectedOptions, selectedDelivery, requestedQuantity, artwork: artworkSnapshot, calculatedFinalPriceMinor: finalPriceMinor, frontendPriceSnapshot: priceSnapshot, priceSnapshotAudit, backendTaxSettings: price.taxSettings || null, backendVatRate: price.vatRate ?? null, resolvedConfig: price.resolvedConfig },
    });

    const successUrl = `${origin}${storeBase}/checkout-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelParams = new URLSearchParams({ product: productSlug, category: categorySlug, payment: 'cancel' });
    if (selectedDelivery) cancelParams.set('delivery', selectedDelivery);
    const cancelUrl = `${origin}${storeBase}/cart?${cancelParams.toString()}`;
    const sessionResult = await createStripeCheckoutSession(scopedRequest, { orderId: order.id, customerEmail, successUrl, cancelUrl });
    const paymentUrl = sessionResult.session?.url;
    if (!paymentUrl) return NextResponse.json({ ok: false, error: 'Stripe did not return a payment URL.' }, { status: 500 });
    return NextResponse.redirect(paymentUrl, { status: 303 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'native-storefront-checkout-artwork', error: error instanceof Error ? error.message : 'Checkout failed.' }, { status: 500 });
  }
}
