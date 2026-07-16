import StudioHomePage from '@/themes/studio-native/StudioHomePage';
import { renderAtlantisStorefront } from '@/theme-runtime/atlantis-renderer';
import type { StorefrontRuntimeContext, StorefrontRuntimeSettings } from '@/theme-runtime/types';

function studioSettings(settings: StorefrontRuntimeSettings): StorefrontRuntimeSettings {
  return {
    ...settings,
    themeKey: 'studio-native',
    layout: { ...settings.layout, themeStyle: 'studio' },
  };
}

export async function renderStudioStorefront(context: StorefrontRuntimeContext) {
  const settings = context.settings ? studioSettings(context.settings) : context.settings;
  const studioContext = { ...context, settings, themeKey: 'studio-native' } as StorefrontRuntimeContext;
  if (!context.routeSegments.length && settings) {
    return <StudioHomePage
      storeBase={context.storeBase}
      navItems={context.navItems}
      settings={settings}
      products={context.products}
      categories={context.categories || []}
      collectionPoints={context.collectionPoints || []}
    />;
  }
  return renderAtlantisStorefront(studioContext);
}
