import { NextRequest, NextResponse } from 'next/server';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { listFormalQuotes } from '@/core/quotes/formal-quotes.service';
import { accountSummary, attachBasketToCustomer, clearCustomerSessionCookie, customerFromRequest, deleteCustomerAddress, listCustomerAddresses, listCustomerOrders, registerStorefrontCustomer, repeatCustomerOrder, requireCustomerFromRequest, revokeCustomerSession, saveCustomerAddress, setCustomerSessionCookie } from '@/core/storefront/customer-account.service';
import { issueCustomerSecurityToken, resetStorefrontCustomerPassword, verifyStorefrontCustomerEmail } from '@/core/storefront/customer-account-security.service';
import { sendCustomerEmailChangeCompletedEmails, sendCustomerNewEmailChangeVerification, sendCustomerOldEmailChangeConfirmation, sendCustomerPasswordChangedEmail, sendCustomerPasswordResetEmail, sendCustomerTwoStepSecurityEmail, sendCustomerVerificationEmail } from '@/core/storefront/customer-account-notifications.service';
import { cancelStorefrontCustomerEmailChange, confirmStorefrontCustomerEmailChange, getPendingStorefrontCustomerEmailChange, requestStorefrontCustomerEmailChange } from '@/core/storefront/customer-email-change.service';
import { changeStorefrontCustomerPassword, listStorefrontCustomerSessions, revokeOtherStorefrontCustomerSessions, revokeStorefrontCustomerSession, updateStorefrontCustomerProfile } from '@/core/storefront/customer-profile-security.service';
import { beginStorefrontCustomerLogin, beginStorefrontCustomerTwoStepSetup, clearCustomerTwoStepChallengeCookie, completeStorefrontCustomerTwoStepLogin, confirmStorefrontCustomerTwoStepSetup, disableStorefrontCustomerTwoStep, getStorefrontCustomerTwoStepStatus, isStorefrontCustomerTwoStepEnabled, regenerateStorefrontCustomerRecoveryCodes, revokeUncommittedStorefrontCustomerSession, setCustomerTwoStepChallengeCookie } from '@/core/storefront/customer-two-step.service';
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
  const [orders, addresses, quotes, sessions, emailChange, twoStep] = await Promise.all([
    listCustomerOrders(customer, tenantSlug, storeSlug),
    listCustomerAddresses(customer),
    listFormalQuotes(tenantSlug, { storeSlug, customerEmail: customer.email, customerId: customer.id, limit: 100 }),
    listStorefrontCustomerSessions(request, customer, tenantSlug, storeSlug),
    getPendingStorefrontCustomerEmailChange(customer, storeSlug),
    getStorefrontCustomerTwoStepStatus(customer),
  ]);
  const summary = accountSummary(orders, addresses);
  return json({ ok: true, authenticated: true, customer, addresses, orders, quotes, sessions, emailChange, twoStep, summary: { ...summary, quoteCount: quotes.length, quotes } });
}

export async function POST(request: NextRequest) {
  const body = await payload(request);
  const action = clean(body.action).toLowerCase();
  const tenantSlug = slug(body.tenantSlug);
  const storeSlug = slug(body.storeSlug);
  const identifier = [tenantSlug, storeSlug, clean(body.email) || clean(body.newEmail), action].filter(Boolean).join(':');
  const authAction = ['login', 'register', 'complete-two-step-login'].includes(action);
  const securityAction = ['request-password-reset', 'reset-password', 'verify-email', 'resend-verification', 'change-password', 'revoke-other-sessions', 'revoke-session', 'request-email-change', 'cancel-email-change', 'confirm-email-change', 'complete-two-step-login', 'begin-two-step-setup', 'confirm-two-step-setup', 'disable-two-step', 'regenerate-recovery-codes'].includes(action);
  const limit = publicRateLimit(request, { scope: securityAction ? 'storefront-customer-security' : authAction ? 'storefront-customer-auth' : 'storefront-customer-account', limit: securityAction ? 8 : authAction ? 12 : 40, windowMs: 10 * 60 * 1000, identifier });
  if (limit.enforced) return json({ ...rateLimitPayload(limit), source: 'storefront-customer-account' }, { status: 429, headers: limit.headers });
  if (!tenantSlug || !storeSlug || !action) return json({ ok: false, error: 'Missing storefront account action.' }, { status: 400, headers: limit.headers });
  try {
    if (action === 'register') {
      const result = await registerStorefrontCustomer({ tenantSlug, storeSlug, email: clean(body.email), password: clean(body.password), name: clean(body.name), phone: clean(body.phone), company: clean(body.company) });
      const verification = await issueCustomerSecurityToken({ tenantSlug, storeSlug, email: result.customer.email, purpose: 'verify-email' }, request);
      if (verification?.token) await sendCustomerVerificationEmail(request, { tenantSlug, storeSlug, email: result.customer.email, name: result.customer.name, token: verification.token, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      const response = json({ ok: true, authenticated: true, customer: result.customer, redirectUrl: safeReturn(body.returnUrl, tenantSlug, storeSlug), notice: 'Account created. Check your email to verify the address.' }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
      const basketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
      if (basketId) await attachBasketToCustomer(request, result.customer, tenantSlug, storeSlug, basketId).catch(() => null);
      return response;
    }
    if (action === 'login') {
      const returnUrl = safeReturn(body.returnUrl, tenantSlug, storeSlug);
      const result = await beginStorefrontCustomerLogin(request, { tenantSlug, storeSlug, email: clean(body.email), password: clean(body.password), returnUrl });
      if (result.requiresTwoStep) {
        const redirectUrl = `/native-stores/${tenantSlug}/${storeSlug}/two-step?return=${encodeURIComponent(returnUrl)}`;
        const response = json({ ok: true, authenticated: false, requiresTwoStep: true, customer: result.customer, redirectUrl, notice: 'Enter an authenticator or recovery code to finish signing in.' }, { headers: limit.headers });
        setCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug, result.challengeToken, result.expiresAt);
        clearCustomerSessionCookie(response, tenantSlug, storeSlug);
        return response;
      }
      const response = json({ ok: true, authenticated: true, customer: result.customer, redirectUrl }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
      const basketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
      if (basketId) await attachBasketToCustomer(request, result.customer, tenantSlug, storeSlug, basketId).catch(() => null);
      return response;
    }
    if (action === 'complete-two-step-login') {
      const result = await completeStorefrontCustomerTwoStepLogin(request, { tenantSlug, storeSlug, code: clean(body.code) });
      const response = json({ ok: true, authenticated: true, customer: result.customer, recoveryUsed: result.recoveryUsed, recoveryCodeCount: result.recoveryCodeCount, notice: result.recoveryUsed ? `Recovery code accepted. ${result.recoveryCodeCount} unused recovery codes remain.` : 'Two-step verification complete.', redirectUrl: safeReturn(result.redirectUrl || body.returnUrl, tenantSlug, storeSlug) }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
      const basketId = clean(request.cookies.get(basketCookieName(tenantSlug, storeSlug))?.value);
      if (basketId) await attachBasketToCustomer(request, result.customer, tenantSlug, storeSlug, basketId).catch(() => null);
      if (result.recoveryUsed) await sendCustomerTwoStepSecurityEmail(request, { tenantSlug, storeSlug, email: result.customer.email, name: result.customer.name, event: 'recovery-used', recoveryCodeCount: result.recoveryCodeCount, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
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
      if (await isStorefrontCustomerTwoStepEnabled(result.customer)) {
        await revokeUncommittedStorefrontCustomerSession(result.token);
        const response = json({ ok: true, authenticated: false, requiresTwoStepOnNextLogin: true, customer: result.customer, notice: 'Your password was changed and every existing customer session was signed out. Sign in again and complete two-step verification.', redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/login?passwordReset=1` }, { headers: limit.headers });
        clearCustomerSessionCookie(response, tenantSlug, storeSlug);
        clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
        return response;
      }
      const response = json({ ok: true, authenticated: true, customer: result.customer, notice: 'Your password has been changed and other customer sessions were signed out.', redirectUrl: `${safeReturn(body.returnUrl, tenantSlug, storeSlug)}?passwordReset=1` }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      return response;
    }
    if (action === 'confirm-email-change') {
      const result = await confirmStorefrontCustomerEmailChange({ tenantSlug, storeSlug, token: clean(body.token) });
      if (result.completed) {
        await sendCustomerEmailChangeCompletedEmails(request, { tenantSlug, storeSlug, oldEmail: result.oldEmail, newEmail: result.newEmail, name: result.name, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
        const response = json({ ok: true, completed: true, oldConfirmed: true, newConfirmed: true, notice: 'Both email addresses are confirmed. Your login email was changed and every customer session was signed out.', redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/login?emailChanged=1` }, { headers: limit.headers });
        clearCustomerSessionCookie(response, tenantSlug, storeSlug);
        clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
        return response;
      }
      const notice = result.side === 'old' ? 'The current email address approved the change. The new email must still be verified.' : 'The new email address is verified. The current email must still approve the change.';
      return json({ ok: true, completed: false, oldConfirmed: result.oldConfirmed, newConfirmed: result.newConfirmed, notice }, { headers: limit.headers });
    }
    if (action === 'logout') { await revokeCustomerSession(request, tenantSlug, storeSlug); const response = json({ ok: true, authenticated: false, redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}` }, { headers: limit.headers }); clearCustomerSessionCookie(response, tenantSlug, storeSlug); clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug); return response; }
    const customer = await requireCustomerFromRequest(request, tenantSlug, storeSlug);
    if (action === 'update-profile') { const updated = await updateStorefrontCustomerProfile(customer, { name: clean(body.name), phone: clean(body.phone), company: clean(body.company) }); return json({ ok: true, customer: updated, notice: 'Your customer details were updated.' }, { headers: limit.headers }); }
    if (action === 'request-email-change') {
      const result = await requestStorefrontCustomerEmailChange(request, customer, { storeSlug, currentPassword: clean(body.currentPassword), newEmail: clean(body.newEmail) });
      const brand = await brandName(tenantSlug, storeSlug);
      await Promise.allSettled([
        sendCustomerOldEmailChangeConfirmation(request, { tenantSlug, storeSlug, oldEmail: result.change.oldEmail, newEmail: result.change.newEmail, name: result.name, token: result.oldToken, brandName: brand }),
        sendCustomerNewEmailChangeVerification(request, { tenantSlug, storeSlug, oldEmail: result.change.oldEmail, newEmail: result.change.newEmail, name: result.name, token: result.newToken, brandName: brand }),
      ]);
      return json({ ok: true, emailChange: result.change, notice: 'Secure confirmation links were queued to both email addresses. Both links must be approved within 24 hours.' }, { headers: limit.headers });
    }
    if (action === 'cancel-email-change') { const result = await cancelStorefrontCustomerEmailChange(customer, storeSlug, clean(body.changeId)); return json({ ok: true, ...result, emailChange: null, notice: result.cancelled ? 'The pending email change was cancelled.' : 'No pending email change was found.' }, { headers: limit.headers }); }
    if (action === 'begin-two-step-setup') {
      const brand = await brandName(tenantSlug, storeSlug);
      const result = await beginStorefrontCustomerTwoStepSetup(request, customer, { tenantSlug, storeSlug, currentPassword: clean(body.currentPassword), brandName: brand });
      return json({ ok: true, twoStep: result.status, secret: result.secret, otpauthUri: result.otpauthUri, recoveryCodes: result.recoveryCodes, notice: 'Authenticator setup started. Add the secret to your app, save the recovery codes, then enter a six-digit code.' }, { headers: limit.headers });
    }
    if (action === 'confirm-two-step-setup') {
      const twoStep = await confirmStorefrontCustomerTwoStepSetup(request, customer, { tenantSlug, storeSlug, code: clean(body.code) });
      await sendCustomerTwoStepSecurityEmail(request, { tenantSlug, storeSlug, email: customer.email, name: customer.name, event: 'enabled', recoveryCodeCount: twoStep.recoveryCodeCount, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      return json({ ok: true, twoStep, sessions: await listStorefrontCustomerSessions(request, customer, tenantSlug, storeSlug), notice: 'Two-step verification is enabled. Other customer sessions were signed out.' }, { headers: limit.headers });
    }
    if (action === 'disable-two-step') {
      const twoStep = await disableStorefrontCustomerTwoStep(request, customer, { tenantSlug, storeSlug, currentPassword: clean(body.currentPassword), code: clean(body.code) });
      await sendCustomerTwoStepSecurityEmail(request, { tenantSlug, storeSlug, email: customer.email, name: customer.name, event: 'disabled', brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      return json({ ok: true, twoStep, sessions: await listStorefrontCustomerSessions(request, customer, tenantSlug, storeSlug), notice: 'Two-step verification was disabled. Other customer sessions were signed out.' }, { headers: limit.headers });
    }
    if (action === 'regenerate-recovery-codes') {
      const result = await regenerateStorefrontCustomerRecoveryCodes(customer, { currentPassword: clean(body.currentPassword), code: clean(body.code) });
      await sendCustomerTwoStepSecurityEmail(request, { tenantSlug, storeSlug, email: customer.email, name: customer.name, event: 'recovery-regenerated', recoveryCodeCount: result.status.recoveryCodeCount, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      return json({ ok: true, twoStep: result.status, recoveryCodes: result.recoveryCodes, notice: 'New recovery codes were generated. Every older recovery code is now invalid.' }, { headers: limit.headers });
    }
    if (action === 'change-password') {
      const newPassword = clean(body.newPassword);
      if (newPassword !== clean(body.newPasswordConfirm)) return json({ ok: false, error: 'The two new passwords do not match.' }, { status: 400, headers: limit.headers });
      const result = await changeStorefrontCustomerPassword(request, customer, { tenantSlug, storeSlug, currentPassword: clean(body.currentPassword), newPassword });
      await sendCustomerPasswordChangedEmail(request, { tenantSlug, storeSlug, email: result.customer.email, name: result.customer.name, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      const response = json({ ok: true, authenticated: true, customer: result.customer, notice: 'Password changed. Every older customer session was signed out.', redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/account/profile?passwordChanged=1` }, { headers: limit.headers });
      setCustomerSessionCookie(response, tenantSlug, storeSlug, result.token, result.expiresAt);
      clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
      return response;
    }
    if (action === 'revoke-other-sessions') { const result = await revokeOtherStorefrontCustomerSessions(request, customer, tenantSlug, storeSlug); return json({ ok: true, ...result, sessions: await listStorefrontCustomerSessions(request, customer, tenantSlug, storeSlug), notice: result.revokedCount ? `${result.revokedCount} other customer session${result.revokedCount === 1 ? '' : 's'} signed out.` : 'No other active sessions were found.' }, { headers: limit.headers }); }
    if (action === 'revoke-session') { await revokeStorefrontCustomerSession(request, customer, tenantSlug, storeSlug, clean(body.sessionId)); return json({ ok: true, sessions: await listStorefrontCustomerSessions(request, customer, tenantSlug, storeSlug), notice: 'That customer session was signed out.' }, { headers: limit.headers }); }
    if (action === 'save-address') { const address = await saveCustomerAddress(customer, { id: clean(body.id) || undefined, label: clean(body.label), recipientName: clean(body.recipientName), company: clean(body.company), line1: clean(body.line1), line2: clean(body.line2), town: clean(body.town), county: clean(body.county), postcode: clean(body.postcode), country: clean(body.country), phone: clean(body.phone), isDefaultShipping: bool(body.isDefaultShipping), isDefaultBilling: bool(body.isDefaultBilling) }); return json({ ok: true, address, addresses: await listCustomerAddresses(customer) }, { headers: limit.headers }); }
    if (action === 'delete-address') { await deleteCustomerAddress(customer, clean(body.id)); return json({ ok: true, addresses: await listCustomerAddresses(customer) }, { headers: limit.headers }); }
    if (action === 'repeat-order') { const cookieName = basketCookieName(tenantSlug, storeSlug); const existingBasketId = clean(request.cookies.get(cookieName)?.value); const basketId = existingBasketId || newBasketId(); const basket = await repeatCustomerOrder(request, customer, tenantSlug, storeSlug, clean(body.orderId), basketId); const response = json({ ok: true, basket: { id: basket.id, lineCount: basket.lineCount, itemCount: basket.itemCount, formattedTotal: basket.formattedTotal }, redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/cart` }, { headers: limit.headers }); if (!existingBasketId) response.cookies.set(cookieName, basket.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 30 * 24 * 60 * 60 }); return response; }
    return json({ ok: false, error: 'Unsupported customer account action.' }, { status: 400, headers: limit.headers });
  } catch (error) { return json({ ok: false, source: 'storefront-customer-account', error: error instanceof Error ? error.message : 'Customer account action failed.' }, { status: authAction ? 401 : 400, headers: limit.headers }); }
}
