import type { ComponentType } from 'react';
import { renderAtlantisStorefront } from '@/theme-runtime/atlantis-renderer';
import type { StorefrontRuntimeContext, StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeHomeProps } from '@/v0-themes/contracts';

function href(basePath: string, path: string) {
  const clean = String(path || '/').trim();
  if (/^(https?:|mailto:|tel:)/i.test(clean)) return clean;
  if (!clean || clean === '/') return basePath;
  return `${basePath}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function packageSettings(settings: StorefrontRuntimeSettings, themeKey: string, themeStyle: string): StorefrontRuntimeSettings {
  return {
    ...settings,
    themeKey,
    layout: { ...settings.layout, themeStyle },
  };
}

export function buildV0ThemeHomeProps(context: StorefrontRuntimeContext): V0ThemeHomeProps {
  const settings = context.settings;
  if (!settings) throw new Error('A v0 theme package requires resolved storefront settings.');
  return {
    basePath: context.storeBase,
    preview: context.storeBase.includes('/theme-preview/'),
    brand: {
      name: settings.brand.brandName || settings.storeName,
      logoUrl: settings.brand.logoUrl,
      primary: settings.brand.primary,
      accent: settings.brand.accent,
      background: settings.brand.background,
      text: settings.brand.text,
      muted: settings.brand.muted,
      border: settings.brand.border,
    },
    navigation: context.navItems.map((item) => ({
      label: item.label,
      href: href(context.storeBase, item.path),
      active: context.routeSegments.length ? item.path === `/${context.routeSegments[0]}` : item.path === '/',
    })),
    products: context.products.map((product) => ({
      slug: product.slug,
      category: product.category,
      title: product.title,
      description: product.text,
      image: product.image,
      price: product.price,
      href: href(context.storeBase, `/${product.category}/${product.slug}`),
    })),
    categories: (context.categories || []).map((category) => ({
      slug: category.slug,
      title: category.title,
      description: category.description,
      image: category.image,
      productCount: category.productCount,
      href: href(context.storeBase, `/${category.slug}`),
    })),
    collectionPoints: (context.collectionPoints || []).map((point) => ({
      slug: point.slug,
      name: point.name,
      address: point.address,
      note: point.note,
    })),
    sections: settings.sections,
    content: settings.content,
    layout: settings.layout,
  };
}

export async function renderV0ThemePackage(
  context: StorefrontRuntimeContext,
  options: {
    themeKey: string;
    themeStyle: string;
    HomePage: ComponentType<V0ThemeHomeProps>;
  },
) {
  if (!context.settings) return renderAtlantisStorefront(context);
  const settings = packageSettings(context.settings, options.themeKey, options.themeStyle);
  const packageContext = { ...context, settings, themeKey: options.themeKey } as StorefrontRuntimeContext;
  if (!context.routeSegments.length) {
    const HomePage = options.HomePage;
    return <HomePage {...buildV0ThemeHomeProps(packageContext)} />;
  }
  return renderAtlantisStorefront(packageContext);
}
