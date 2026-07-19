import { queueInternalEmail, sendInternalEmail } from '@/core/email/internal-email.service';

function clean(value: unknown) { return String(value || '').trim(); }
function html(value: string) { return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;white-space:pre-wrap">${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`; }
function tenantRequest(request: Request, tenantSlug: string) { const headers = new Headers(request.headers); headers.set('x-tenant-id', tenantSlug); return new Request(request.url, { method: 'GET', headers }); }
function baseUrl(request: Request, tenantSlug: string, storeSlug: string) { return `${new URL(request.url).origin}/native-stores/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(storeSlug)}`; }

async function queueAndAttempt(request: Request, tenantSlug: string, input: { type: string; to: string; subject: string; body: string }) {
  const scoped = tenantRequest(request, tenantSlug);
  const queued = await queueInternalEmail({ ...input, html: html(input.body) }, scoped);
  return sendInternalEmail(queued.id, scoped).catch(() => queued);
}

export async function sendCustomerVerificationEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; token: string; brandName?: string }) {
  const verifyUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/verify-email?token=${encodeURIComponent(input.token)}`;
  const brand = clean(input.brandName) || 'Print store';
  const body = `Hi ${clean(input.name) || 'Customer'},\n\nPlease verify your email address for your ${brand} customer account.\n\nVerify email:\n${verifyUrl}\n\nThis single-use link expires in 48 hours. If you did not create this account, you can ignore this email.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: 'customer-email-verification', to: input.email, subject: `Verify your ${brand} customer account`, body });
}

export async function sendCustomerPasswordResetEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; token: string; brandName?: string }) {
  const resetUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/reset-password?token=${encodeURIComponent(input.token)}`;
  const brand = clean(input.brandName) || 'Print store';
  const body = `Hi ${clean(input.name) || 'Customer'},\n\nA password reset was requested for your ${brand} customer account.\n\nReset password:\n${resetUrl}\n\nThis single-use link expires in one hour. If you did not request a reset, your password has not been changed and you can ignore this email.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: 'customer-password-reset', to: input.email, subject: `Reset your ${brand} customer account password`, body });
}

export async function sendCustomerPasswordChangedEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; brandName?: string }) {
  const recoveryUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/forgot-password`;
  const brand = clean(input.brandName) || 'Print store';
  const body = `Hi ${clean(input.name) || 'Customer'},\n\nThe password for your ${brand} customer account was changed. All older customer sessions were signed out.\n\nIf you made this change, no action is needed. If you did not make it, reset the password immediately:\n${recoveryUrl}\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: 'customer-password-changed', to: input.email, subject: `Your ${brand} customer password was changed`, body });
}
