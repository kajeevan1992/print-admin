import crypto from 'node:crypto';

const TOKEN_VERSION = 1;
const TOKEN_TTL_SECONDS = 48 * 60 * 60;

export type StorefrontPaymentTokenPayload = {
  v: number;
  tenantSlug: string;
  storeSlug: string;
  orderId: string;
  exp: number;
};

function clean(value: unknown) { return String(value || '').trim(); }
export function paymentSlug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function tokenSecret() {
  const secret = process.env.STOREFRONT_PAYMENT_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.STRIPE_SECRET_KEY || '';
  if (!secret) throw new Error('Storefront payment confirmation is not configured. Add STOREFRONT_PAYMENT_TOKEN_SECRET or STRIPE_SECRET_KEY.');
  return secret;
}
function encode(payload: StorefrontPaymentTokenPayload) { return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url'); }
function signature(encoded: string) { return crypto.createHmac('sha256', tokenSecret()).update(encoded, 'utf8').digest('base64url'); }
function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function paymentOrigin(request: Request) {
  const configured = clean(process.env.NEXT_PUBLIC_STOREFRONT_URL || process.env.STOREFRONT_URL).replace(/\/$/, '');
  if (configured) return configured;
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function createStorefrontPaymentToken(input: { tenantSlug: string; storeSlug: string; orderId: string; expiresInSeconds?: number }) {
  const payload: StorefrontPaymentTokenPayload = {
    v: TOKEN_VERSION,
    tenantSlug: paymentSlug(input.tenantSlug),
    storeSlug: paymentSlug(input.storeSlug),
    orderId: clean(input.orderId),
    exp: Math.floor(Date.now() / 1000) + Math.max(300, Number(input.expiresInSeconds || TOKEN_TTL_SECONDS)),
  };
  const encoded = encode(payload);
  return `${encoded}.${signature(encoded)}`;
}

export function verifyStorefrontPaymentToken(token: string, expected: { tenantSlug: string; storeSlug: string; orderId: string }) {
  const [encoded, suppliedSignature] = clean(token).split('.');
  if (!encoded || !suppliedSignature || !safeEqual(signature(encoded), suppliedSignature)) throw new Error('Payment confirmation token is invalid.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StorefrontPaymentTokenPayload;
  if (payload.v !== TOKEN_VERSION) throw new Error('Payment confirmation token version is invalid.');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Payment confirmation token has expired.');
  if (payload.tenantSlug !== paymentSlug(expected.tenantSlug) || payload.storeSlug !== paymentSlug(expected.storeSlug) || payload.orderId !== clean(expected.orderId)) throw new Error('Payment confirmation token does not match this store or order.');
  return payload;
}

export function buildStorefrontPaymentReturnUrls(request: Request, input: { tenantSlug: string; storeSlug: string; orderId: string; basketId?: string }) {
  const tenantSlug = paymentSlug(input.tenantSlug);
  const storeSlug = paymentSlug(input.storeSlug);
  const token = createStorefrontPaymentToken({ tenantSlug, storeSlug, orderId: input.orderId });
  const base = `${paymentOrigin(request)}/native-stores/${tenantSlug}/${storeSlug}`;
  const success = new URL(`${base}/checkout-success`);
  success.searchParams.set('orderId', input.orderId);
  success.searchParams.set('payment_token', token);
  success.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  if (input.basketId) success.searchParams.set('basketId', input.basketId);
  const cancel = new URL(`${base}/checkout-cancel`);
  cancel.searchParams.set('orderId', input.orderId);
  cancel.searchParams.set('payment_token', token);
  if (input.basketId) cancel.searchParams.set('basketId', input.basketId);
  return { token, successUrl: success.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}'), cancelUrl: cancel.toString() };
}

export function storefrontContextFromReturnUrl(value?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/native-stores\/([^/]+)\/([^/]+)\//i);
    if (!match) return null;
    return { tenantSlug: paymentSlug(match[1]), storeSlug: paymentSlug(match[2]), basketId: clean(url.searchParams.get('basketId')) || undefined };
  } catch {
    return null;
  }
}
