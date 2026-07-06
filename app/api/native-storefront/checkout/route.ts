import { NextRequest, NextResponse } from 'next/server';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { upsertArtworkProductionTicket } from '@/core/storefront/artwork-production-bridge.service';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { saveArtworkUpload, type StoredArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { calculateNativeStorefrontPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function number(value: FormDataEntryValue | null, fallback = 0) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback; }
function parseSelectedOptions(value: string): NativeSelectedOptionRow[] { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed as NativeSelectedOptionRow[] : []; } catch { return []; } }
function parseSnapshot(value: string): Record<string, any> | null { try { const parsed = JSON.parse(value || 'null'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : null; } catch { return null; } }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function productName(product: Record<string, any>, fallback: string) { return String(product.name || product.title || product.metadataJson?.name || product.metadataJson?.title || fallback); }
function checkoutFile(value: FormDataEntryValue | null) { return value && typeof value !== 'string' && value.name && value.size > 0 ? value as File : null; }

function artworkLabel(status: string) {
  if (status === 'ready') return 'Artwork uploaded now';
  if (status === 'need-design') return 'Customer needs design help';
  return 'Customer will send artwork later';
}

function taxPatch(price: Awaited<ReturnType<typeof calculateNativeStorefrontPrice>>) {
  return {
    ...(price.taxSettings ? { taxSettings: price.taxSettings } : {}),
    ...(price.vatRate !== undefined && price.vatRate !== null ? { vatRate: price.vatRate } : {}),
  };
}

function snapshotCheck(priceSnapshot: Record<string, any> | null, finalPriceMinor: number) {
  if (!priceSnapshot) return { provided: false, matched: false, differenceMinor: null };
  const snapshotTotal = Number(priceSnapshot.finalPriceMinor ?? priceSnapshot.grossMinor ?? priceSnapshot.totalMinor ?? 0);
  return {
    provided: true,
    matched: Number.isFinite(snapshotTotal) && Math.abs(snapshotTotal - finalPriceMinor) <= 1,
    snapshotTotalMinor: Number.isFinite(snapshotTotal) ? Math.round(snapshotTotal) : 0,
    backendTotalMinor: finalPriceMinor,
    differenceMinor: Number.isFinite(snapshotTotal) ? Math.round(finalPriceMinor - snapshotTotal) : null,
  };
}

function compactUpload(upload: StoredArtworkUpload | null) {
  if (!upload) return null;
  return {
    id: upload.id,
    productId: upload.productId,
    orderId: upload.orderId,
    originalName: upload.originalName,
    mimeType: upload.mimeType,
    sizeBytes: upload.sizeBytes,
    extension: upload.extension,
    pageCount: upload.pageCount,
    widthMm: upload.widthMm,
    heightMm: upload.heightMm,
    fileUrl: upload.fileUrl,
    downloadUrl: upload.downloadUrl,
    preflight: upload.preflight,
    reviewStatus: upload.reviewStatus,
    createdAt: upload.createdAt,
  };
}

async function saveCheckoutArtwork(request: Request, params: { productSlug: string; orderNumber: string; file: File | null }) {
  if (!params.file) return { upload: null, storage: null, error: null };
  const ctx = tenantContextFromRequest(request);
  const uploadForm = new FormData();
  uploadForm.set('file', params.file, params.file.name || 'artwork.pdf');
  uploadForm.set('productId', params.productSlug);
  uploadForm.set('orderId', params.orderNumber);
  const upload = await saveArtworkUpload(ctx, uploadForm);
  const dbUpload = await saveArtworkMetadataDb(upload, ctx).catch(() => null);
  const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
  return { upload: dbUpload || upload, storage, error: null };
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
    const artworkNotes = clean(form.get('artworkNotes'));
    const artworkUploadFile = checkoutFile(form.get('artworkFile'));
    const selectedOptions = parseSelectedOptions(clean(form.get('selectedOptions')));
    const priceSnapshot = parseSnapshot(clean(form.get('priceSnapshot')));
    const selectedDelivery = clean(form.get('delivery')) || clean(form.get('selectedDelivery')) || clean(form.get('turnaround'));
    const requestedQuantity = Math.max(1, number(form.get('quantity'), 1));

    if (!tenantSlug || !storeSlug || !productSlug || !customerName || !customerEmail) return NextResponse.json({ ok: false, error: 'Missing checkout customer or product details.' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const storeBase = `/native-stores/${tenantSlug}/${storeSlug}`;
    const tenantRequest = tenantScopedRequest(request, tenantSlug);
    const tenantCtx = tenantContextFromRequest(tenantRequest);
    const price = await calculateNativeStorefrontPrice({ request: tenantRequest, tenantSlug, productSlug, selectedOptions, quantity: requestedQuantity, delivery: selectedDelivery || null });
    const orderNumber = `WEB-${Date.now()}`;
    const lineQuantity = price.quantity;
    const finalPriceMinor = price.finalPriceMinor;
    const unitPriceMinor = Math.max(1, Math.round(finalPriceMinor / lineQuantity));
    const resolvedProductTitle = productName(price.product, productTitle);
    const backendTax = taxPatch(price);
    const priceSnapshotAudit = snapshotCheck(priceSnapshot, finalPriceMinor);
    const artworkUpload = await saveCheckoutArtwork(tenantRequest, { productSlug, orderNumber, file: artworkUploadFile }).catch((error) => ({ upload: null, storage: null, error: error instanceof Error ? error.message : 'Artwork upload could not be saved.' }));
    const savedUploadFull = artworkUpload.upload as StoredArtworkUpload | null;
    const savedUpload = compactUpload(savedUploadFull);
    const artworkSnapshot = {
      status: artworkStatus,
      label: artworkLabel(artworkStatus),
      notes: artworkNotes,
      upload: savedUpload,
      storage: artworkUpload.storage,
      uploadError: artworkUpload.error,
      requiresFollowUp: artworkStatus !== 'ready' || !savedUpload || savedUpload.reviewStatus === 'replacement-requested',
      preflightStatus: (savedUpload?.preflight as any)?.preflight?.status || (savedUpload ? 'checking' : 'not-started'),
      source: 'native-storefront-existing-artwork-upload',
    };

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
      notes: `Native storefront online order. Artwork: ${artworkSnapshot.label}.${artworkNotes ? ` Notes: ${artworkNotes}` : ''}`,
      internalNotes: [
        `Created from native storefront ${tenantSlug}/${storeSlug}.`,
        `Artwork status: ${artworkSnapshot.label}.`,
        savedUpload ? `Artwork upload saved: ${savedUpload.id} (${savedUpload.originalName}).` : 'No artwork upload saved at checkout.',
        artworkUpload.error ? `Artwork upload error: ${artworkUpload.error}.` : '',
        savedUpload?.preflight ? `Artwork preflight: ${artworkSnapshot.preflightStatus}.` : '',
        artworkNotes ? `Artwork notes: ${artworkNotes}.` : '',
        selectedDelivery ? `Selected delivery/turnaround: ${selectedDelivery}.` : '',
        'Checkout price recalculated server-side by backend pricing engine before order creation.',
        'Tax/VAT handled from backend admin product tax settings and global tax rules.',
        priceSnapshotAudit.provided ? `Frontend price snapshot match: ${priceSnapshotAudit.matched ? 'yes' : 'no'}.` : 'No frontend price snapshot was provided.',
      ].filter(Boolean),
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
        artworkUploadId: savedUpload?.id || null,
        artworkSnapshot,
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
          priceSnapshotAudit,
          artworkSnapshot,
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
        selectedDelivery,
        requestedQuantity,
        artwork: artworkSnapshot,
        calculatedFinalPriceMinor: finalPriceMinor,
        pricingSource: price.pricingSource,
        frontendPriceSnapshot: priceSnapshot,
        priceSnapshotAudit,
        backendTaxSettings: price.taxSettings || null,
        backendVatRate: price.vatRate ?? null,
        resolvedConfig: price.resolvedConfig,
      },
    });

    await upsertArtworkProductionTicket({
      ctx: tenantCtx,
      orderId: order.id,
      orderNumber,
      customerName,
      customerEmail,
      productName: resolvedProductTitle,
      productSlug,
      categorySlug,
      quantity: lineQuantity,
      selectedDelivery,
      artworkStatus,
      artworkNotes,
      upload: savedUploadFull,
      priceMinor: finalPriceMinor,
    }).catch(() => null);

    const successUrl = `${origin}${storeBase}/checkout-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelParams = new URLSearchParams({ product: productSlug, category: categorySlug, payment: 'cancel' });
    if (selectedDelivery) cancelParams.set('delivery', selectedDelivery);
    const cancelUrl = `${origin}${storeBase}/cart?${cancelParams.toString()}`;
    const sessionResult = await createStripeCheckoutSession(tenantRequest, { orderId: order.id, customerEmail, successUrl, cancelUrl });
    const paymentUrl = sessionResult.session?.url;
    if (!paymentUrl) return NextResponse.json({ ok: false, error: 'Stripe did not return a payment URL.' }, { status: 500 });
    return NextResponse.redirect(paymentUrl, { status: 303 });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'native-storefront-checkout', error: error instanceof Error ? error.message : 'Checkout failed.' }, { status: 500 });
  }
}
