import type { StorefrontRuntimeContext, StorefrontThemeKey } from './types';
import { renderAtlantisStorefront } from './atlantis-renderer';

export const DEFAULT_STOREFRONT_THEME: StorefrontThemeKey = 'atlantis-print-hosted';

export function normaliseThemeKey(value: string | null | undefined): StorefrontThemeKey {
  const key = String(value || '').trim();
  if (key === 'atlantis-native' || key === 'atlantis-print-hosted') return key;
  return DEFAULT_STOREFRONT_THEME;
}

export async function renderStorefrontTheme(context: StorefrontRuntimeContext) {
  switch (normaliseThemeKey(context.themeKey)) {
    case 'atlantis-native':
    case 'atlantis-print-hosted':
    default:
      return renderAtlantisStorefront(context);
  }
}
