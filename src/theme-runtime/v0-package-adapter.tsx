import type { ComponentType } from 'react';
import { renderAtlantisStorefront } from '@/theme-runtime/atlantis-renderer';
import type { StorefrontRuntimeContext, StorefrontRuntimeSettings } from '@/theme-runtime/types';
import type { V0ThemeHomeProps, V0ThemeRouteViews } from '@/v0-themes/contracts';
import { buildV0ThemePageContext, themeCategoryToV0, themeProductToV0 } from '@/theme-runtime/v0-view-props';

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
    ...buildV0ThemePageContext({ storeBase: context.storeBase, currentPath: '/', navItems: context.navItems, settings }),
    products: context.products.map((product) => themeProductToV0(product, context.storeBase)),
    categories: (context.categories || []).map((category) => themeCategoryToV0(category, context.storeBase)),
    collectionPoints: (context.collectionPoints || []).map((point) => ({ slug: point.slug, name: point.name, address: point.address, note: point.note })),
    sections: settings.sections,
  };
}

export async function renderV0ThemePackage(
  context: StorefrontRuntimeContext,
  options: {
    themeKey: string;
    themeStyle: string;
    HomePage: ComponentType<V0ThemeHomeProps>;
    routeViews?: V0ThemeRouteViews;
  },
) {
  if (!context.settings) return renderAtlantisStorefront(context);
  const settings = packageSettings(context.settings, options.themeKey, options.themeStyle);
  const packageContext = { ...context, settings, themeKey: options.themeKey, routeViews: options.routeViews } as StorefrontRuntimeContext;
  if (!context.routeSegments.length) {
    const HomePage = options.HomePage;
    return <HomePage {...buildV0ThemeHomeProps(packageContext)} />;
  }
  return renderAtlantisStorefront(packageContext);
}
