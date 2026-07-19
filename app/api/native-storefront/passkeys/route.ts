import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { attachBasketToCustomer, customerFromRequest, requireCustomerFromRequest, setCustomerSessionCookie } from '@/core/storefront/customer-account.service';
import { sendCustomerPasskeySecurityEmail } from '@/core/storefront/customer-account-notifications.service';
import {
  beginStorefrontCustomerPasskeyLogin,
  beginStorefrontCustomerPasskeyRegistration,
  clearCustomerPasskeyChallengeCookie,
  completeStorefrontCustomerPasskeyLogin,
  completeStorefrontCustomerPasskeyRegistration,
  listStorefrontCustomerPasskeys,
  revokeStorefrontCustomerPasskey,
  setCustomerPasskeyChallengeCookie,
} from '@/core/storefront/customer-passkey.service';
import { basketCookieName } from '@/core/storefront/persistent-basket.service';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }
function safeReturn(value: unknown, tenantSlug: string, storeSlug: string) { const base = `/native-stores/${tenantSlug}/${storeSlug}`; const next = clean(value); return next.startsWith(`${base}/`) || next === base ? next : `${base}/account`; }
async function payload(request: NextRequest) { const contentType = request.headers.get('content-type') || ''; if (contentType.includes('application/json')) return request.json().catch(() => ({})); const form = await request.formData(); return Object.fromEntries(form.entries()); }
async function brandName(tenantSlug: string, storeSlug: string) { const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug).catch(() => null); return settings?.brand?.brandName || settings?.storeName || 'Print store'; }

export async function GET(request: NextRequest) {
  const tenantSlug = slug(request.nextUrl.searchParams.get('tenantSlug'));
  const storeSlug = slug(request.nextUrl.searchParams.get('storeSlug'));
  if (!tenantSlug || !storeSlug) return json({ ok: false, error: 'Missing storefront passkey scope.' }, { status: 400 });
  const customer = await customerFromRequest(request, tenantSlug, storeSlug);
  if (!customer) return json({ ok: true, authenticated: false, passkeys: [] });
  return json({ ok: true, authenticated: true, passkeys: await listStorefrontCustomerPasskeys(customer, storeSlug) });
}

export async function POST(request: NextRequest) {
  const body = await payload(request);
  const action = clean(body.action).toLowerCase();
  const tenantSlug = slug(body.tenantSlug);
  const storeSlug = slug(body.storeSlug);
  const publicAction = ['begin-passkey-login', 'complete-passkey-login'].includes(action);
  const identifier = [tenantSlug, storeSlug, action, request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()].filter(Boolean).join(':');
  const limit = publicRateLimit(request, { scope: publicAction ? 'storefront-customer-passkey-login' : 'storefront-customer-passkey-security', limit: publicAction ? 12 : 8, windowMs: 10 * 60 * 1000, identifier });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'storefront-customer-passkeys' }, { status: 429, headers: limit.headers });
  if (!tenantSlug || !storeSlug || !action) return json({ ok: false, error: 'Missing storefront passkey action.' }, { status: 400, headers: limit.headers });

  try {
    if (action === 'begin-passkey-login') {
      const returnUrl = safeReturn(body.returnUrl, tenantSlug, storeSlug);
      const result = await beginStorefrontCustomerPasskeyLogin(request, { tenantSlug, storeSlug, returnUrl });
      const response = json({ ok: true, options: result.options }, { headers: limit.headers });
      setCustomerPasskeyChallengeCookie(response, tenantSlug, storeSlug, 'authentication', result.challengeToken, result.expiresAt);
      return response;
    }

    if (action === 'complete-passkey-login') {
      const result = await completeStorefrontCustomerPasskeyLogin(request, { tenantSlug, storeSlug, response: body.response });
      const response = json({ ok: true, authenticated: true, customer: result.customer, notice: 'Signed in securely with your passkey.', redirectUrl: safeReturn(result.returnUrl || body.returnUrl, tenantSlug, storeSlug) }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      clearCustomerPasskeyChallengeCookie(response, tenantSlug, storeSlug, 'authentication');
      const basketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
      if (basketId) await attachBasketToCustomer(request, result.customer, tenantSlug, storeSlug, basketId).catch(() => null);
      return response;
    }

    const customer = await requireCustomerFromRequest(request, tenantSlug, storeSlug);

    if (action === 'begin-passkey-registration') {
      const result = await beginStorefrontCustomerPasskeyRegistration(request, customer, { tenantSlug, storeSlug, currentPassword: clean(body.currentPassword), twoStepCode: clean(body.twoStepCode), brandName: await brandName(tenantSlug, storeSlug) });
      const response = json({ ok: true, options: result.options, notice: 'Confirm the passkey using your device.' }, { headers: limit.headers });
      setCustomerPasskeyChallengeCookie(response, tenantSlug, storeSlug, 'registration', result.challengeToken, result.expiresAt);
      return response;
    }

    if (action === 'complete-passkey-registration') {
      const passkey = await completeStorefrontCustomerPasskeyRegistration(request, customer, { tenantSlug, storeSlug, name: clean(body.name), response: body.response });
      const passkeys = await listStorefrontCustomerPasskeys(customer, storeSlug);
      await sendCustomerPasskeySecurityEmail(request, { tenantSlug, storeSlug, email: customer.email, name: customer.name, event: 'added', passkeyName: passkey.name, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      const response = json({ ok: true, passkey, passkeys, notice: `${passkey.name} was added to your customer account.` }, { headers: limit.headers });
      clearCustomerPasskeyChallengeCookie(response, tenantSlug, storeSlug, 'registration');
      return response;
    }

    if (action === 'revoke-passkey') {
      const current = await listStorefrontCustomerPasskeys(customer, storeSlug);
      const target = current.find((item) => item.id === clean(body.passkeyId));
      await revokeStorefrontCustomerPasskey(customer, { storeSlug, passkeyId: clean(body.passkeyId), currentPassword: clean(body.currentPassword), twoStepCode: clean(body.twoStepCode) });
      const passkeys = await listStorefrontCustomerPasskeys(customer, storeSlug);
      await sendCustomerPasskeySecurityEmail(request, { tenantSlug, storeSlug, email: customer.email, name: customer.name, event: 'removed', passkeyName: target?.name || 'Passkey', brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      return json({ ok: true, passkeys, notice: `${target?.name || 'The passkey'} was removed.` }, { headers: limit.headers });
    }

    return json({ ok: false, error: 'Unsupported passkey action.' }, { status: 400, headers: limit.headers });
  } catch (error) {
    const response = json({ ok: false, source: 'storefront-customer-passkeys', error: error instanceof Error ? error.message : 'Passkey action failed.' }, { status: publicAction ? 401 : 400, headers: limit.headers });
    if (action === 'complete-passkey-login') clearCustomerPasskeyChallengeCookie(response, tenantSlug, storeSlug, 'authentication');
    if (action === 'complete-passkey-registration') clearCustomerPasskeyChallengeCookie(response, tenantSlug, storeSlug, 'registration');
    return response;
  }
}
