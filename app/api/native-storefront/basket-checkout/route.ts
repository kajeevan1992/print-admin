import { NextRequest, NextResponse } from 'next/server';
import { queueOrderPlacedEmails } from '@/core/email/order-notifications.service';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { upsertArtworkProductionTicket } from '@/core/storefront/artwork-production-bridge.service';
import { customerFromRequest } from '@/core/storefront/customer-account.service';
import { artworkStorageStatus, saveArtworkMetadataDb } from '@/core/storefront/internal-artwork-db';
import { saveArtworkUpload, type StoredArtworkUpload } from '@/core/storefront/internal-artwork-storage';
import { basketCookieName, loadPersistentBasket, savePersistentBasket, type StorefrontBasketArtwork } from '@/core/storefront/persistent-basket.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AddressSnapshot = { line1: string; line2: string; town: string; county: string; postcode: string; country: string };
type SavedLineArtwork = { upload: StoredArtworkUpload | null; storage: unknown; error: string | null; preflight: ReturnType<typeof preflightSummary> };

function clean(value: FormDataEntryValue | null | undefined) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value as any).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function bool(value: FormDataEntryValue | null, fallback = false) { const next = clean(value).toLowerCase(); if (!next) return fallback; return ['1', 'true', 'yes', 'on', 'same'].includes(next); }
function normal(value: string) { return clean(value).toLowerCase().replace(/_/g, '-'); }
function artworkStatus(value: FormDataEntryValue | null, fallback: StorefrontBasketArtwork['status']) { const next = clean(value); return ['ready', 'send-later', 'need-design'].includes(next) ? next as StorefrontBasketArtwork['status'] : fallback; }
function address(form: FormData, prefix: string): AddressSnapshot { return { line1: clean(form.get(`${prefix}Address1`)), line2: clean(form.get(`${prefix}Address2`)), town: clean(form.get(`${prefix}Town`)), county: clean(form.get(`${prefix}County`)), postcode: clean(form.get(`${prefix}Postcode`)).toUpperCase(), country: clean(form.get(`${prefix}Country`)) || 'United Kingdom' }; }
function hasAddress(value: AddressSnapshot | null) { return Boolean(value && (value.line1 || value.line2 || value.town || value.county || value.postcode)); }
function addressLine(value: AddressSnapshot | null) { if (!value) return ''; return [value.line1, value.line2, value.town, value.county, value.postcode, value.country].filter(Boolean).join(', '); }
function checkoutFile(form: FormData, name: string) { const value = form.get(name); return value && typeof value !== 'string' && value.name && value.size > 0 ? value as File : null; }
function uploadNow(status: string) { return ['ready', 'upload-now', 'upload_artwork', 'upload-artwork'].includes(clean(status).toLowerCase()); }
function artworkLabel(status: string) { if (status === 'ready') return 'Artwork uploaded now'; if (status === 'need-design') return 'Customer needs design help'; return 'Customer will send artwork later'; }
function wantsJson(request: NextRequest) { return request.headers.get('accept')?.includes('application/json') || request.headers.get('x-checkout-mode') === 'json'; }
function json(data: Record<string, any>, init?: ResponseInit) { return NextResponse.json(data, init); }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); const headers = new Headers(request.headers); headers.set('x-tenant-id', tenantSlug); return new Request(url.toString(), { method: 'GET', headers }); }
function compactUpload(upload: StoredArtworkUpload | null) { if (!upload) return null; return { id: upload.id, productId: upload.productId, orderId: upload.orderId, originalName: upload.originalName, mimeType: upload.mimeType, sizeBytes: upload.sizeBytes, extension: upload.extension, pageCount: upload.pageCount, widthMm: upload.widthMm, heightMm: upload.heightMm, fileUrl: upload.fileUrl, downloadUrl: upload.downloadUrl, preflight: upload.preflight, reviewStatus: upload.reviewStatus, createdAt: upload.createdAt }; }
function preflightSummary(upload: StoredArtworkUpload | null, uploadError: unknown = null) {
  const preflight = (upload?.preflight as any)?.preflight || {};
  const errors = Array.isArray(preflight.errors) ? preflight.errors.map(String) : [];
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings.map(String) : [];
  const status = String(preflight.status || (upload ? 'checking' : 'not-started'));
  const blocked = Boolean(uploadError || status === 'blocked' || errors.length || upload?.reviewStatus === 'replacement-requested');
  return { status, blocked, passed: Boolean(preflight.passed && !blocked), requiresManualReview: Boolean(preflight.requiresManualReview), errors: uploadError ? [String(uploadError)] : errors, warnings, acceptedFileTypes: preflight.acceptedFileTypes || [], customerInstructions: preflight.customerInstructions || '', upload: compactUpload(upload) };
}

async function saveLineArtwork(request: Request, productSlug: string, orderNumber: string, lineId: string, file: File | null): Promise<SavedLineArtwork> {
  if (!file) return { upload: null, storage: null, error: null, preflight: preflightSummary(null) };
  try {
    const ctx = tenantContextFromRequest(request);
    const uploadForm = new FormData();
    uploadForm.set('file', file, file.name || 'artwork.pdf');
    uploadForm.set('productId', productSlug);
    uploadForm.set('orderId', `${orderNumber}-${lineId}`);
    const upload = await saveArtworkUpload(ctx, uploadForm);
    const saved = await saveArtworkMetadataDb(upload, ctx).catch(() => upload);
    const storage = await artworkStorageStatus(ctx).catch(() => ({ mode: 'file-fallback', dbReady: false }));
    const full = saved as StoredArtworkUpload;
    return { upload: full, storage, error: null, preflight: preflightSummary(full) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Artwork upload could not be saved.';
    return { upload: null, storage: null, error: message, preflight: preflightSummary(null, message) };
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const tenantSlug = slug(form.get('tenantSlug'));
    const storeSlug = slug(form.get('storeSlug'));
    const basketId = clean(form.get('basketId'));
    let customerName = clean(form.get('customerName'));
    let customerEmail = clean(form.get('customerEmail'));
    let customerPhone = clean(form.get('customerPhone'));
    let customerCompany = clean(form.get('customerCompany'));
    const accountCustomer = tenantSlug && storeSlug ? await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null) : null;
    if (accountCustomer) {
      customerName = accountCustomer.name || customerName;
      customerEmail = accountCustomer.email;
      customerPhone = customerPhone || accountCustomer.phone;
      customerCompany = customerCompany || accountCustomer.company;
    }
    const rateLimit = publicRateLimit(request, { scope: 'native-basket-checkout', limit: 12, windowMs: 10 * 60 * 1000, identifier: [customerEmail, tenantSlug, basketId].filter(Boolean).join(':') });
    if (rateLimit.enforced) return json({ ...rateLimitPayload(rateLimit), source: 'native-storefront-basket-checkout' }, { status: 429, headers: rateLimit.headers });
    if (!tenantSlug || !storeSlug || !basketId || !customerName || !customerEmail || !customerPhone) return json({ ok: false, error: 'Missing basket or customer checkout details.' }, { status: 400, headers: rateLimit.headers });

    const cookieBasketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
    if (!cookieBasketId || cookieBasketId !== basketId) return json({ ok: false, error: 'This basket is not available in the current browser session.' }, { status: 403, headers: rateLimit.headers });

    const fulfilmentMode = ['delivery', 'collection'].includes(normal(clean(form.get('fulfilmentMode')))) ? normal(clean(form.get('fulfilmentMode'))) : 'collection';
    const deliveryAddress = address(form, 'delivery');
    const billingSameAsDelivery = bool(form.get('billingSameAsDelivery'), true);
    const billingAddressInput = address(form, 'billing');
    const billingAddress = billingSameAsDelivery && hasAddress(deliveryAddress) ? deliveryAddress : hasAddress(billingAddressInput) ? billingAddressInput : null;
    if (fulfilmentMode === 'delivery' && (!deliveryAddress.line1 || !deliveryAddress.town || !deliveryAddress.postcode)) return json({ ok: false, error: 'Delivery address is required before payment.' }, { status: 400, headers: rateLimit.headers });
    if (!billingSameAsDelivery && (!billingAddressInput.line1 || !billingAddressInput.town || !billingAddressInput.postcode)) return json({ ok: false, error: 'Billing address is incomplete.' }, { status: 400, headers: rateLimit.headers });

    const scopedRequest = tenantScopedRequest(request, tenantSlug);
    const tenantCtx = tenantContextFromRequest(scopedRequest);
    let basket = await loadPersistentBasket(scopedRequest, tenantSlug, storeSlug, basketId, { reprice: true, persistRefresh: true });
    if (!basket.lines.length) return json({ ok: false, error: 'Your basket is empty.' }, { status: 400, headers: rateLimit.headers });
    if (basket.customerId && basket.customerId !== accountCustomer?.id) return json({ ok: false, error: 'Sign in to the customer account that owns this saved basket before checkout.' }, { status: 403, headers: rateLimit.headers });
    basket = await savePersistentBasket({ ...basket, customerId: accountCustomer?.id || basket.customerId || null, lines: basket.lines.map((line) => ({ ...line, artwork: { ...line.artwork, status: artworkStatus(form.get(`artworkStatus:${line.id}`), line.artwork.status), notes: clean(form.get(`artworkNotes:${line.id}`)) || line.artwork.notes } })) });

    const orderNumber = `WEB-${Date.now()}`;
    const customerAccountId = accountCustomer?.id || basket.customerId || '';
    const contactSnapshot = { name: customerName, email: customerEmail, phone: customerPhone, company: customerCompany, customerAccountId };
    const fulfilmentSnapshot = { mode: fulfilmentMode, deliveryAddress: fulfilmentMode === 'delivery' ? deliveryAddress : null, deliveryAddressLine: fulfilmentMode === 'delivery' ? addressLine(deliveryAddress) : '', billingSameAsDelivery, billingAddress, billingAddressLine: addressLine(billingAddress), collectionStore: fulfilmentMode === 'collection' ? storeSlug : '', source: 'persistent-storefront-basket-checkout' };

    const artworkResults = new Map<string, SavedLineArtwork>();
    const lineIssues: Array<{ lineId: string; productName: string; errors: string[]; warnings: string[] }> = [];
    for (const line of basket.lines) {
      const file = checkoutFile(form, `artworkFile:${line.id}`);
      if (uploadNow(line.artwork.status) && !file) { lineIssues.push({ lineId: line.id, productName: line.productName, errors: ['Artwork file is missing.'], warnings: [] }); continue; }
      const result = await saveLineArtwork(scopedRequest, line.productSlug, orderNumber, line.id, file);
      artworkResults.set(line.id, result);
      if (uploadNow(line.artwork.status) && result.preflight.blocked) lineIssues.push({ lineId: line.id, productName: line.productName, errors: result.preflight.errors, warnings: result.preflight.warnings });
    }
    if (lineIssues.length) return json({ ok: false, code: 'ARTWORK_PREFLIGHT_BLOCKED', error: 'One or more basket items need artwork attention before payment.', lineIssues }, { status: 422, headers: rateLimit.headers });

    const orderItems = basket.lines.map((line) => {
      const artwork = artworkResults.get(line.id) || { upload: null, storage: null, error: null, preflight: preflightSummary(null) };
      const upload = compactUpload(artwork.upload);
      const artworkSnapshot = { status: line.artwork.status, label: artworkLabel(line.artwork.status), notes: line.artwork.notes, upload, storage: artwork.storage, uploadError: artwork.error, requiresFollowUp: line.artwork.status !== 'ready' || !upload || artwork.preflight.requiresManualReview, preflightStatus: artwork.preflight.status, preflight: artwork.preflight, source: 'persistent-storefront-basket-line' };
      return { id: line.id, productId: line.productSlug, productSlug: line.productSlug, categorySlug: line.categorySlug, productName: line.productName, titleSnapshot: line.productName, quantity: line.quantity, unitPriceMinor: Math.max(1, Math.round(line.grossMinor / Math.max(1, line.quantity))), totalPriceMinor: line.grossMinor, netTotalMinor: line.netMinor, vatMinor: line.vatMinor, vatRate: line.vatRate, vatClass: line.vatClass, vatReason: line.vatReason, currency: line.currency, sku: line.sku, selectedOptions: line.selectedOptions, selectedDelivery: line.delivery, customSize: line.customSize || null, artworkStatus: line.artwork.status, artworkUploadId: upload?.id || null, artworkSnapshot, fulfilmentSnapshot, contactSnapshot, resolverSnapshot: { source: 'persistent-storefront-basket', basketId: basket.id, lineId: line.id, customerAccountId, pricingSource: line.pricingSource, selectedOptions: line.selectedOptions, quantity: line.quantity, delivery: line.delivery, grossMinor: line.grossMinor, netMinor: line.netMinor, vatMinor: line.vatMinor, vatRate: line.vatRate, vatClass: line.vatClass, vatReason: line.vatReason } };
    });

    const order = await saveOrder(scopedRequest, {
      orderNumber, customerName, customerEmail, customerPhone, customerCompany,
      customer: { ...contactSnapshot, address: fulfilmentSnapshot.deliveryAddress || billingAddress || null },
      contactSnapshot, fulfilmentMode, fulfillmentMode: fulfilmentMode, deliveryAddress: fulfilmentSnapshot.deliveryAddress, billingAddress, deliveryAddressLine: fulfilmentSnapshot.deliveryAddressLine, billingAddressLine: fulfilmentSnapshot.billingAddressLine, fulfilmentSnapshot, fulfillmentSnapshot: fulfilmentSnapshot,
      currency: basket.currency, status: 'AWAITING_PAYMENT', paymentStatus: 'pending', paymentProvider: 'stripe', payment_method: 'Pay now by card', source: 'persistent-native-storefront-basket', storeName: storeSlug,
      notes: `Persistent native storefront basket order with ${basket.lineCount} line(s).`,
      internalNotes: [`Created from persistent basket ${basket.id} for ${tenantSlug}/${storeSlug}.`, customerAccountId ? `Customer account: ${customerAccountId}.` : '', `Customer phone: ${customerPhone}.`, customerCompany ? `Company: ${customerCompany}.` : '', `Fulfilment: ${fulfilmentMode}.`, fulfilmentSnapshot.deliveryAddressLine ? `Delivery address: ${fulfilmentSnapshot.deliveryAddressLine}.` : '', 'Basket was repriced server-side immediately before order creation.', 'Mixed VAT remains enforced per order line.'].filter(Boolean),
      items: orderItems, artworkUploadIds: orderItems.map((item) => item.artworkUploadId).filter(Boolean),
      rawCheckout: { basketId: basket.id, tenantSlug, storeSlug, customerAccountId, contact: contactSnapshot, fulfilment: fulfilmentSnapshot, totals: { netMinor: basket.netMinor, vatMinor: basket.vatMinor, grossMinor: basket.grossMinor }, lineCount: basket.lineCount, itemCount: basket.itemCount },
      resolver: { basketId: basket.id, tenantSlug, storeSlug, customerAccountId, source: 'persistent-storefront-basket' },
    });

    for (const line of basket.lines) {
      const artwork = artworkResults.get(line.id);
      await upsertArtworkProductionTicket({ ctx: tenantCtx, orderId: order.id, orderNumber, lineId: line.id, customerName, customerEmail, customerPhone, productName: line.productName, productSlug: line.productSlug, categorySlug: line.categorySlug, quantity: line.quantity, selectedDelivery: line.delivery, fulfilmentMode, deliveryAddress: fulfilmentSnapshot.deliveryAddress, billingAddress, artworkStatus: line.artwork.status, artworkNotes: line.artwork.notes, upload: artwork?.upload || null, priceMinor: line.grossMinor, paymentStatus: 'pending', paymentProvider: 'stripe', orderStatus: 'AWAITING_PAYMENT' }).catch(() => null);
    }

    const origin = new URL(request.url).origin;
    const storeBase = `/native-stores/${tenantSlug}/${storeSlug}`;
    const successUrl = `${origin}${storeBase}/checkout-success?orderId=${encodeURIComponent(order.id)}&basketId=${encodeURIComponent(basket.id)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${storeBase}/cart?payment=cancel&orderId=${encodeURIComponent(order.id)}`;
    const sessionResult = await createStripeCheckoutSession(scopedRequest, { orderId: order.id, customerEmail, successUrl, cancelUrl });
    const paymentUrl = sessionResult.session?.url;
    if (!paymentUrl) return json({ ok: false, error: 'Stripe did not return a payment URL.' }, { status: 500, headers: rateLimit.headers });
    await queueOrderPlacedEmails(scopedRequest, { ...order, paymentStatus: 'pending', paymentProvider: 'stripe', stripeCheckoutSessionId: sessionResult.session?.id || order.stripeCheckoutSessionId || '', paymentUrl }).catch(() => null);

    const payload = { ok: true, source: 'native-storefront-basket-checkout', paymentUrl, orderId: order.id, orderNumber, basketId: basket.id, lineCount: basket.lineCount, itemCount: basket.itemCount, fulfilment: fulfilmentSnapshot, stripeSessionId: sessionResult.session?.id || '', rateLimit: { mode: rateLimit.mode, remaining: rateLimit.remaining } };
    if (wantsJson(request)) return json(payload, { headers: rateLimit.headers });
    return NextResponse.redirect(paymentUrl, { status: 303 });
  } catch (error) {
    return json({ ok: false, source: 'native-storefront-basket-checkout', error: error instanceof Error ? error.message : 'Basket checkout failed.' }, { status: 500 });
  }
}
