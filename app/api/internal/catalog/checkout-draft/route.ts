export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getInternalCatalogRecord, upsertInternalCatalogRecord } from '@/core/catalog/internal-catalog.service';
import { tenantContextFromRequest } from '@/core/tenant/context';

const CONFIG_RESOURCE = 'admin-config' as any;
const CART_KEY = 'storefront-test-cart';
const DRAFT_ORDER_KEY = 'quote-draft-orders';

type CustomerDetails = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
};

type CartItem = Record<string, any> & {
  id?: string;
  productName?: string;
  quantity?: number;
  currency?: string;
  grossTotalMinor?: number;
  selections?: Record<string, unknown>;
  pricing?: Record<string, any>;
};

type DraftOrderRecord = Record<string, any>;

function responseError(error: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Checkout draft request failed.' }, { status });
}

function makeId(prefix = 'checkout-draft') {
  return `${prefix}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function cleanCustomer(input: CustomerDetails): Required<CustomerDetails> {
  return {
    name: String(input.name || '').trim(),
    email: String(input.email || '').trim(),
    phone: String(input.phone || '').trim(),
    company: String(input.company || '').trim(),
  };
}

function validateCustomer(customer: Required<CustomerDetails>) {
  const errors: string[] = [];
  if (!customer.name) errors.push('Customer name is required.');
  if (!customer.email) errors.push('Email is required.');
  if (!customer.phone) errors.push('Phone is required.');
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errors.push('Enter a valid email address.');
  return errors;
}

function itemGross(item: CartItem) {
  return Number(item.grossTotalMinor || item.pricing?.sellPriceMinor || item.pricing?.grossTotalMinor || 0);
}

function itemVat(item: CartItem) {
  return Number(item.pricing?.vatMinor || item.pricing?.vatTotalMinor || item.vatMinor || 0);
}

function itemTurnaround(item: CartItem) {
  return item.turnaround || item.pricing?.turnaround || item.pricing?.selectedTurnaround || item.pricing?.turnaroundLabel || null;
}

function itemDeliveryEstimate(item: CartItem) {
  return item.deliveryEstimate || item.pricing?.deliveryEstimate || item.pricing?.estimatedDelivery || item.pricing?.deliveryDate || null;
}

function itemArtworkUploads(item: CartItem) {
  const uploads = (item as any).artworkUploads || (item as any).artwork?.uploads || [];
  return Array.isArray(uploads) ? uploads : [];
}

async function readCartItems(request: NextRequest): Promise<CartItem[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, CART_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function readDrafts(request: NextRequest): Promise<DraftOrderRecord[]> {
  try {
    const record = await getInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, DRAFT_ORDER_KEY);
    const items = (record as any)?.metadataJson?.items;
    return Array.isArray(items) ? items : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('was not found')) return [];
    throw error;
  }
}

async function saveDrafts(request: NextRequest, items: DraftOrderRecord[]) {
  return upsertInternalCatalogRecord(tenantContextFromRequest(request), CONFIG_RESOURCE, {
    id: DRAFT_ORDER_KEY,
    slug: DRAFT_ORDER_KEY,
    name: 'Quote draft orders',
    description: 'Draft order records generated from pricing/quote lab and storefront checkout payloads',
    metadataJson: {
      items,
      savedAt: new Date().toISOString(),
      storageKey: DRAFT_ORDER_KEY,
      source: 'CheckoutDraftWorkflow',
    },
  } as any);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const customer = cleanCustomer(body.customer || body);
    const customerErrors = validateCustomer(customer);
    if (customerErrors.length > 0) return responseError(new Error(customerErrors.join(' ')), 400);

    const cartItems = await readCartItems(request);
    if (cartItems.length === 0) return responseError(new Error('Cart is empty. Add a priced item before checkout.'), 400);

    const missingPricing = cartItems.some((item) => !item.pricing && itemGross(item) <= 0);
    if (missingPricing) return responseError(new Error('Every cart item must have pricing before checkout.'), 400);

    const missingArtwork = cartItems.some((item) => itemArtworkUploads(item).length === 0);
    if (missingArtwork) return responseError(new Error('Every cart item must have artwork uploaded before checkout draft confirmation.'), 400);

    const currency = String(cartItems[0]?.currency || cartItems[0]?.pricing?.currency || 'GBP');
    const grossTotalMinor = cartItems.reduce((sum, item) => sum + itemGross(item), 0);
    const vatTotalMinor = cartItems.reduce((sum, item) => sum + itemVat(item), 0);
    const netTotalMinor = Math.max(0, grossTotalMinor - vatTotalMinor);
    const now = new Date().toISOString();
    const id = makeId();
    const quoteReference = `CHECKOUT-${Date.now()}`;

    const structuredItems = cartItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName || item.title || 'Cart item',
      quantity: Number(item.quantity || 1),
      selections: item.selections || {},
      pricing: item.pricing || {},
      currency: String(item.currency || item.pricing?.currency || currency),
      netTotalMinor: Math.max(0, itemGross(item) - itemVat(item)),
      vatTotalMinor: itemVat(item),
      grossTotalMinor: itemGross(item),
      turnaround: itemTurnaround(item),
      deliveryEstimate: itemDeliveryEstimate(item),
      artworkUploads: itemArtworkUploads(item),
      artwork: {
        status: itemArtworkUploads(item).length > 0 ? 'artwork-received' : 'missing-artwork',
        uploads: itemArtworkUploads(item),
        notes: (item as any).artwork?.notes || '',
      },
    }));

    const payload = {
      id,
      quoteReference,
      status: 'draft-order',
      source: 'StorefrontTestCheckoutDraft',
      customer,
      items: structuredItems,
      totals: {
        currency,
        netTotalMinor,
        vatTotalMinor,
        grossTotalMinor,
      },
      turnaround: structuredItems.map((item) => item.turnaround).filter(Boolean),
      deliveryEstimate: structuredItems.map((item) => item.deliveryEstimate).filter(Boolean),
      artworkUploads: structuredItems.flatMap((item) => item.artworkUploads || []),
      artworkStatus: structuredItems.every((item) => (item.artworkUploads || []).length > 0) ? 'artwork-received' : 'missing-artwork',
      createdAt: now,
    };

    const title = `${quoteReference} - ${customer.name} - ${cartItems.length} cart item${cartItems.length === 1 ? '' : 's'}`;
    const draft = {
      id,
      title,
      name: title,
      status: 'draft-order',
      quoteReference,
      customerName: customer.name,
      customerEmail: customer.email,
      productName: `${cartItems.length} cart item${cartItems.length === 1 ? '' : 's'}`,
      quantity: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      currency,
      netTotalMinor,
      vatTotalMinor,
      grossTotalMinor,
      payload,
      createdAt: now,
      updatedAt: now,
      source: 'StorefrontTestCheckoutDraft',
    };

    const existingDrafts = await readDrafts(request);
    const record = await saveDrafts(request, [draft, ...existingDrafts.filter((item) => String(item.id) !== id)]);
    return NextResponse.json({ ok: true, source: 'internal-checkout-draft-db', data: record, item: draft });
  } catch (error) {
    return responseError(error);
  }
}
