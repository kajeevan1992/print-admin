import { NextResponse } from 'next/server';
import { StorefrontApiError } from '@/core/storefront/storefront-api.service';

export function storefrontStoreId(request: Request) {
  const url = new URL(request.url);
  return String(request.headers.get('x-store-id') || url.searchParams.get('storeId') || '').trim();
}

export function requireMatchingStoreSelectors(request: Request) {
  const url = new URL(request.url);
  const header = String(request.headers.get('x-store-id') || '').trim();
  const query = String(url.searchParams.get('storeId') || '').trim();
  if (header && query && header !== query) {
    throw new StorefrontApiError(403, 'STORE_SELECTOR_MISMATCH', 'x-store-id must match the requested storeId.');
  }
  return header || query;
}

export function storefrontRouteError(cause: unknown) {
  if (cause instanceof StorefrontApiError) {
    return NextResponse.json({ ok: false, error: { code: cause.code, message: cause.message, ...(cause.fieldErrors ? { fieldErrors: cause.fieldErrors } : {}) } }, { status: cause.status });
  }
  const message = cause instanceof Error ? cause.message : 'Storefront API request failed.';
  return NextResponse.json({ ok: false, error: { code: 'STOREFRONT_API_ERROR', message } }, { status: 500 });
}
