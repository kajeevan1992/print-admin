import { NextRequest, NextResponse } from 'next/server';
import { requireTenantSession } from '@/core/auth/session-guard.service';
import {
  addAdminCustomerNote,
  getAdminCustomer,
  recordAdminCustomerAction,
  revokeAdminCustomerPasskeys,
  revokeAdminCustomerSessions,
  revokeAdminCustomerTrustedDevices,
  setAdminCustomerActive,
  updateAdminCustomerProfile,
} from '@/core/customers/customer-admin.service';
import { issueCustomerSecurityToken } from '@/core/storefront/customer-account-security.service';
import {
  sendCustomerAdminSecurityEmail,
  sendCustomerPasswordResetEmail,
  sendCustomerVerificationEmail,
} from '@/core/storefront/customer-account-notifications.service';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function bool(value: unknown) { return value === true || ['true', '1', 'yes', 'on'].includes(clean(value).toLowerCase()); }
function json(data: unknown, init?: ResponseInit) { return NextResponse.json(data, init); }

async function brandName(tenantSlug: string, storeSlug: string) {
  const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug).catch(() => null);
  return settings?.brand?.brandName || settings?.storeName || 'Print store';
}

export async function GET(_request: NextRequest, { params }: { params: { customerId: string } }) {
  try {
    const session = await requireTenantSession();
    const customer = await getAdminCustomer(session.tenantId, params.customerId);
    if (!customer) return json({ ok: false, error: 'Customer account was not found.' }, { status: 404 });
    return json({ ok: true, source: 'tenant-customer-management', data: customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Customer account could not be loaded.';
    return json({ ok: false, error: message }, { status: message.toLowerCase().includes('session') ? 401 : 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { customerId: string } }) {
  try {
    const session = await requireTenantSession();
    const body = await request.json().catch(() => ({}));
    const action = clean(body.action).toLowerCase();
    const before = await getAdminCustomer(session.tenantId, params.customerId);
    if (!before) return json({ ok: false, error: 'Customer account was not found.' }, { status: 404 });
    const actor = { id: session.id, name: session.name, email: session.email };
    const storeSlug = clean(body.storeSlug) || before.defaultStoreSlug || session.tenantId;
    const brand = await brandName(session.tenantId, storeSlug);
    let notice = '';

    if (action === 'add-note') {
      await addAdminCustomerNote(session.tenantId, before.id, clean(body.note), actor);
      notice = 'Support note added.';
    } else if (action === 'update-profile') {
      await updateAdminCustomerProfile(session.tenantId, before.id, { name: clean(body.name), phone: clean(body.phone), company: clean(body.company) }, actor);
      notice = 'Customer contact details updated.';
    } else if (action === 'set-active') {
      const active = bool(body.active);
      await setAdminCustomerActive(session.tenantId, before.id, active, actor);
      await sendCustomerAdminSecurityEmail(request, { tenantSlug: session.tenantId, storeSlug, email: before.email, name: before.name, event: active ? 'reactivated' : 'suspended', brandName: brand }).catch(() => null);
      notice = active ? 'Customer account reactivated.' : 'Customer account suspended and signed out.';
    } else if (action === 'revoke-sessions') {
      const result = await revokeAdminCustomerSessions(session.tenantId, before.id, actor);
      await sendCustomerAdminSecurityEmail(request, { tenantSlug: session.tenantId, storeSlug, email: before.email, name: before.name, event: 'sessions-revoked', brandName: brand }).catch(() => null);
      notice = `${result.sessions} customer session${result.sessions === 1 ? '' : 's'} and ${result.trustedBrowsers} trusted browser${result.trustedBrowsers === 1 ? '' : 's'} revoked.`;
    } else if (action === 'revoke-trusted-devices') {
      const result = await revokeAdminCustomerTrustedDevices(session.tenantId, before.id, actor);
      await sendCustomerAdminSecurityEmail(request, { tenantSlug: session.tenantId, storeSlug, email: before.email, name: before.name, event: 'trusted-browsers-revoked', brandName: brand }).catch(() => null);
      notice = `${result.count} trusted browser${result.count === 1 ? '' : 's'} removed.`;
    } else if (action === 'revoke-passkeys') {
      const result = await revokeAdminCustomerPasskeys(session.tenantId, before.id, actor);
      await sendCustomerAdminSecurityEmail(request, { tenantSlug: session.tenantId, storeSlug, email: before.email, name: before.name, event: 'passkeys-revoked', brandName: brand }).catch(() => null);
      notice = `${result.count} passkey${result.count === 1 ? '' : 's'} removed.`;
    } else if (action === 'resend-verification') {
      const issued = await issueCustomerSecurityToken({ tenantSlug: session.tenantId, storeSlug, email: before.email, purpose: 'verify-email' }, request);
      if (issued?.token) await sendCustomerVerificationEmail(request, { tenantSlug: session.tenantId, storeSlug, email: before.email, name: before.name, token: issued.token, brandName: brand });
      await recordAdminCustomerAction(session.tenantId, before.id, 'customer.verification-email-sent-by-admin', actor, { storeSlug, alreadyVerified: Boolean(issued?.alreadyComplete) });
      notice = issued?.alreadyComplete ? 'The customer email is already verified.' : 'A new verification email was queued.';
    } else if (action === 'send-password-reset') {
      const issued = await issueCustomerSecurityToken({ tenantSlug: session.tenantId, storeSlug, email: before.email, purpose: 'reset-password' }, request);
      if (!issued?.token) throw new Error('A reset link could not be issued for this customer account.');
      await sendCustomerPasswordResetEmail(request, { tenantSlug: session.tenantId, storeSlug, email: before.email, name: before.name, token: issued.token, brandName: brand });
      await recordAdminCustomerAction(session.tenantId, before.id, 'customer.password-reset-sent-by-admin', actor, { storeSlug });
      notice = 'A secure password reset email was queued.';
    } else {
      return json({ ok: false, error: 'Unsupported customer support action.' }, { status: 400 });
    }

    const customer = await getAdminCustomer(session.tenantId, before.id);
    return json({ ok: true, source: 'tenant-customer-management', notice, data: customer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Customer support action failed.';
    return json({ ok: false, error: message }, { status: message.toLowerCase().includes('session') ? 401 : 400 });
  }
}
