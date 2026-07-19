import StorefrontChrome from './StorefrontChrome';
import CustomerAccountClient from './CustomerAccountClient';
import CustomerEmailChangeConfirmation from './CustomerEmailChangeConfirmation';
import CustomerTwoStepChallenge from './CustomerTwoStepChallenge';
import CustomerTwoStepSecurityPanel from './CustomerTwoStepSecurityPanel';
import type { NavItem } from './types';
import { Shell } from './HomePrimitives';
import { accountSummary, currentStorefrontCustomer, listCustomerAddresses, listCustomerOrders } from '@/core/storefront/customer-account.service';
import { listFormalQuotes } from '@/core/quotes/formal-quotes.service';
import { listFormalInvoices } from '@/core/invoices/formal-invoices.service';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import { buildV0ThemePageContext } from '@/theme-runtime/v0-view-props';
import type { V0ThemeRouteViews } from '@/v0-themes/contracts';

type Section = 'overview' | 'orders' | 'quotes' | 'artwork' | 'invoices' | 'addresses' | 'profile';
type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'verify-email' | 'confirm-email-change' | 'two-step' | 'dashboard';
function clean(value: unknown) { return String(value || '').trim(); }
function money(value: number, currency: string) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(Number(value || 0) / 100); }

export default async function CustomerAccountPage({ tenantSlug, storeSlug, storeBase, navItems, settings, routeViews, mode, section = 'overview', returnUrl = '', token = '' }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews; mode: Mode; section?: Section; returnUrl?: string; token?: string }) {
  const customer = await currentStorefrontCustomer(tenantSlug, storeSlug).catch(() => null);
  const isSecurityPage = ['forgot-password', 'reset-password', 'verify-email', 'confirm-email-change', 'two-step'].includes(mode);
  const resolvedMode: Mode = isSecurityPage ? mode : customer ? 'dashboard' : mode === 'dashboard' ? 'login' : mode;
  const dashboardCustomer = resolvedMode === 'dashboard' ? customer : null;
  const [orders, addresses, quotes, invoices] = dashboardCustomer ? await Promise.all([
    listCustomerOrders(dashboardCustomer, tenantSlug, storeSlug),
    listCustomerAddresses(dashboardCustomer),
    listFormalQuotes(tenantSlug, { storeSlug, customerEmail: dashboardCustomer.email, customerId: dashboardCustomer.id, limit: 100 }),
    listFormalInvoices(tenantSlug, { storeSlug, customerEmail: dashboardCustomer.email, customerId: dashboardCustomer.id, limit: 100 }),
  ]) : [[], [], [], []];
  const summary = accountSummary(orders, addresses);
  const safeOrders = orders.map((order) => ({ id: clean(order.id), orderNumber: clean(order.orderNumber), status: clean(order.status), paymentStatus: clean(order.paymentStatus), currency: clean(order.currency) || 'GBP', totalMinor: Number(order.totalMinor || 0), formattedTotal: money(Number(order.totalMinor || 0), clean(order.currency) || 'GBP'), createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : '', quoteReference: clean(order.quoteReference), items: (order.items || []).map((item: any) => ({ id: clean(item.id), productName: clean(item.productName), quantity: Number(item.quantity || 1), totalPrice: Number(item.totalPrice || 0), metadataJson: item.metadataJson || {} })) }));
  const safeQuotes = quotes.map((quote) => ({ id: quote.id, quoteNumber: quote.quoteNumber, title: quote.title, status: quote.status, currency: quote.currency, totalMinor: quote.totalMinor, formattedTotal: money(quote.totalMinor, quote.currency), expiresAt: quote.expiresAt, updatedAt: quote.updatedAt, revision: quote.revision, convertedOrderId: quote.convertedOrderId, lineCount: quote.lines.length, href: `${storeBase}/quote-status/${quote.id}` }));
  const safeInvoices = invoices.map((invoice) => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, orderNumber: invoice.orderNumber, status: invoice.status, currency: invoice.currency, totalMinor: invoice.totalMinor, creditedMinor: invoice.creditedMinor, formattedTotal: money(invoice.totalMinor, invoice.currency), formattedCredited: money(invoice.creditedMinor, invoice.currency), issuedAt: invoice.issuedAt, invoiceHref: `/api/native-storefront/invoices/${encodeURIComponent(invoice.id)}/document?tenantSlug=${encodeURIComponent(tenantSlug)}&storeSlug=${encodeURIComponent(storeSlug)}`, receiptHref: `/api/native-storefront/invoices/${encodeURIComponent(invoice.id)}/document?tenantSlug=${encodeURIComponent(tenantSlug)}&storeSlug=${encodeURIComponent(storeSlug)}&type=receipt`, creditNotes: invoice.creditNotes.map((note) => ({ id: note.id, creditNoteNumber: note.creditNoteNumber, reason: note.reason, totalMinor: note.totalMinor, formattedTotal: money(note.totalMinor, note.currency), issuedAt: note.issuedAt, href: `/api/native-storefront/invoices/${encodeURIComponent(invoice.id)}/credit-notes/${encodeURIComponent(note.id)}/document?tenantSlug=${encodeURIComponent(tenantSlug)}&storeSlug=${encodeURIComponent(storeSlug)}` })) }));
  const safeSummary = { orderCount: summary.orderCount, quoteCount: safeQuotes.length, invoiceCount: safeInvoices.length, artworkCount: summary.artworkCount, addressCount: summary.addressCount, artwork: summary.artwork };
  const currentPath = resolvedMode === 'dashboard' ? `/account${section === 'overview' ? '' : `/${section}`}` : `/${resolvedMode}`;
  const standardAccount = <CustomerAccountClient mode={resolvedMode === 'two-step' ? 'login' : resolvedMode} section={section} tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} returnUrl={returnUrl || `${storeBase}/account`} token={token} customer={dashboardCustomer ? { id: dashboardCustomer.id, name: dashboardCustomer.name, email: dashboardCustomer.email, phone: dashboardCustomer.phone, company: dashboardCustomer.company, emailVerified: dashboardCustomer.emailVerified } : null} orders={safeOrders} quotes={safeQuotes} invoices={safeInvoices} addresses={addresses} summary={safeSummary} />;
  const accountSlot = resolvedMode === 'confirm-email-change'
    ? <CustomerEmailChangeConfirmation tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} token={token} />
    : resolvedMode === 'two-step'
      ? <CustomerTwoStepChallenge tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} returnUrl={returnUrl || `${storeBase}/account`} />
      : section === 'profile' && dashboardCustomer
        ? <>{standardAccount}<CustomerTwoStepSecurityPanel tenantSlug={tenantSlug} storeSlug={storeSlug} /></>
        : standardAccount;
  if (routeViews?.CustomerAccountPage) { const View = routeViews.CustomerAccountPage; const themeMode = resolvedMode === 'register' ? 'register' : resolvedMode === 'dashboard' ? 'dashboard' : 'login'; const themeSection = section === 'profile' ? 'overview' : section; return <View {...buildV0ThemePageContext({ storeBase, currentPath, navItems, settings })} mode={themeMode} section={themeSection} authenticated={Boolean(dashboardCustomer)} customer={dashboardCustomer ? { name: dashboardCustomer.name, email: dashboardCustomer.email } : undefined} summary={dashboardCustomer ? { orderCount: summary.orderCount, quoteCount: safeQuotes.length, artworkCount: summary.artworkCount, invoiceCount: safeInvoices.length, addressCount: summary.addressCount } : undefined} slots={{ account: accountSlot }} />; }
  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10 sm:py-14"><Shell>{accountSlot}</Shell></section></StorefrontChrome>;
}
