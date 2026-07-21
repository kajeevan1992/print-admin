export const STOREFRONT_PRIVATE_ROUTE_TITLES: Record<string, string> = {
  login: 'Customer sign in',
  'two-step': 'Two-step verification',
  register: 'Create customer account',
  'forgot-password': 'Forgot password',
  'reset-password': 'Reset password',
  'verify-email': 'Verify email',
  'confirm-email-change': 'Confirm email change',
  'artwork-proof': 'Artwork proof',
  account: 'Customer account',
  'quote-status': 'Quote status',
  'checkout-success': 'Order confirmation',
  'checkout-cancel': 'Checkout cancelled',
  cart: 'Basket',
  quote: 'Request a quote',
  search: 'Search results',
};

export const STOREFRONT_SENSITIVE_URL_ROUTES = new Set([
  'reset-password',
  'verify-email',
  'confirm-email-change',
  'artwork-proof',
]);

export function isStorefrontPrivateRouteRoot(value: string | null | undefined) {
  return Boolean(STOREFRONT_PRIVATE_ROUTE_TITLES[String(value || '').trim().toLowerCase()]);
}

export function storefrontRouteRootFromPathname(pathname: string) {
  const match = String(pathname || '').match(/^\/native-stores\/[^/]+\/[^/]+(?:\/([^/?#]+))?/i);
  return String(match?.[1] || '').trim().toLowerCase();
}
