import { queueInternalEmail, sendInternalEmail } from '@/core/email/internal-email.service';

function clean(value: unknown) { return String(value || '').trim(); }
function html(value: string) { return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;white-space:pre-wrap">${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`; }

export async function sendCustomerAccountClosedEmail(request: Request, input: { tenantSlug: string; storeSlug: string; email: string; name: string; closedAt: string; brandName?: string }) {
  const brand = clean(input.brandName) || 'Print store';
  const headers = new Headers(request.headers);
  headers.set('x-tenant-id', input.tenantSlug);
  const scoped = new Request(request.url, { method: 'GET', headers });
  const storeUrl = `${new URL(request.url).origin}/native-stores/${encodeURIComponent(input.tenantSlug)}/${encodeURIComponent(input.storeSlug)}`;
  const body = `Hi ${clean(input.name) || 'Customer'},\n\nYour ${brand} customer login was closed on ${new Date(input.closedAt).toLocaleString('en-GB')}. Saved addresses, customer sessions, passkeys, trusted browsers and sign-in credentials were removed.\n\nFormal orders, invoices, credit notes, payment and tax records may still be retained where required for legal, accounting or customer-service purposes.\n\nStore:\n${storeUrl}\n\nIf you did not request this closure, contact the store immediately.\n\nKind regards,\n${brand}`;
  const queued = await queueInternalEmail({ type: 'customer-account-closed', to: input.email, subject: `Your ${brand} customer account was closed`, body, html: html(body) }, scoped);
  return sendInternalEmail(queued.id, scoped).catch(() => queued);
}
