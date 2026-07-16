import StorefrontChrome from './StorefrontChrome';
import PaymentConfirmationPanel from './PaymentConfirmationPanel';
import type { NavItem } from './types';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeRouteViews } from '@/v0-themes/contracts';
import { buildV0ThemePageContext } from '@/theme-runtime/v0-view-props';
import { verifyStorefrontPaymentConfirmation } from '@/core/payments/storefront-payment-confirmation.service';

export default async function CheckoutStatusPage({ tenantSlug, storeSlug, storeBase, navItems, status, searchParams = {}, settings, routeViews }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; status: 'success' | 'cancel'; searchParams?: Record<string, string>; settings?: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews }) {
  const orderId = searchParams.orderId || '';
  const paymentToken = searchParams.payment_token || searchParams.paymentToken || '';
  const sessionId = searchParams.session_id || searchParams.sessionId || '';
  const currentPath = status === 'success' ? '/checkout-success' : '/checkout-cancel';
  const internalRequest = new Request(`https://internal.local${storeBase}${currentPath}`, { headers: { 'x-tenant-id': tenantSlug } });
  const confirmation = await verifyStorefrontPaymentConfirmation(internalRequest, { tenantSlug, storeSlug, orderId, paymentToken, sessionId, page: status });
  const panel = <PaymentConfirmationPanel tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} orderId={orderId} paymentToken={paymentToken} sessionId={sessionId} page={status} initialConfirmation={confirmation} appearance={settings?.layout?.widgetAppearance} brand={settings?.brand} />;

  if (routeViews?.CheckoutStatusPage && settings) {
    const View = routeViews.CheckoutStatusPage;
    return <View {...buildV0ThemePageContext({ storeBase, currentPath, navItems, settings })} status={status} orderId={orderId} payment={{ state: confirmation.state, verified: confirmation.verified, valid: confirmation.valid, orderNumber: confirmation.orderNumber, formattedTotal: confirmation.formattedTotal, message: confirmation.message, canRetry: confirmation.canRetry }} slots={{ status: panel }} />;
  }

  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10"><Shell><div className="mb-6"><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Secure payment confirmation</div><h1 className="mt-3 text-[42px] font-black tracking-[-0.06em]" style={{ color: BRAND.ink }}>Your payment status</h1></div>{panel}</Shell></section></StorefrontChrome>;
}
