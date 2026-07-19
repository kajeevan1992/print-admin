import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { listFormalQuotes } from '@/core/quotes/formal-quotes.service';
import { accountSummary, attachBasketToCustomer, clearCustomerSessionCookie, customerFromRequest, deleteCustomerAddress, listCustomerAddresses, listCustomerOrders, loginStorefrontCustomer, registerStorefrontCustomer, repeatCustomerOrder, requireCustomerFromRequest, revokeCustomerSession, saveCustomerAddress, setCustomerSessionCookie } from '@/core/storefront/customer-account.service';
import { issueCustomerSecurityToken, resetStorefrontCustomerPassword, verifyStorefrontCustomerEmail } from '@/core/storefront/customer-account-security.service';
import { sendCustomerPasswordResetEmail, sendCustomerVerificationEmail } from '@/core/storefront/customer-account-notifications.service';
import { basketCookieName, newBasketId } from '@/core/storefront/persistent-basket.service';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function bool(value: unknown) { return ['true', '1', 'yes', 'on'].includes(clean(value).toLowerCase()); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }
async function payload(request: NextRequest) { const contentType = request.headers.get('content-type') || ''; if (contentType.includes('application/json')) return request.json().catch(() => ({})); const form = await request.formData(); return Object.fromEntries(form.entries()); }
function safeReturn(value: unknown, tenantSlug: string, storeSlug: string) { const base = `/native-stores/${tenantSlug}/${storeSlug}`; const next = clean(value); return next.startsWith(`${base}/`) || next === base ? next : `${base}/account`; }
async function brandName(tenantSlug: string, storeSlug: string) { const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug).catch(() => null); return settings?.brand?.brandName || settings?.storeName || 'Print store'; }

export async function GET(request: NextRequest) {
  const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug'));
  const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug'));
  if (!tenantSlug || !storeSlug) return json({ ok: false, error: 'Missing storefront account scope.' }, { status: 400 });
  const customer = await customerFromRequest(request, tenantSlug, storeSlug);
  if (!customer) return json({ ok: true, authenticated: false, customer: null });
  const [orders, addresses, quotes] = await Promise.all([listCustomerOrders(customer, tenantSlug, storeSlug), listCustomerAddresses(customer), listFormalQuotes(tenantSlug, { storeSlug, customerEmail: customer.email, customerId: customer.id, limit: 100 })]);
  const summary = accountSummary(orders, addresses);
  return json({ ok: true, authenticated: true, customer, addresses, orders, quotes, summary: { ...summary, quoteCount: quotes.length, quotes } });
}

export async function POST(request: NextRequest) {
  const body = await payload(request);
  const action = clean(body.action).toLowerCase();
  const tenantSlug = slug(body.tenantSlug);
  const storeSlug = slug(body.storeSlug);
  const identifier = [tenantSlug, storeSlug, clean(body.email), action].filter(Boolean).join(':');
  const authAction = ['login', 'register'].includes(action);
  const securityAction = ['request-password-reset', 'reset-password', 'verify-email', 'resend-verification'].includes(action);
  const limit = publicRateLimit(request, { scope: securityAction ? 'storefront-customer-security' : authAction ? 'storefront-customer-auth' : 'storefront-customer-account', limit: securityAction ? 8 : authAction ? 12 : 40, windowMs: 10 * 60 * 1000, identifier });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'storefront-customer-account' }, { status: 429, headers: limit.headers });
  if (!tenantSlug || !storeSlug || !action) return json({ ok: false, error: 'Missing storefront account action.' }, { status: 400, headers: limit.headers });
  try {
    if (action === 'register' || action === 'login') {
      const result = action === 'register' ? await registerStorefrontCustomer({ tenantSlug, storeSlug, email: clean(body.email), password: clean(body.password), name: clean(body.name), phone: clean(body.phone), company: clean(body.company) }) : await loginStorefrontCustomer({ tenantSlug, storeSlug, email: clean(body.email), password: clean(body.password) });
      if (action === 'register') {
        const verification = await issueCustomerSecurityToken({ tenantSlug, storeSlug, email: result.customer.email, purpose: 'verify-email' }, request);
        if (verification?.token) await sendCustomerVerificationEmail(request, { tenantSlug, storeSlug, email: result.customer.email, name: result.customer.name, token: verification.token, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      }
      const response = json({ ok: true, authenticated: true, customer: result.customer, redirectUrl: safeReturn(body.returnUrl, tenantSlug, storeSlug), notice: action === 'register' ? 'Account created. Check your email to verify the address.' : '' }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      const basketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
      if (basketId) await attachBasketToCustomer(request, result.customer, tenantSlug, storeSlug, basketId).catch(() => null);
      return response;
    }
    if (action === 'request-password-reset') {
      const reset = await issueCustomerSecurityToken({ tenantSlug, storeSlug, email: clean(body.email), purpose: 'reset-password' }, request).catch(() => null);
      if (reset?.token) await sendCustomerPasswordResetEmail(request, { tenantSlug, storeSlug, email: reset.customer.email, name: reset.customer.name, token: reset.token, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      return json({ ok: true, notice: 'If an active customer account matches that email, a secure reset link has been sent.' }, { headers: limit.headers });
    }
    if (action === 'resend-verification') {
      const signedIn = await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null);
      const requestedEmail = signedIn?.email || clean(body.email);
      const verification = await issueCustomerSecurityToken({ tenantSlug, storeSlug, email: requestedEmail, purpose: 'verify-email' }, request).catch(() => null);
      if (verification?.token) await sendCustomerVerificationEmail(request, { tenantSlug, storeSlug, email: verification.customer.email, name: verification.customer.name, token: verification.token, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      return json({ ok: true, notice: verification?.alreadyComplete ? 'This email address is already verified.' : 'If the account needs verification, a new secure link has been sent.' }, { headers: limit.headers });
    }
    if (action === 'verify-email') {
      await verifyStorefrontCustomerEmail({ tenantSlug, storeSlug, token: clean(body.token) });
      const signedIn = await customerFromRequest(request, tenantSlug, storeSlug).catch(() => null);
      return json({ ok: true, verified: true, notice: 'Your email address is verified.', redirectUrl: signedIn ? `${safeReturn(body.returnUrl, tenantSlug, storeSlug)}?verified=1` : `/native-stores/${tenantSlug}/${storeSlug}/login?verified=1` }, { headers: limit.headers });
    }
    if (action === 'reset-password') {
      const password = clean(body.password);
      if (password !== clean(body.passwordConfirm)) return json({ ok: false, error: 'The two passwords do not match.' }, { status: 400, headers: limit.headers });
      const result = await resetStorefrontCustomerPassword({ tenantSlug, storeSlug, token: clean(body.token), password });
      const response = json({ ok: true, authenticated: true, customer: result.customer, notice: 'Your password has been changed and other customer sessions were signed out.', redirectUrl: `${safeReturn(body.returnUrl, tenantSlug, storeSlug)}?passwordReset=1` }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      return response;
    }
    if (action === 'logout') { await revokeCustomerSession(request, tenantSlug, storeSlug); const response = json({ ok: true, authenticated: false, redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}` }, { headers: limit.headers }); clearCustomerSessionCookie(response, tenantSlug, storeSlug); return response; }
    const customer = await requireCustomerFromRequest(request, tenantSlug, storeSlug);
    if (action === 'save-address') { const address = await saveCustomerAddress(customer, { id: clean(body.id) || undefined, label: clean(body.label), recipientName: clean(body.recipientName), company: clean(body.company), line1: clean(body.line1), line2: clean(body.line2), town: clean(body.town), county: clean(body.county), postcode: clean(body.postcode), country: clean(body.country), phone: clean(body.phone), isDefaultShipping: bool(body.isDefaultShipping), isDefaultBilling: bool(body.isDefaultBilling) }); return json({ ok: true, address, addresses: await listCustomerAddresses(customer) }, { headers: limit.headers }); }
    if (action === 'delete-address') { await deleteCustomerAddress(customer, clean(body.id)); return json({ ok: true, addresses: await listCustomerAddresses(customer) }, { headers: limit.headers }); }
    if (action === 'repeat-order') { const cookieName = basketCookieName(tenantSlug, storeSlug); const existingBasketId = clean(request.cookies.get(cookieName)?.value); const basketId = existingBasketId || newBasketId(); const basket = await repeatCustomerOrder(request, customer, tenantSlug, storeSlug, clean(body.orderId), basketId); const response = json({ ok: true, basket: { id: basket.id, lineCount: basket.lineCount, itemCount: basket.itemCount, formattedTotal: basket.formattedTotal }, redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/cart` }, { headers: limit.headers }); if (!existingBasketId) response.cookies.set(cookieName, basket.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 24 * 60 * 60 }); return response; }
    return json({ ok: false, error: 'Unsupported customer account action.' }, { status: 400, headers: limit.headers });
  } catch (error) { return json({ ok: false, source: 'storefront-customer-account', error: error instanceof Error ? error.message : 'Customer account action failed.' }, { status: authAction ? 401 : 400, headers: limit.headers }); }
}
