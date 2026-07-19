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

export async function sendCustomerOldEmailChangeConfirmation(request: Request, input: { tenantSlug: string; storeSlug: string; oldEmail: string; newEmail: string; name: string; token: string; brandName?: string }) {
  const confirmUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/confirm-email-change?token=${encodeURIComponent(input.token)}`;
  const brand = clean(input.brandName) || 'Print store';
  const body = `Hi ${clean(input.name) || 'Customer'},\n\nA request was made to change the login email for your ${brand} customer account from ${input.oldEmail} to ${input.newEmail}.\n\nApprove this change from the current email address:\n${confirmUrl}\n\nThe new address must also be verified before anything changes. This single-use approval expires in 24 hours. If you did not request this, do not approve it and reset your password.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: 'customer-email-change-old-confirmation', to: input.oldEmail, subject: `Approve your ${brand} login email change`, body });
}

export async function sendCustomerNewEmailChangeVerification(request: Request, input: { tenantSlug: string; storeSlug: string; oldEmail: string; newEmail: string; name: string; token: string; brandName?: string }) {
  const confirmUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/confirm-email-change?token=${encodeURIComponent(input.token)}`;
  const brand = clean(input.brandName) || 'Print store';
  const body = `Hi ${clean(input.name) || 'Customer'},\n\n${input.oldEmail} requested to use this address as the new login for a ${brand} customer account.\n\nVerify this new email address:\n${confirmUrl}\n\nThe current address must also approve the change before anything changes. This single-use verification expires in 24 hours. If this was not you, ignore this email.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: 'customer-email-change-new-verification', to: input.newEmail, subject: `Verify your new ${brand} login email`, body });
}

export async function sendCustomerEmailChangeCompletedEmails(request: Request, input: { tenantSlug: string; storeSlug: string; oldEmail: string; newEmail: string; name: string; brandName?: string }) {
  const brand = clean(input.brandName) || 'Print store';
  const signInUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/login`;
  const oldBody = `Hi ${clean(input.name) || 'Customer'},\n\nThe login email for your ${brand} customer account was changed from ${input.oldEmail} to ${input.newEmail}. Every existing customer session was signed out.\n\nIf you did not approve this change, contact the store and reset the account password immediately.\n\nKind regards,\n${brand}`;
  const newBody = `Hi ${clean(input.name) || 'Customer'},\n\nThis address is now the verified login email for your ${brand} customer account. Every previous customer session was signed out.\n\nSign in with the new address:\n${signInUrl}\n\nKind regards,\n${brand}`;
  return Promise.allSettled([
    queueAndAttempt(request, input.tenantSlug, { type: 'customer-email-change-completed-old', to: input.oldEmail, subject: `Your ${brand} login email was changed`, body: oldBody }),
    queueAndAttempt(request, input.tenantSlug, { type: 'customer-email-change-completed-new', to: input.newEmail, subject: `Your new ${brand} login email is active`, body: newBody }),
  ]);
}

export async function sendCustomerTwoStepSecurityEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; event: 'enabled' | 'disabled' | 'recovery-regenerated' | 'recovery-used'; recoveryCodeCount?: number; brandName?: string }) {
  const brand = clean(input.brandName) || 'Print store';
  const profileUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/account/profile`;
  const descriptions = {
    enabled: 'Two-step verification was enabled. Future password sign-ins require an authenticator or recovery code.',
    disabled: 'Two-step verification was disabled. Future sign-ins will use the account password only.',
    'recovery-regenerated': `New recovery codes were generated. All older recovery codes are now invalid.${Number.isFinite(input.recoveryCodeCount) ? ` ${input.recoveryCodeCount} new codes remain.` : ''}`,
    'recovery-used': `A recovery code was used to sign in.${Number.isFinite(input.recoveryCodeCount) ? ` ${input.recoveryCodeCount} unused recovery codes remain.` : ''}`,
  } as const;
  const subjects = {
    enabled: `Two-step verification enabled for ${brand}`,
    disabled: `Two-step verification disabled for ${brand}`,
    'recovery-regenerated': `New ${brand} recovery codes generated`,
    'recovery-used': `${brand} recovery code used`,
  } as const;
  const body = `Hi ${clean(input.name) || 'Customer'},\n\n${descriptions[input.event]}\n\nReview account security:\n${profileUrl}\n\nIf you did not make this change, reset your password and contact the store immediately.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: `customer-two-step-${input.event}`, to: input.email, subject: subjects[input.event], body });
}

export async function sendCustomerTrustedDeviceSecurityEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; event: 'added' | 'all-revoked'; brandName?: string }) {
  const brand = clean(input.brandName) || 'Print store';
  const profileUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/account/profile`;
  const description = input.event === 'added'
    ? 'A browser was trusted for 30 days after a successful password and two-step sign-in. That browser can skip the authenticator step after entering the correct password.'
    : 'All trusted browsers were removed. Every browser must complete the authenticator or recovery-code step again.';
  const subject = input.event === 'added' ? `New trusted browser for ${brand}` : `All ${brand} trusted browsers removed`;
  const body = `Hi ${clean(input.name) || 'Customer'},\n\n${description}\n\nReview trusted browsers:\n${profileUrl}\n\nIf you did not make this change, remove trusted browsers, reset your password and contact the store immediately.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: `customer-trusted-browser-${input.event}`, to: input.email, subject, body });
}

export async function sendCustomerPasskeySecurityEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; event: 'added' | 'removed'; passkeyName?: string; brandName?: string }) {
  const brand = clean(input.brandName) || 'Print store';
  const profileUrl = `${baseUrl(request, input.tenantSlug, input.storeSlug)}/account/profile`;
  const label = clean(input.passkeyName) || 'Passkey';
  const description = input.event === 'added'
    ? `${label} was added to your customer account. It can sign in using device verification without entering the account password or authenticator code.`
    : `${label} was removed from your customer account and can no longer be used to sign in.`;
  const subject = input.event === 'added' ? `New passkey added for ${brand}` : `Passkey removed from ${brand}`;
  const body = `Hi ${clean(input.name) || 'Customer'},\n\n${description}\n\nReview passkeys:\n${profileUrl}\n\nIf you did not make this change, remove unknown passkeys, reset your password and contact the store immediately.\n\nKind regards,\n${brand}`;
  return queueAndAttempt(request, input.tenantSlug, { type: `customer-passkey-${input.event}`, to: input.email, subject, body });
}
