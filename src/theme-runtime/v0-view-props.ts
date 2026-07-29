import { createElement } from 'react';
import BasketHeaderSummary from '@/themes/atlantis-native/BasketHeaderSummary';
import CustomerAccountHeader from '@/themes/atlantis-native/CustomerAccountHeader';
import type { NavItem } from '@/themes/atlantis-native/types';
import type { ThemeCategoryCard, ThemeProductCard } from '@/themes/atlantis-native/catalog-adapter';
import type { StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeCategory, V0ThemeNavigationItem, V0ThemePageContext, V0ThemeProduct } from '@/v0-themes/contracts';

function href(basePath: string, path: string) { const clean = String(path || '/').trim(); if (/^(https?:|mailto:|tel:)/i.test(clean)) return clean; if (!clean || clean === '/') return basePath; return `${basePath}${clean.startsWith('/') ? clean : `/${clean}`}`; }
function activePath(currentPath: string, path: string) { const clean = String(path || '/').trim() || '/'; return currentPath === clean || (clean !== '/' && currentPath.startsWith(`${clean}/`)); }
function storeParts(storeBase: string) { const parts = String(storeBase || '').split('/').filter(Boolean); const nativeIndex = parts.indexOf('native-stores'); const previewIndex = parts.indexOf('theme-preview'); const index = nativeIndex >= 0 ? nativeIndex : previewIndex; return { tenantSlug: index >= 0 ? parts[index + 1] || '' : '', storeSlug: index >= 0 ? parts[index + 2] || '' : '' }; }
export function buildV0ThemeNavigation(basePath: string, navItems: NavItem[], currentPath: string): V0ThemeNavigationItem[] {
  const navigation: V0ThemeNavigationItem[] = navItems.map((item) => ({
    label: item.label,
    href: href(basePath, item.path),
    active: activePath(currentPath, item.path),
    description: item.feature.body,
    image: item.feature.image,
    groups: item.columns.map((column) => ({
      title: column.title,
      links: column.links.map(([label, path]) => ({ label, href: href(basePath, path), active: activePath(currentPath, path) })),
    })),
  }));
  if (!navigation.some((item) => item.href === href(basePath, '/search'))) navigation.push({ label: 'Search', href: href(basePath, '/search'), active: currentPath === '/search', groups: [] });
  return navigation;
}
export function buildV0ThemePageContext(input: { storeBase: string; currentPath: string; navItems: NavItem[]; settings: StorefrontRuntimeSettings }): V0ThemePageContext {
  const { storeBase, currentPath, navItems, settings } = input; const { tenantSlug, storeSlug } = storeParts(storeBase);
  return { basePath: storeBase, currentPath, preview: storeBase.includes('/theme-preview/'), brand: { name: settings.brand.brandName || settings.storeName, logoUrl: settings.brand.logoUrl, primary: settings.brand.primary, accent: settings.brand.accent, background: settings.brand.background, text: settings.brand.text, muted: settings.brand.muted, border: settings.brand.border }, navigation: buildV0ThemeNavigation(storeBase, navItems, currentPath), content: settings.content, layout: settings.layout, chromeSlots: { account: createElement(CustomerAccountHeader, { tenantSlug, storeSlug, storeBase, studio: false }), basket: createElement(BasketHeaderSummary, { tenantSlug, storeSlug, storeBase, studio: false }) } };
}
export function themeProductToV0(product: ThemeProductCard, storeBase: string): V0ThemeProduct { return { slug: product.slug, category: product.category, title: product.title, description: product.text, image: product.image, price: product.price, href: href(storeBase, `/${product.category}/${product.slug}`) }; }
export function themeCategoryToV0(category: ThemeCategoryCard, storeBase: string): V0ThemeCategory { return { slug: category.slug, title: category.title, description: category.description, image: category.image, productCount: category.productCount, href: href(storeBase, `/${category.slug}`) }; }
