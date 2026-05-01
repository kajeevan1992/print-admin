import { NextResponse } from 'next/server';
import { buildCartItem, summarizeCart, type StorefrontCartInput } from '@/core/storefront/cart-checkout-bridge';

export type StorefrontErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_CART_ITEM'
  | 'INVALID_OPTION'
  | 'INVALID_PRICE'
  | 'VAT_MISMATCH'
  | 'CART_EMPTY'
  | 'CUSTOMER_INVALID'
  | 'ARTWORK_REQUIRED'
  | 'PREFLIGHT_REQUIRED'
  | 'PREFLIGHT_BLOCKED'
  | 'NOT_FOUND'
  | 'STORE_FRONT_ERROR';

export class StorefrontHttpError extends Error {
  code: StorefrontErrorCode;
  field?: string;
  status: number;
  details?: unknown;

  constructor(code: StorefrontErrorCode, message: string, status = 400, field?: string, details?: unknown) {
    super(message);
    this.name = 'StorefrontHttpError';
    this.code = code;
    this.field = field;
    this.status = status;
    this.details = details;
  }
}

type StorefrontErrorPayload = {
  code: StorefrontErrorCode;
  message: string;
  field?: string;
  details?: unknown;
};

function asMoney(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.round(next) : 0;
}

function asQuantity(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? Math.round(next) : 0;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingOptionValue(value: unknown) {
  if (value == null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export async function readStorefrontBody(request: Request) {
  try {
    const body = await request.json();
    return isPlainObject(body) ? body : {};
  } catch {
    return {};
  }
}

export function storefrontSuccess(source: string, data: unknown, status = 200) {
  return NextResponse.json({ ok: true, source, data }, { status });
}

export function storefrontError(source: string, error: unknown, fallbackStatus = 500) {
  const payload = toStorefrontError(error);
  const status = error instanceof StorefrontHttpError ? error.status : statusForStorefrontError(payload, fallbackStatus);
  return NextResponse.json({ ok: false, source, error: payload }, { status });
}

export function toStorefrontError(error: unknown): StorefrontErrorPayload {
  if (error instanceof StorefrontHttpError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.field ? { field: error.field } : {}),
      ...(error.details ? { details: error.details } : {}),
    };
  }

  const message = error instanceof Error ? error.message : 'Storefront request failed.';
  const lower = message.toLowerCase();
  const code: StorefrontErrorCode = lower.includes('not found')
    ? 'NOT_FOUND'
    : lower.includes('cart is empty')
      ? 'CART_EMPTY'
      : lower.includes('artwork')
        ? 'ARTWORK_REQUIRED'
        : lower.includes('preflight')
          ? 'PREFLIGHT_BLOCKED'
          : 'STORE_FRONT_ERROR';
  return { code, message };
}

function statusForStorefrontError(payload: StorefrontErrorPayload, fallbackStatus: number) {
  if (payload.code === 'NOT_FOUND') return 404;
  if (payload.code === 'STORE_FRONT_ERROR') return fallbackStatus;
  return 400;
}

export function validateStorefrontCartInput(input: StorefrontCartInput) {
  const productKey = String(input.productId || input.productSlug || input.slug || input.productName || input.title || '').trim();
  if (!productKey) {
    throw new StorefrontHttpError('INVALID_CART_ITEM', 'Cart item requires a product id, slug, or product name.', 400, 'productId');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'quantity') && asQuantity(input.quantity) <= 0) {
    throw new StorefrontHttpError('INVALID_CART_ITEM', 'Cart quantity must be greater than zero.', 400, 'quantity');
  }

  const options = input.selections ?? input.options;
  if (options != null && !isPlainObject(options)) {
    throw new StorefrontHttpError('INVALID_OPTION', 'Cart options must be sent as an object.', 400, 'options');
  }

  if (isPlainObject(options)) {
    for (const [key, value] of Object.entries(options)) {
      if (isMissingOptionValue(value)) {
        throw new StorefrontHttpError('INVALID_OPTION', `Missing option value for ${key}.`, 400, `options.${key}`);
      }
    }
  }

  if (input.addOns != null && !Array.isArray(input.addOns)) {
    throw new StorefrontHttpError('INVALID_OPTION', 'Add-ons must be sent as an array.', 400, 'addOns');
  }
}

export function validateCartItemIntegrity(item: Record<string, any>, index = 0) {
  if (!item.id) throw new StorefrontHttpError('INVALID_CART_ITEM', 'Cart item is missing an id.', 400, `items.${index}.id`);
  if (!item.productId && !item.productSlug && !item.productName) {
    throw new StorefrontHttpError('INVALID_CART_ITEM', 'Cart item is missing product information.', 400, `items.${index}.productId`);
  }
  if (asQuantity(item.quantity) <= 0) {
    throw new StorefrontHttpError('INVALID_CART_ITEM', 'Cart item quantity must be greater than zero.', 400, `items.${index}.quantity`);
  }

  const net = asMoney(item.netTotalMinor);
  const vat = asMoney(item.vatTotalMinor);
  const gross = asMoney(item.grossTotalMinor);
  if (gross !== net + vat) {
    throw new StorefrontHttpError('INVALID_PRICE', 'Cart item totals do not reconcile.', 400, `items.${index}.grossTotalMinor`, { netTotalMinor: net, vatTotalMinor: vat, grossTotalMinor: gross });
  }

  const expectedVat = Math.round(net * (Number(item.vatRate || 0) / 100));
  if (Math.abs(expectedVat - vat) > 1) {
    throw new StorefrontHttpError('VAT_MISMATCH', 'Cart item VAT does not match its VAT rate.', 400, `items.${index}.vatTotalMinor`, { expectedVatTotalMinor: expectedVat, vatTotalMinor: vat, vatRate: item.vatRate });
  }

  const addOns = Array.isArray(item.addOns) ? item.addOns : [];
  addOns.forEach((addOn: Record<string, any>, addOnIndex: number) => {
    const addOnNet = asMoney(addOn.netTotalMinor);
    const addOnVat = asMoney(addOn.vatTotalMinor);
    const addOnGross = asMoney(addOn.grossTotalMinor);
    if (addOnGross !== addOnNet + addOnVat) {
      throw new StorefrontHttpError('INVALID_PRICE', 'Add-on totals do not reconcile.', 400, `items.${index}.addOns.${addOnIndex}.grossTotalMinor`);
    }
    if (addOnNet > 0 && Number(addOn.vatRate || 0) !== 20) {
      throw new StorefrontHttpError('VAT_MISMATCH', 'Add-on services must be standard VAT rated.', 400, `items.${index}.addOns.${addOnIndex}.vatRate`);
    }
  });
}

export async function recalculateCartSnapshot(request: Request, items: Array<Record<string, any>>) {
  const recalculated = await Promise.all(items.map((item) => buildCartItem(request, item as StorefrontCartInput)));
  recalculated.forEach((item, index) => validateCartItemIntegrity(item, index));
  return recalculated;
}

export function validateCartSnapshot(items: Array<Record<string, any>>) {
  items.forEach((item, index) => validateCartItemIntegrity(item, index));
  return items;
}

function itemArtworkUploads(item: Record<string, any>) {
  if (Array.isArray(item.artwork?.uploads)) return item.artwork.uploads;
  if (Array.isArray(item.artworkUploads)) return item.artworkUploads;
  return [];
}

function normaliseStatus(value: unknown) {
  return String(value || '').toLowerCase().trim();
}

export function validateCheckoutReadiness(items: Array<Record<string, any>>) {
  if (!items.length) {
    throw new StorefrontHttpError('CART_EMPTY', 'Cart is empty. Add an item before checkout.', 400, 'cart');
  }

  validateCartSnapshot(items);

  items.forEach((item, index) => {
    const artwork = item.artwork || {};
    const artworkRequired = artwork.required !== false;
    if (!artworkRequired) return;

    const uploads = itemArtworkUploads(item);
    const preflightStatus = normaliseStatus(artwork.preflightStatus || item.preflightStatus);
    const artworkStatus = normaliseStatus(artwork.status || item.artworkStatus);
    const overridden = preflightStatus === 'override' || artworkStatus === 'override';
    const passed = preflightStatus === 'pass' || artworkStatus === 'preflight-passed' || overridden;
    const blocked = Boolean(artwork.productionBlock || item.productionBlocked) || preflightStatus === 'fail' || artworkStatus === 'preflight-failed';

    if (!uploads.length) {
      throw new StorefrontHttpError('ARTWORK_REQUIRED', 'Artwork is required before checkout.', 400, `items.${index}.artwork`);
    }

    if (blocked && !overridden) {
      throw new StorefrontHttpError('PREFLIGHT_BLOCKED', 'Preflight failed. Fix artwork or apply an authorised override before checkout.', 400, `items.${index}.artwork.preflightStatus`, artwork.issues || item.preflightIssues || []);
    }

    if (!passed) {
      throw new StorefrontHttpError('PREFLIGHT_REQUIRED', 'Preflight must pass or be overridden before checkout.', 400, `items.${index}.artwork.preflightStatus`);
    }
  });
}

export function buildStorefrontReadinessReport(params: {
  items: Array<Record<string, any>>;
  draftOrders?: Array<Record<string, any>>;
  artworkRecords?: Array<Record<string, any>>;
  preflightRecords?: Array<Record<string, any>>;
}) {
  const { items, draftOrders = [], artworkRecords = [], preflightRecords = [] } = params;
  const totals = summarizeCart(items);
  const errors: StorefrontErrorPayload[] = [];

  try {
    if (!items.length) throw new StorefrontHttpError('CART_EMPTY', 'Cart is empty. Add an item before checkout.', 400, 'cart');
    validateCartSnapshot(items);
  } catch (error) {
    errors.push(toStorefrontError(error));
  }

  try {
    validateCheckoutReadiness(items);
  } catch (error) {
    errors.push(toStorefrontError(error));
  }

  const lines = items.flatMap((item) => [item, ...(Array.isArray(item.addOns) ? item.addOns : [])]);
  const vatCheck = {
    ok: !errors.some((error) => error.code === 'VAT_MISMATCH'),
    expectedVatTotalMinor: lines.reduce((sum, line) => sum + Math.round(asMoney(line.netTotalMinor) * (Number(line.vatRate || 0) / 100)), 0),
    actualVatTotalMinor: totals.vatTotalMinor,
    breakdown: totals.vatBreakdown,
  };

  const pricingCheck = {
    ok: !errors.some((error) => error.code === 'INVALID_PRICE'),
    netTotalMinor: totals.netTotalMinor,
    vatTotalMinor: totals.vatTotalMinor,
    grossTotalMinor: totals.grossTotalMinor,
    pricingSources: Array.from(new Set(items.map((item) => item.pricingSource || item.pricing?.source || 'internal'))),
  };

  const artworkStatus = items.map((item, index) => {
    const artwork = item.artwork || {};
    const preflightStatus = normaliseStatus(artwork.preflightStatus || item.preflightStatus || 'pending');
    return {
      index,
      cartItemId: item.id,
      productId: item.productId,
      productSlug: item.productSlug,
      required: artwork.required !== false,
      uploadCount: itemArtworkUploads(item).length,
      status: artwork.status || item.artworkStatus || 'not-uploaded',
      preflightStatus,
      productionBlock: Boolean(artwork.productionBlock || item.productionBlocked),
      issues: artwork.issues || item.preflightIssues || [],
    };
  });

  return {
    ready: errors.length === 0 && items.length > 0,
    readinessFlags: {
      hasCartItems: items.length > 0,
      pricingOk: pricingCheck.ok,
      vatOk: vatCheck.ok,
      artworkOk: !errors.some((error) => error.code === 'ARTWORK_REQUIRED'),
      preflightOk: !errors.some((error) => error.code === 'PREFLIGHT_REQUIRED' || error.code === 'PREFLIGHT_BLOCKED'),
    },
    cartState: { items, totals },
    pricingCheck,
    vatCheck,
    artworkStatus,
    preflightRecords,
    artworkRecords,
    draftOrders,
    errors,
    checkedAt: new Date().toISOString(),
  };
}
