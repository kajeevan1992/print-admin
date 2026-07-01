import type { StorefrontRuntimeContext, StorefrontThemeKey, StorefrontThemeManifest } from './types';
import { renderAtlantisStorefront } from './atlantis-renderer';

export const DEFAULT_STOREFRONT_THEME: StorefrontThemeKey = 'atlantis-print-hosted';

export const BUILT_IN_STOREFRONT_THEMES: StorefrontThemeManifest[] = [
  { key: 'atlantis-print-hosted', name: 'Atlantis Print Hosted', version: '1.0.0', source: 'built-in', description: 'Current print storefront adapter used by the native runtime.' },
  { key: 'atlantis-native', name: 'Atlantis Native', version: '1.0.0', source: 'built-in', description: 'Native Atlantis renderer while uploaded-theme runtime support is being connected.' },
];

const SUPPORTED_THEME_KEYS = BUILT_IN_STOREFRONT_THEMES.map((theme) => theme.key);

export function normaliseThemeKey(value: string | null | undefined): StorefrontThemeKey {
  const key = String(value || '').trim() as StorefrontThemeKey;
  return SUPPORTED_THEME_KEYS.includes(key) ? key : DEFAULT_STOREFRONT_THEME;
}

export function describeThemeSource(value: string | null | undefined) {
  return String(value || '').trim() ? 'tenant-setting' : 'default';
}

export function getBuiltInStorefrontThemes() {
  return BUILT_IN_STOREFRONT_THEMES;
}

export function getRegisteredStorefrontThemes(uploadedThemes: StorefrontThemeManifest[] = []) {
  return [...BUILT_IN_STOREFRONT_THEMES, ...uploadedThemes.filter((theme) => theme?.key && theme?.name && theme?.version)];
}

export function getDefaultStorefrontThemeManifest() {
  return getStorefrontThemeManifest(DEFAULT_STOREFRONT_THEME);
}

export function getStorefrontThemeManifest(value: string | null | undefined, uploadedThemes: StorefrontThemeManifest[] = []) {
  const key = String(value || normaliseThemeKey(value)).trim();
  return getRegisteredStorefrontThemes(uploadedThemes).find((theme) => theme.key === key) || BUILT_IN_STOREFRONT_THEMES[0];
}

export async function renderStorefrontTheme(context: StorefrontRuntimeContext) {
  const activeTheme = context.themeManifest || getStorefrontThemeManifest(context.themeKey, context.uploadedThemes);
  switch (normaliseThemeKey(activeTheme.key)) {
    case 'atlantis-native':
    case 'atlantis-print-hosted':
    default:
      return renderAtlantisStorefront({ ...context, themeManifest: activeTheme });
  }
}
