import type { StorefrontRuntimeContext, StorefrontThemeKey } from './types';
import { renderAtlantisStorefront } from './atlantis-renderer';

export const DEFAULT_STOREFRONT_THEME: StorefrontThemeKey = 'atlantis-print-hosted';
const SUPPORTED_THEME_KEYS: StorefrontThemeKey[] = ['atlantis-print-hosted', 'atlantis-native'];

export function normaliseThemeKey(value: string | null | undefined): StorefrontThemeKey {
  const key = String(value || '').trim() as StorefrontThemeKey;
  return SUPPORTED_THEME_KEYS.includes(key) ? key : DEFAULT_STOREFRONT_THEME;
}

export function describeThemeSource(value: string | null | undefined) {
  return String(value || '').trim() ? 'tenant-setting' : 'default';
}

export async function renderStorefrontTheme(context: StorefrontRuntimeContext) {
  switch (normaliseThemeKey(context.themeKey)) {
    case 'atlantis-native':
    case 'atlantis-print-hosted':
    default:
      return renderAtlantisStorefront(context);
  }
}
