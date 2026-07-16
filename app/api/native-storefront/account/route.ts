import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import {
  accountSummary,
  attachBasketToCustomer,
  clearCustomerSessionCookie,
  customerFromRequest,
  customerSessionCookieName,
  deleteCustomerAddress,
  listCustomerAddresses,
  listCustomerOrders,
  loginStorefrontCustomer,
  registerStorefrontCustomer,
  repeatCustomerOrder,
  requireCustomerFromRequest,
  revokeCustomerSession,
  saveCustomerAddress,
  setCustomerSessionCookie,
} from '@/core/storefront/customer-account.service';
import { basketCookieName, newBasketId } from '@/core/storefront/persistent-basket.service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function bool(value: unknown) { return ['true', '1', 'yes', 'on'].includes(clean(value).toLowerCase()); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }
async function payload(request: NextRequest) { const contentType = request.headers.get('content-type') || ''; if (contentType.includes('application/json')) return request.json().catch(() => ({})); const form = await request.formData(); return Object.fromEntries(form.entries()); }
function safeReturn(value: unknown, tenantSlug: string, storeSlug: string) { const base = `/native-stores/${tenantSlug}/${storeSlug}`; const next = clean(value); return next.startsWith(`${base}/`) || next === base ? next : `${base}/account`; }

export async function GET(request: NextRequest) {
  const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug'));
  const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug'));
  if (!tenantSlug || !storeSlug) return json({ ok: false, error: 'Missing storefront account scope.' }, { status: 400 });
  const customer = await customerFromRequest(request, tenantSlug, storeSlug);
  if (!customer) return json({ ok: true, authenticated: false, customer: null });
  const [orders, addresses] = await Promise.all([listCustomerOrders(customer, tenantSlug, storeSlug), listCustomerAddresses(customer)]);
  return json({ ok: true, authenticated: true, customer, addresses, orders, summary: accountSummary(orders, addresses) });
}

export async function POST(request: NextRequest) {
  const body = await payload(request);
  const action = clean(body.action).toLowerCase();
  const tenantSlug = slug(body.tenantSlug);
  const storeSlug = slug(body.storeSlug);
  const identifier = [tenantSlug, storeSlug, clean(body.email), action].filter(Boolean).join(':');
  const authAction = ['login', 'register'].includes(action);
  const limit = publicRateLimit(request, { scope: authAction ? 'storefront-customer-auth' : 'storefront-customer-account', limit: authAction ? 12 : 40, windowMs: 10 * 60 * 1000, identifier });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'storefront-customer-account' }, { status: 429, headers: limit.headers });
  if (!tenantSlug || !storeSlug || !action) return json({ ok: false, error: 'Missing storefront account action.' }, { status: 400, headers: limit.headers });

  try {
    if (action === 'register' || action === 'login') {
      const result = action === 'register'
        ? await registerStorefrontCustomer({ tenantSlug, storeSlug, email: clean(body.email), password: clean(body.password), name: clean(body.name), phone: clean(body.phone), company: clean(body.company) })
        : await loginStorefrontCustomer({ tenantSlug, storeSlug, email: clean(body.email), password: clean(body.password) });
      const response = json({ ok: true, authenticated: true, customer: result.customer, redirectUrl: safeReturn(body.returnUrl, tenantSlug, storeSlug) }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      const basketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
      if (basketId) await attachBasketToCustomer(request, result.customer, tenantSlug, storeSlug, basketId).catch(() => null);
      return response;
    }

    if (action === 'logout') {
      await revokeCustomerSession(request, tenantSlug, storeSlug);
      const response = json({ ok: true, authenticated: false, redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}` }, { headers: limit.headers });
      clearCustomerSessionCookie(response, tenantSlug, storeSlug);
      return response;
    }

    const customer = await requireCustomerFromRequest(request, tenantSlug, storeSlug);

    if (action === 'save-address') {
      const address = await saveCustomerAddress(customer, {
        id: clean(body.id) || undefined,
        label: clean(body.label),
        recipientName: clean(body.recipientName),
        company: clean(body.company),
        line1: clean(body.line1),
        line2: clean(body.line2),
        town: clean(body.town),
        county: clean(body.county),
        postcode: clean(body.postcode),
        country: clean(body.country),
        phone: clean(body.phone),
        isDefaultShipping: bool(body.isDefaultShipping),
        isDefaultBilling: bool(body.isDefaultBilling),
      });
      return json({ ok: true, address, addresses: await listCustomerAddresses(customer) }, { headers: limit.headers });
    }

    if (action === 'delete-address') {
      await deleteCustomerAddress(customer, clean(body.id));
      return json({ ok: true, addresses: await listCustomerAddresses(customer) }, { headers: limit.headers });
    }

    if (action === 'repeat-order') {
      const cookieName = basketCookieName(tenantSlug, storeSlug);
      const existingBasketId = clean(request.cookies.get(cookieName)?.value);
      const basketId = existingBasketId || newBasketId();
      const basket = await repeatCustomerOrder(request, customer, tenantSlug, storeSlug, clean(body.orderId), basketId);
      const response = json({ ok: true, basket: { id: basket.id, lineCount: basket.lineCount, itemCount: basket.itemCount, formattedTotal: basket.formattedTotal }, redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/cart` }, { headers: limit.headers });
      if (!existingBasketId) response.cookies.set(cookieName, basket.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 24 * 60 * 60 });
      return response;
    }

    return json({ ok: false, error: 'Unsupported customer account action.' }, { status: 400, headers: limit.headers });
  } catch (error) {
    return json({ ok: false, source: 'storefront-customer-account', error: error instanceof Error ? error.message : 'Customer account action failed.' }, { status: authAction ? 401 : 400, headers: limit.headers });
  }
}
