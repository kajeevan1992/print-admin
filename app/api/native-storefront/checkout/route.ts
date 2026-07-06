import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, listInternalCatalog } from '@/core/catalog/internal-catalog.service';
import { platformPrisma } from '@/core/db/platform-prisma';
import { saveOrder } from '@/core/orders/orders.service';
import { createStripeCheckoutSession } from '@/core/payments/stripe.service';
import { resolveProductConfig, rowPriceMinor } from '@/core/storefront/product-config-engine';
import { tenantContextFromRequest } from '@/core/tenant/context';

export const dynamic = 'force-dynamic';

type SelectedOptionRow = {
  key?: string;
  label?: string;
  value?: string;
  slug?: string;
};

function clean(value: FormDataEntryValue | null) { return String(value || '').trim(); }
function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function number(value: FormDataEntryValue | null, fallback = 0) { const next = Number(value); return Number.isFinite(next) && next >= 0 ? Math.round(next) : fallback; }
function parseJson(value: string): SelectedOptionRow[] { try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed as SelectedOptionRow[] : []; } catch { return []; } }
function tenantScopedRequest(request: NextRequest, tenantSlug: string) { const url = new URL(request.url); url.searchParams.set('tenantId', tenantSlug); return new Request(url, { headers: request.headers }); }
function uniq(values: string[]) { return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean))); }
function tenantCandidates(input: string) { const base = slug(input); const list = [base, base ? `tenant-${base}` : '']; if (base === 'holo-print-sidcup') list.push('holo-print', 'tenant-holo-print'); return uniq(list); }
function normalise(value: unknown) { return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' '); }
function moneyMinor(value: unknown) { const next = Number(value); return Number.isFinite(next) && next > 0 ? Math.round(next) : 0; }
function productName(product: Record<string, any>, fallback: string) { return String(product.name || product.title || product.metadataJson?.name || product.metadataJson?.title || fallback); }

function selectionsFromRows(rows: SelectedOptionRow[]) {
  const selections: Record<string, string> = {};
  for (const row of rows) {
    const key = String(row.key || row.label || '').trim();
    const value = String(row.value || row.label || row.slug || '').trim();
    if (!key || !value) continue;
    selections[key] = value;
    selections[slug(key)] = value;
  }
  return selections;
}

function quantityFromRows(rows: SelectedOptionRow[]) {
  const row = rows.find((item) => ['quantity', 'qty', 'print run', 'print-run', 'run size'].some((term) => normalise(`${item.key || ''} ${item.label || ''}`).includes(term)));
  if (!row) return 0;
  const direct = Number(row.value || row.slug || '');
  if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
  const match = String(row.value || row.slug || '').match(/\d+/);
  return match ? Math.max(1, Math.round(Number(match[0]))) : 0;
}

async function tenantIdsForNativeStore(tenantSlug: string) {
  const candidates = tenantCandidates(tenantSlug);
  try {
    const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug?: string; defaultSubdomain?: string }>>(
      'SELECT id,slug,"defaultSubdomain" FROM "Tenant" WHERE id=$1 OR slug=$1 OR "defaultSubdomain"=$1 LIMIT 1',
      slug(tenantSlug),
    );
    const row = rows[0];
    return uniq([...candidates, row?.id || '', row?.slug || '', row?.defaultSubdomain || '']);
  } catch {
    return candidates;
  }
}

async function loadProductForPricing(request: Request, tenantSlug: string, productSlug: string) {
  const ctx = tenantContextFromRequest(request);

  try {
    const listed = await listInternalCatalog(ctx, 'products', { search: productSlug, limit: 200 }) as any;
    const items = Array.isArray(listed?.items) ? listed.items as Record<string, any>[] : [];
    const exact = items.find((item) => slug(String(item.slug || item.id || item.name || item.title || '')) === productSlug);
    if (exact) return exact;
  } catch {}

  try {
    return await getInternalCatalogRecord(ctx, 'products', productSlug) as Record<string, any>;
  } catch {}

  const ids = await tenantIdsForNativeStore(tenantSlug);
  for (const tenantId of ids) {
    try {
      const rows = await platformPrisma.$queryRawUnsafe<Array<{ id: string; slug: string; name?: string; description?: string; metadataJson: any }>>(
        'SELECT id,slug,name,description,"metadataJson" FROM "CoreCatalogRecord" WHERE "tenantId"=$1 AND resource=$2 AND slug=$3 LIMIT 1',
        tenantId,
        'products',
        productSlug,
      );
      const row = rows[0];
      if (row) return { ...row.metadataJson, id: row.id, slug: row.slug, name: row.name, description: row.description, metadataJson: row.metadataJson } as Record<string, any>;
    } catch {}
  }

  throw new Error(`Product ${productSlug} was not found for pricing.`);
}

async function calculateCheckoutPrice(request: Request, tenantSlug: string, productSlug: string, selectedOptions: SelectedOptionRow[], quantity: number) {
  const product = await loadProductForPricing(request, tenantSlug, productSlug);
  const selections = selectionsFromRows(selectedOptions);
  const resolvedConfig = resolveProductConfig(product, { selections, quantity });
  const matchedRow = resolvedConfig.matchedRow;
  const calculatedMinor = moneyMinor(rowPriceMinor(matchedRow)) || moneyMinor(resolvedConfig.priceMinor);

  if (!matchedRow || calculatedMinor <= 0) {
    throw new Error('No exact SaaS pricing-engine price was found for this product configuration. Check the selected options and quantity in the product pricing matrix.');
  }

  const selectedQuantity = Math.max(1, Math.round(Number(resolvedConfig.selectedQuantity || quantity || 1)));

  return {
    product,
    resolvedConfig,
    matchedRow,
    quantity: selectedQuantity,
    finalPriceMinor: calculatedMinor,
    currency: String(matchedRow.currency || product.currency || product.metadataJson?.pricingMatrix?.currency || 'GBP'),
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
    const postedQuantity = Math.max(1, number(form.get('quantity'), 1));
    const requestedQuantity = quantityFromRows(selectedOptions) || postedQuantity;

    if (!tenantSlug || !storeSlug || !productSlug || !customerName || !customerEmail) return NextResponse.json({ ok: false, error: 'Missing checkout customer or product details.' }, { status: 400 });

    const origin = new URL(request.url).origin;
    const storeBase = `/native-stores/${tenantSlug}/${storeSlug}`;
    const tenantRequest = tenantScopedRequest(request, tenantSlug);
    const price = await calculateCheckoutPrice(tenantRequest, tenantSlug, productSlug, selectedOptions, requestedQuantity);
    const orderNumber = `WEB-${Date.now()}`;
    const lineQuantity = price.quantity;
    const finalPriceMinor = price.finalPriceMinor;
    const unitPriceMinor = Math.max(1, Math.round(finalPriceMinor / lineQuantity));
    const resolvedProductTitle = productName(price.product, productTitle);

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
        'Checkout price calculated by SaaS pricing engine from selected options and quantity.',
        'HOLO launch VAT override: VAT disabled because HOLO is not VAT registered yet.',
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
          product: { id: price.product.id, slug: price.product.slug, name: resolvedProductTitle },
          selections: price.resolvedConfig.selections,
          selectedQuantity: price.resolvedConfig.selectedQuantity,
          selectedDelivery: price.resolvedConfig.selectedDelivery,
          matchedRow: price.matchedRow,
          priceMinor: finalPriceMinor,
          vatRate: 0,
        },
        taxSettings: { taxClass: 'zero', vatRate: 0, preset: 'holo-not-vat-registered' },
        vatRate: 0,
        vatClass: 'zero',
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
        pricingSource: 'saas-pricing-engine',
        vatMode: 'holo-not-vat-registered',
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
