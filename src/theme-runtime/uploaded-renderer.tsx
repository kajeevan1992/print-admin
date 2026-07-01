import { renderAtlantisStorefront } from './atlantis-renderer';
import type { StorefrontRuntimeContext } from './types';

export function getUploadedThemeRuntimeContract(context: StorefrontRuntimeContext) {
  return {
    theme: context.themeManifest,
    tenantSlug: context.tenantSlug,
    storeSlug: context.storeSlug,
    storeBase: context.storeBase,
    routeSegments: context.routeSegments,
    navItems: context.navItems,
    products: context.products,
  };
}

export async function renderUploadedStorefrontTheme(context: StorefrontRuntimeContext) {
  const runtimeContract = getUploadedThemeRuntimeContract(context);
  return renderAtlantisStorefront({ ...context, themeManifest: runtimeContract.theme });
}
