import { NextRequest, NextResponse } from 'next/server';
import { listFormalInvoices } from '@/core/invoices/formal-invoices.service';
import { listFormalQuotes } from '@/core/quotes/formal-quotes.service';
import { publicRateLimit, rateLimitPayload } from '@/core/security/public-rate-limit.service';
import { clearCustomerSessionCookie, listCustomerAddresses, listCustomerOrders, requireCustomerFromRequest } from '@/core/storefront/customer-account.service';
import { sendCustomerAccountClosedEmail } from '@/core/storefront/customer-account-notifications.service';
import { closeStorefrontCustomerAccount, verifyCustomerPrivacyPassword } from '@/core/storefront/customer-privacy.service';
import { clearCustomerTrustedDeviceCookie } from '@/core/storefront/customer-trusted-device.service';
import { clearCustomerTwoStepChallengeCookie } from '@/core/storefront/customer-two-step.service';
import { loadStorefrontRuntimeSettings } from '@/theme-runtime/storefront-settings-loader';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clean(value: unknown) { return String(value || '').trim(); }
function slug(value: unknown) { return clean(value).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, ''); }
async function body(request: NextRequest) { return request.json().catch(() => ({})); }
async function brandName(tenantSlug: string, storeSlug: string) { const settings = await loadStorefrontRuntimeSettings(tenantSlug, storeSlug).catch(() => null); return settings?.brand?.brandName || settings?.storeName || 'Print store'; }

export async function POST(request: NextRequest) {
  const input = await body(request);
  const tenantSlug = slug(input.tenantSlug);
  const storeSlug = slug(input.storeSlug);
  const action = clean(input.action).toLowerCase();
  const limit = publicRateLimit(request, { scope: 'storefront-customer-privacy', limit: 5, windowMs: 15 * 60 * 1000, identifier: `${tenantSlug}:${storeSlug}:${action}` });
  if (limit.enforced) return NextResponse.json({ ...rateLimitPayload(limit), source: 'storefront-customer-privacy' }, { status: 429, headers: limit.headers });
  if (!tenantSlug || !storeSlug || !action) return NextResponse.json({ ok: false, error: 'Missing customer privacy action.' }, { status: 400, headers: limit.headers });

  try {
    const customer = await requireCustomerFromRequest(request, tenantSlug, storeSlug);
    if (action === 'export-data') {
      await verifyCustomerPrivacyPassword(customer, clean(input.currentPassword));
      const [addresses, orders, quotes, invoices] = await Promise.all([
        listCustomerAddresses(customer),
        listCustomerOrders(customer, tenantSlug, storeSlug),
        listFormalQuotes(tenantSlug, { storeSlug, customerEmail: customer.email, customerId: customer.id, limit: 1000 }),
        listFormalInvoices(tenantSlug, { storeSlug, customerEmail: customer.email, customerId: customer.id, limit: 1000 }),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        scope: { tenantSlug, storeSlug },
        customer,
        addresses,
        orders,
        quotes,
        invoices,
        retentionNotice: 'Formal orders, invoices, credit notes, payments and tax records may be retained by the store where legally or operationally required.',
      };
      const filename = `customer-data-${storeSlug}-${new Date().toISOString().slice(0, 10)}.json`;
      return new NextResponse(JSON.stringify(payload, null, 2), { status: 200, headers: { ...Object.fromEntries(limit.headers.entries()), 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
    }
    if (action === 'close-account') {
      const result = await closeStorefrontCustomerAccount(customer, { currentPassword: clean(input.currentPassword), confirmation: clean(input.confirmation) });
      await sendCustomerAccountClosedEmail(request, { tenantSlug, storeSlug, email: result.email, name: result.name, closedAt: result.closedAt, brandName: await brandName(tenantSlug, storeSlug) }).catch(() => null);
      const response = NextResponse.json({ ok: true, closed: true, notice: 'Your customer login has been closed. Saved addresses and sign-in credentials were removed.', redirectUrl: `/native-stores/${tenantSlug}/${storeSlug}/login?accountClosed=1` }, { headers: limit.headers });
      clearCustomerSessionCookie(response, tenantSlug, storeSlug);
      clearCustomerTwoStepChallengeCookie(response, tenantSlug, storeSlug);
      clearCustomerTrustedDeviceCookie(response, tenantSlug, storeSlug);
      return response;
    }
    return NextResponse.json({ ok: false, error: 'Unsupported customer privacy action.' }, { status: 400, headers: limit.headers });
  } catch (error) {
    return NextResponse.json({ ok: false, source: 'storefront-customer-privacy', error: error instanceof Error ? error.message : 'Customer privacy action failed.' }, { status: 400, headers: limit.headers });
  }
}
