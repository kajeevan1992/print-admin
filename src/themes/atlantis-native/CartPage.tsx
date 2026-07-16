import { cookies } from 'next/headers';
import StorefrontChrome from './StorefrontChrome';
import PersistentBasketView from './PersistentBasketView';
import type { NavItem } from './types';
import type { ThemeProductCard } from './catalog-adapter';
import { BRAND } from './theme-helpers';
import { Shell } from './HomePrimitives';
import {
  basketCookieName,
  basketLineEditHref,
  basketSummary,
  loadPersistentBasket,
  newBasketId,
} from '@/core/storefront/persistent-basket.service';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeRouteViews, V0ThemeSelectedOption } from '@/v0-themes/contracts';
import { buildV0ThemePageContext } from '@/theme-runtime/v0-view-props';

function basketRequest(tenantSlug: string, storeSlug: string) {
  return new Request(`https://internal.local/persistent-basket?tenantId=${encodeURIComponent(tenantSlug)}&storeSlug=${encodeURIComponent(storeSlug)}`, { headers: { 'x-tenant-id': tenantSlug } });
}

function safeThemeOptions(value: Array<{ key?: string; label?: string; value?: string; slug?: string }>): V0ThemeSelectedOption[] {
  return value.map((option) => {
    const key = String(option.key || option.label || '').trim();
    const label = String(option.label || option.key || '').trim();
    const selectedValue = String(option.value || option.slug || '').trim();
    return key && selectedValue ? { key, label: label || key, value: selectedValue } : null;
  }).filter(Boolean) as V0ThemeSelectedOption[];
}

export default async function CartPage({ tenantSlug = '', storeSlug = '', storeBase, navItems, products: _products = [], settings, routeViews }: { tenantSlug?: string; storeSlug?: string; storeBase: string; navItems: NavItem[]; productSlug?: string; categorySlug?: string; products?: ThemeProductCard[]; searchParams?: Record<string, string>; settings?: StorefrontRuntimeSettings; routeViews?: V0ThemeRouteViews }) {
  const cookieStore = cookies();
  const cookieName = basketCookieName(tenantSlug, storeSlug);
  const savedBasketId = cookieStore.get(cookieName)?.value || '';
  const basketId = savedBasketId || newBasketId();
  const basket = await loadPersistentBasket(basketRequest(tenantSlug, storeSlug), tenantSlug, storeSlug, basketId, { reprice: true, persistRefresh: Boolean(savedBasketId) });
  const basketWithLinks = { ...basket, lines: basket.lines.map((line) => ({ ...line, editHref: basketLineEditHref(storeBase, line) })) };
  const interactiveBasket = <PersistentBasketView tenantSlug={tenantSlug} storeSlug={storeSlug} storeBase={storeBase} initialBasket={basketWithLinks} appearance={settings?.layout?.widgetAppearance} brand={settings?.brand} />;

  if (routeViews?.CartPage && settings) {
    const View = routeViews.CartPage;
    return <View
      {...buildV0ThemePageContext({ storeBase, currentPath: '/cart', navItems, settings })}
      basket={basketSummary(basket)}
      lines={basket.lines.map((line) => ({ id: line.id, productSlug: line.productSlug, categorySlug: line.categorySlug, productName: line.productName, image: line.image, quantity: line.quantity, delivery: line.delivery, formattedTotal: line.formattedTotal, selectedOptions: safeThemeOptions(line.selectedOptions), artworkStatus: line.artwork.status, editHref: basketLineEditHref(storeBase, line) }))}
      slots={{ basket: interactiveBasket }}
    />;
  }

  return <StorefrontChrome currentPath="/cart" navItems={navItems} storeBase={storeBase} settings={settings}>
    <section className="py-10"><Shell><div className="mb-6"><div className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.primary }}>Saved basket</div><h1 className="mt-3 text-[42px] font-black tracking-[-0.06em]" style={{ color: BRAND.ink }}>Your print order</h1><p className="mt-3 max-w-[760px] text-sm leading-7" style={{ color: BRAND.muted }}>Add multiple products, edit each configuration, keep separate artwork instructions and pay for the complete basket together.</p></div>{interactiveBasket}</Shell></section>
  </StorefrontChrome>;
}
