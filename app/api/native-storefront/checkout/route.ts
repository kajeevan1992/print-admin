import { NextRequest, NextResponse } from 'next/server';
import { queueOrderPlacedEmails } from '@/core/email/order-notifications.service';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { rateLimitPayload, publicRateLimit } from '@/core/security/public-rate-limit.service';
import { upsertArtworkProductionTicket } from '@/core/storefront/artwork-production-bridge.service';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { saveArtworkUpload, type StoredArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { calculateNativeStorefrontPrice, type NativeSelectedOptionRow } from '@/core/storefront/native-pricing.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

type AddressSnapshot = { line1: string; line2: string; town: string; county: string; postcode: string; country: string };

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function number(value: FormDataEntryValue | null, fallback = 0) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback; }
function parseSelectedOptions(value: string): NativeSelectedOptionRow[] { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed as NativeSelectedOptionRow[] : []; } catch { return []; } }
function parseSnapshot(value: string): Record<string, any> | null { try { const parsed = JSON.parse(value || 'null'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : null; } catch { return null; } }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function productName(product: Record<string, any>, fallback: string) { return String(product.name || product.title || product.metadataJson?.name || product.metadataJson?.title || fallback); }
function checkoutFile(value: FormDataEntryValue | null) { return value && typeof value !== 'string' && value.name && value.size > 0 ? value as File : null; }
function artworkLabel(status: string) { if (status === 'ready') return 'Artwork uploaded now'; if (status === 'need-design') return 'Customer needs design help'; return 'Customer will send artwork later'; }
function taxPatch(price: Awaited<ReturnType<typeof calculateNativeStorefrontPrice>>) { return { ...(price.taxSettings ? { taxSettings: price.taxSettings } : {}), ...(price.vatRate !== undefined && price.vatRate !== null ? { vatRate: price.vatRate } : {}) }; }
function snapshotCheck(priceSnapshot: Record<string, any> | null, finalPriceMinor: number) { if (!priceSnapshot) return { provided: false, matched: false, differenceMinor: null }; const snapshotTotal = Number(priceSnapshot.finalPriceMinor ?? priceSnapshot.grossMinor ?? priceSnapshot.totalMinor ?? 0); return { provided: true, matched: Number.isFinite(snapshotTotal) && Math.abs(snapshotTotal - finalPriceMinor) <= 1, snapshotTotalMinor: Number.isFinite(snapshotTotal) ? Math.round(snapshotTotal) : 0, backendTotalMinor: finalPriceMinor, differenceMinor: Number.isFinite(snapshotTotal) ? Math.round(finalPriceMinor - snapshotTotal) : null }; }
function wantsJson(request: NextRequest) { return request.headers.get('accept')?.includes('application/json') || request.headers.get('x-checkout-mode') === 'json'; }
function json(data: Record<string, any>, init?: ResponseInit) { return NextResponse.json(data, init); }
function compactUpload(upload: StoredArtworkUpload | null) { if (!upload) return null; return { id: upload.id, productId: upload.productId, orderId: upload.orderId, originalName: upload.originalName, mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, extension: upload.extension, pageCount: upload.pageCount, widthMm: upload.widthMm, heightMm: upload.heightMm, fileUrl: upload.fileUrl, downloadUrl: upload.downloadUrl, preflight: upload.preflight, reviewStatus: upload.reviewStatus, createdAt: upload.createdAt }; }
function bool(value: FormDataEntryValue | null, fallback = false) { const next = clean(value).toLowerCase(); if (!next) return fallback; return ['1', 'true', 'yes', 'on', 'same'].includes(next); }
function normal(value: string) { return clean(value).toLowerCase().replace(/_/g, '-'); }
function address(form: FormData, prefix: string): AddressSnapshot { return { line1: clean(form.get(`${prefix}Address1`)), line2: clean(form.get(`${prefix}Address2`)), town: clean(form.get(`${prefix}Town`)), county: clean(form.get(`${prefix}County`)), postcode: clean(form.get(`${prefix}Postcode`)).toUpperCase(), country: clean(form.get(`${prefix}Country`)) || 'United Kingdom' }; }
function hasAddress(value: AddressSnapshot | null) { return Boolean(value && (value.line1 || value.line2 || value.town || value.county || value.postcode)); }
function addressLine(value: AddressSnapshot | null) { if (!value) return ''; return [value.line1, value.line2, value.town, value.county, value.postcode, value.country].filter(Boolean).join(', '); }
function checkoutValidationError(error: string, fields: string[] = []) { return { ok: false, code: 'CHECKOUT_DETAILS_REQUIRED', source: 'native-storefront-checkout', error, fields }; }
async function saveCheckoutArtwork(request: Request, params: { productSlug: string; orderNumber: string; file: File | null }) { if (!params.file) return { upload: null, storage: null, error: null }; const ctx = tenantContextFromRequest(request); const uploadForm = new FormData(); uploadForm.set('file', params.file, params.file.name || 'artwork.pdf'); uploadForm.set('productId', params.productSlug); uploadForm.set('orderId', params.orderNumber); const upload = await saveArtworkUpload(ctx, uploadForm); const dbUpload = await saveArtworkMetadataDb(upload, ctx).catch(() => null); const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false })); return { upload: dbUpload || upload, storage, error: null }; }
function uploadNow(status: string) { return ['ready', 'upload-now', 'upload_artwork', 'upload-artwork'].includes(String(status || '').toLowerCase()); }
function preflightSummary(upload: StoredArtworkUpload | null, uploadError: unknown = null) {
  const preflight = (upload?.preflight as any)?.preflight || {};
  const errors = Array.isArray(preflight.errors) ? preflight.errors.map(String) : [];
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings.map(String) : [];
  const status = String(preflight.status || (upload ? 'checking' : 'not-started'));
  const blocked = Boolean(uploadError || status === 'blocked' || errors.length || upload?.reviewStatus === 'replacement-requested');
  return { status, blocked, passed: Boolean(preflight.passed && !blocked), requiresManualReview: Boolean(preflight.requiresManualReview), errors: uploadError ? [String(uploadError)] : errors, warnings, acceptedFileTypes: preflight.acceptedFileTypes || [], customerInstructions: preflight.customerInstructions || '', upload: compactUpload(upload) };
}
function preflightGatePayload(message: string, preflight: ReturnType<typeof preflightSummary>, switchToDesign = true) {
  return { ok: false, code: 'ARTWORK_PREFLIGHT_BLOCKED', source: 'native-storefront-checkout', error: message, preflight, actions: { reupload: true, switchToDesignHelp: switchToDesign, uploadLater: true } };
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
    const rateLimit = publicRateLimit(request, { scope: 'native-checkout', limit: 18, windowMs: 10 * 60 * 1000, identifier: [customerEmail, tenantSlug, productSlug].filter(Boolean).join(':') });
    if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'native-storefront-checkout' }, { status: 429, headers: rateLimit.headers });
    const customerPhone = clean(form.get('customerPhone'));
    const customerCompany = clean(form.get('customerCompany'));
    const fulfilmentMode = ['delivery', 'collection'].includes(normal(clean(form.get('fulfilmentMode')))) ? normal(clean(form.get('fulfilmentMode'))) : 'collection';
    const deliveryAddress = address(form, 'delivery');
    const billingSameAsDelivery = bool(form.get('billingSameAsDelivery'), true);
    const billingAddressInput = address(form, 'billing');
    const billingAddress = billingSameAsDelivery && hasAddress(deliveryAddress) ? deliveryAddress : hasAddress(billingAddressInput) ? billingAddressInput : null;
    const artworkStatus = clean(form.get('artworkStatus')) || 'send-later';
    const artworkNotes = clean(form.get('artworkNotes'));
    const artworkUploadFile = checkoutFile(form.get('artworkFile'));
    const selectedOptions = parseSelectedOptions(clean(form.get('selectedOptions')));
    const priceSnapshot = parseSnapshot(clean(form.get('priceSnapshot')));
    const selectedDelivery = clean(form.get('delivery')) || clean(form.get('selectedDelivery')) || clean(form.get('turnaround'));
    const requestedQuantity = Math.max(1, number(form.get('quantity'), 1));
    if (!tenantSlug || !storeSlug || !productSlug || !customerName || !customerEmail || !customerPhone) return json(checkoutValidationError('Missing checkout customer, phone or product details.', ['customerName', 'customerEmail', 'customerPhone']), { status: 400, headers: rateLimit.headers });
    if (fulfilmentMode === 'delivery' && (!deliveryAddress.line1 || !deliveryAddress.town || !deliveryAddress.postcode)) return json(checkoutValidationError('Delivery address is required before payment for delivery orders.', ['deliveryAddress1', 'deliveryTown', 'deliveryPostcode']), { status: 400, headers: rateLimit.headers });
    if (!billingSameAsDelivery && (!billingAddressInput.line1 || !billingAddressInput.town || !billingAddressInput.postcode)) return json(checkoutValidationError('Billing address is incomplete. Use same as delivery or complete the billing address.', ['billingAddress1', 'billingTown', 'billingPostcode']), { status: 400, headers: rateLimit.headers });
    if (uploadNow(artworkStatus) && !artworkUploadFile) return json(preflightGatePayload('Please upload your artwork file before payment, or choose upload later/design help.', { status: 'missing-file', blocked: true, passed: false, requiresManualReview: false, errors: ['No artwork file was uploaded.'], warnings: [], acceptedFileTypes: [], customerInstructions: '', upload: null }), { status: 422, headers: rateLimit.headers });

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
    const preflight = preflightSummary(savedUploadFull, artworkUpload.error);
    if (uploadNow(artworkStatus) && preflight.blocked) return json(preflightGatePayload('Artwork preflight failed. Please fix the issues and reupload before payment, or switch to design help/upload later.', preflight), { status: 422, headers: rateLimit.headers });
    const artworkSnapshot = { status: artworkStatus, label: artworkLabel(artworkStatus), notes: artworkNotes, upload: savedUpload, storage: artworkUpload.storage, uploadError: artworkUpload.error, requiresFollowUp: artworkStatus !== 'ready' || !savedUpload || savedUpload.reviewStatus === 'replacement-requested' || preflight.requiresManualReview, preflightStatus: preflight.status, preflight, source: 'native-storefront-existing-artwork-upload' };
    const fulfilmentSnapshot = { mode: fulfilmentMode, selectedDelivery, deliveryAddress: fulfilmentMode === 'delivery' ? deliveryAddress : null, deliveryAddressLine: fulfilmentMode === 'delivery' ? addressLine(deliveryAddress) : '', billingSameAsDelivery, billingAddress, billingAddressLine: addressLine(billingAddress), collectionStore: fulfilmentMode === 'collection' ? storeSlug : '', source: 'native-storefront-checkout' };
    const contactSnapshot = { name: customerName, email: customerEmail, phone: customerPhone, company: customerCompany };

    const order = await saveOrder(tenantRequest, {
      orderNumber, customerName, customerEmail, customerPhone, customerCompany,
      customer: { ...contactSnapshot, address: fulfilmentSnapshot.deliveryAddress || billingAddress || null },
      contactSnapshot,
      fulfilmentMode,
      fulfillmentMode: fulfilmentMode,
      selectedDelivery,
      deliveryAddress: fulfilmentSnapshot.deliveryAddress,
      billingAddress,
      deliveryAddressLine: fulfilmentSnapshot.deliveryAddressLine,
      billingAddressLine: fulfilmentSnapshot.billingAddressLine,
      fulfilmentSnapshot,
      fulfillmentSnapshot: fulfilmentSnapshot,
      currency: price.currency,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'pending',
      paymentProvider: 'stripe',
      payment_method: 'Pay now by card',
      source: 'native-storefront',
      storeName: storeSlug,
      notes: `Native storefront online order. Fulfilment: ${fulfilmentMode}${selectedDelivery ? ` / ${selectedDelivery}` : ''}. Artwork: ${artworkSnapshot.label}.${artworkNotes ? ` Notes: ${artworkNotes}` : ''}`,
      internalNotes: [`Created from native storefront ${tenantSlug}/${storeSlug}.`, `Customer phone: ${customerPhone}.`, customerCompany ? `Company: ${customerCompany}.` : '', `Fulfilment: ${fulfilmentMode}.`, selectedDelivery ? `Selected delivery/turnaround: ${selectedDelivery}.` : '', fulfilmentSnapshot.deliveryAddressLine ? `Delivery address: ${fulfilmentSnapshot.deliveryAddressLine}.` : '', fulfilmentSnapshot.billingAddressLine ? `Billing address: ${fulfilmentSnapshot.billingAddressLine}.` : '', `Artwork status: ${artworkSnapshot.label}.`, savedUpload ? `Artwork upload saved: ${savedUpload.id} (${savedUpload.originalName}).` : 'No artwork upload saved at checkout.', artworkUpload.error ? `Artwork upload error: ${artworkUpload.error}.` : '', savedUpload?.preflight ? `Artwork preflight: ${artworkSnapshot.preflightStatus}.` : '', preflight.warnings.length ? `Artwork preflight warnings: ${preflight.warnings.join(' | ')}.` : '', artworkNotes ? `Artwork notes: ${artworkNotes}.` : '', 'Checkout price recalculated server-side by backend pricing engine before order creation.', 'Tax/VAT handled from backend admin product tax settings and global tax rules.', priceSnapshotAudit.provided ? `Frontend price snapshot match: ${priceSnapshotAudit.matched ? 'yes' : 'no'}.` : 'No frontend price snapshot was provided.'].filter(Boolean),
      items: [{ id: `${productSlug}-${Date.now()}`, productId: productSlug, productName: resolvedProductTitle, titleSnapshot: resolvedProductTitle, quantity: lineQuantity, unitPriceMinor, totalPriceMinor: finalPriceMinor, categorySlug, productSlug, selectedOptions, artworkStatus, artworkUploadId: savedUpload?.id || null, artworkSnapshot, fulfilmentSnapshot, contactSnapshot, sku: price.matchedRow.sku || price.matchedRow.oldSku || '', resolverSnapshot: { source: 'native-storefront-saas-pricing-engine', product: { id: price.product.id, slug: price.product.slug, name: resolvedProductTitle, taxSettings: price.taxSettings || null }, selections: price.resolvedConfig.selections, selectedQuantity: price.resolvedConfig.selectedQuantity, selectedDelivery: price.resolvedConfig.selectedDelivery, matchedRow: price.matchedRow, priceMinor: finalPriceMinor, vatRate: price.vatRate ?? null, priceSnapshotAudit, artworkSnapshot, fulfilmentSnapshot, contactSnapshot }, ...backendTax }],
      rawCheckout: { tenantSlug, storeSlug, categorySlug, productSlug, productTitle: resolvedProductTitle, quantity: lineQuantity, selectedOptions, selectedDelivery, requestedQuantity, contact: contactSnapshot, fulfilment: fulfilmentSnapshot, artwork: artworkSnapshot, calculatedFinalPriceMinor: finalPriceMinor, pricingSource: price.pricingSource, frontendPriceSnapshot: priceSnapshot, priceSnapshotAudit, backendTaxSettings: price.taxSettings || null, backendVatRate: price.vatRate ?? null, resolvedConfig: price.resolvedConfig },
    });

    await upsertArtworkProductionTicket({ ctx: tenantCtx, orderId: order.id, orderNumber, customerName, customerEmail, customerPhone, productName: resolvedProductTitle, productSlug, categorySlug, quantity: lineQuantity, selectedDelivery, fulfilmentMode, deliveryAddress: fulfilmentSnapshot.deliveryAddress, billingAddress, artworkStatus, artworkNotes, upload: savedUploadFull, priceMinor: finalPriceMinor, paymentStatus: 'pending', paymentProvider: 'stripe', orderStatus: 'AWAITING_PAYMENT' }).catch(() => null);

    const successUrl = `${origin}${storeBase}/checkout-success?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelParams = new URLSearchParams({ product: productSlug, category: categorySlug, payment: 'cancel' });
    if (selectedDelivery) cancelParams.set('delivery', selectedDelivery);
    const cancelUrl = `${origin}${storeBase}/cart?${cancelParams.toString()}`;
    const sessionResult = await createStripeCheckoutSession(tenantRequest, { orderId: order.id, customerEmail, successUrl, cancelUrl });
    const paymentUrl = sessionResult.session?.url;
    if (!paymentUrl) return json({ ok: false, error: 'Stripe did not return a payment URL.' }, { status: 500, headers: rateLimit.headers });
    await queueOrderPlacedEmails(tenantRequest, { ...order, paymentStatus: 'pending', paymentProvider: 'stripe', stripeCheckoutSessionId: sessionResult.session?.id || order.stripeCheckoutSessionId || '', paymentUrl }).catch(() => null);
    if (wantsJson(request)) return json({ ok: true, source: 'native-storefront-checkout', paymentUrl, orderId: order.id, orderNumber, artwork: artworkSnapshot, fulfilment: fulfilmentSnapshot, stripeSessionId: sessionResult.session?.id || '', rateLimit: { mode: rateLimit.mode, remaining: rateLimit.remaining } }, { headers: rateLimit.headers });
    return NextResponse.redirect(paymentUrl, { status: 303 });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-checkout', error: error instanceof Error ? error.message : 'Checkout failed.' }, { status: 500 });
  }
}
