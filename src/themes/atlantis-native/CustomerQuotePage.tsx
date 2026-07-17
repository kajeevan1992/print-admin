import StorefrontChrome from './StorefrontChrome';
import CustomerQuoteClient from './CustomerQuoteClient';
import { Shell } from './HomePrimitives';
import type { NavItem } from './types';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import { accessFormalQuote } from '@/core/quotes/formal-quotes.service';
import { currentStorefrontCustomer } from '@/core/storefront/customer-account.service';

function clean(value: unknown) { return String(value || '').trim(); }
function safeQuote(quote: any) { return { id: quote.id, quoteNumber: quote.quoteNumber, title: quote.title, status: quote.status, currency: quote.currency, customerName: quote.customerName, customerCompany: quote.customerCompany, subtotalMinor: quote.subtotalMinor, vatMinor: quote.vatMinor, totalMinor: quote.totalMinor, customerNotes: quote.customerNotes, expiresAt: quote.expiresAt, revision: quote.revision, convertedOrderId: quote.convertedOrderId, lines: (quote.lines || []).map((line: any) => ({ id: line.id, productName: line.productName, description: line.description, quantity: line.quantity, unitNetMinor: line.unitNetMinor, netMinor: line.netMinor, vatRate: line.vatRate, vatMinor: line.vatMinor, grossMinor: line.grossMinor, selectedOptions: line.selectedOptions || [] })) }; }

export default async function CustomerQuotePage({ tenantSlug, storeSlug, storeBase, navItems, settings, quoteId, searchParams = {} }: { tenantSlug: string; storeSlug: string; storeBase: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings; quoteId: string; searchParams?: Record<string, string> }) {
  const token = clean(searchParams.token);
  const customer = await currentStorefrontCustomer(tenantSlug, storeSlug).catch(() => null);
  const quote = await accessFormalQuote({ tenantSlug, storeSlug, quoteId, token, customerId: customer?.id, customerEmail: customer?.email, markViewed: true }).catch(() => null);
  const currentPath = `/quote-status/${quoteId}`;
  const body = quote ? <CustomerQuoteClient tenantSlug={tenantSlug} storeSlug={storeSlug} token={token} quote={safeQuote(quote)} documentUrl={`/api/native-storefront/quotes/${encodeURIComponent(quote.id)}/document?tenantSlug=${encodeURIComponent(tenantSlug)}&storeSlug=${encodeURIComponent(storeSlug)}${token ? `&token=${encodeURIComponent(token)}` : ''}`} /> : <div className="mx-auto max-w-[720px] rounded-[28px] border bg-white p-8 text-center shadow-sm"><h1 className="text-3xl font-black">Quote unavailable</h1><p className="mt-3 text-sm leading-7 text-slate-500">This quote link may have expired, or you may need to sign in with the customer email connected to the quote.</p><a href={`${storeBase}/login?return=${encodeURIComponent(`${storeBase}${currentPath}`)}`} className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-black text-white no-underline" style={{ backgroundColor: 'var(--storefront-primary, #18A7D0)' }}>Customer sign in</a></div>;
  return <StorefrontChrome currentPath={currentPath} navItems={navItems} storeBase={storeBase} settings={settings}><section className="py-10 sm:py-14"><Shell>{body}</Shell></section></StorefrontChrome>;
}
