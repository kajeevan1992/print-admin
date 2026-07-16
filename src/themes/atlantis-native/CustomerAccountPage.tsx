import StorefrontChrome from './StorefrontChrome';
import CustomerAccountClient from './CustomerAccountClient';
import type { NavItem } from './types';
import { Shell } from './HomePrimitives';
import {
  accountSummary,
  currentStorefrontCustomer,
  listCustomerAddresses,
  listCustomerOrders,
} from '@/core/storefront/customer-account.service';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import { buildV0ThemePageContext } from '@/theme-runtime/v0-view-props';
import type { V0ThemeRouteViews } from '@/v0-themes/contracts';

type Section = 'overview' | 'orders' | 'quotes' | 'artwork' | 'invoices' | 'addresses';
function clean(value: unknown) { return String(value || '').trim(); }
function money(value: number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(Number(value || 0) / 100); }

export default async function CustomerAccountPage({ tenantSlug, storeSlug, storeBase, navItems, settings, routeViews, mode, section = 'overview', returnUrl = '' }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews; mode: 'login' | 'register' | 'dashboard'; section?: Section; returnUrl?: string }) {
  const customer = await currentStorefrontCustomer(tenantSlug, storeSlug).catch(() => null);
  const resolvedMode = customer ? 'dashboard' as const : mode === 'dashboard' ? 'login' as const : mode;
  const [orders, addresses] = customer ? await Promise.all([listCustomerOrders(customer, tenantSlug, storeSlug), listCustomerAddresses(customer)]) : [[], []];
  const summary = accountSummary(orders, addresses);
  const safeOrders = orders.map((order) => ({
    id: clean(order.id),
    orderNumber: clean(order.orderNumber),
    status: clean(order.status),
    paymentStatus: clean(order.paymentStatus),
    currency: clean(order.currency) || 'GBP',
    totalMinor: Number(order.totalMinor || 0),
    formattedTotal: money(Number(order.totalMinor || 0), clean(order.currency) || 'GBP'),
    createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '',
    quoteReference: clean(order.quoteReference),
    items: (order.items || []).map((item: any) => ({ id: clean(item.id), productName: clean(item.productName), quantity: Number(item.quantity || 1), totalPrice: Number(item.totalPrice || 0), metadataJson: item.metadataJson || {} })),
  }));
  const safeSummary = { orderCount: summary.orderCount, quoteCount: summary.quoteCount, invoiceCount: summary.invoiceCount, artworkCount: summary.artworkCount, addressCount: summary.addressCount, artwork: summary.artwork };
  const currentPath = resolvedMode === 'dashboard' ? `/account${section === 'overview' ? '' : `/${section}`}` : `/${resolvedMode}`;
  const accountSlot = <CustomerAccountClient mode={resolvedMode} section={section} tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} returnUrl={returnUrl || `${storeBase}/account`} customer={customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, company: customer.company } : null} orders={safeOrders} addresses={addresses} summary={safeSummary} />;

  if (routeViews?.CustomerAccountPage) {
    const View = routeViews.CustomerAccountPage;
    return <View {...buildV0ThemePageContext({ storeBase, currentPath, navItems, settings })} mode={resolvedMode} section={section} authenticated={Boolean(customer)} customer={customer ? { name: customer.name, email: customer.email } : undefined} summary={customer ? { orderCount: summary.orderCount, quoteCount: summary.quoteCount, artworkCount: summary.artworkCount, invoiceCount: summary.invoiceCount, addressCount: summary.addressCount } : undefined} slots={{ account: accountSlot }} />;
  }

  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10 sm:py-14"><Shell>{accountSlot}</Shell></section></StorefrontChrome>;
}
