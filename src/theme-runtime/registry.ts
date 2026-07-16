import { ATLANTIS_THEME_DEFINITION } from '@/theme-runtime/built-in/atlantis';
import type {
  StorefrontRuntimeContext,
  StorefrontThemeDefinition,
  StorefrontThemeKey,
  StorefrontThemeManifest,
} from './types';
import { renderUploadedStorefrontTheme } from './uploaded-renderer';

export const DEFAULT_STOREFRONT_THEME: StorefrontThemeKey = 'atlantis-native';

const BUILT_IN_THEME_DEFINITIONS: StorefrontThemeDefinition[] = [
  ATLANTIS_THEME_DEFINITION,
];

export const BUILT_IN_STOREFRONT_THEMES: StorefrontThemeManifest[] = BUILT_IN_THEME_DEFINITIONS.map((definition) => definition.manifest);

function builtInDefinition(value: string | null | undefined) {
  const key = String(value || '').trim();
  return BUILT_IN_THEME_DEFINITIONS.find((definition) => (
    definition.manifest.key === key || definition.manifest.aliases?.includes(key as StorefrontThemeKey)
  ));
}

export function normaliseThemeKey(value: string | null | undefined): StorefrontThemeKey {
  return builtInDefinition(value)?.manifest.key || DEFAULT_STOREFRONT_THEME;
}

export function describeThemeSource(value: string | null | undefined) {
  return String(value || '').trim() ? 'tenant-setting' : 'default';
}

export function getBuiltInStorefrontThemes() {
  return BUILT_IN_STOREFRONT_THEMES;
}

export function getRegisteredStorefrontThemes(uploadedThemes: StorefrontThemeManifest[] = []) {
  return [
    ...BUILT_IN_STOREFRONT_THEMES,
    ...uploadedThemes.filter((theme) => theme?.key && theme?.name && theme?.version),
  ];
}

export function getDefaultStorefrontThemeManifest() {
  return getStorefrontThemeManifest(DEFAULT_STOREFRONT_THEME);
}

export function getStorefrontThemeManifest(value: string | null | undefined, uploadedThemes: StorefrontThemeManifest[] = []) {
  const requested = String(value || '').trim();
  const uploaded = uploadedThemes.find((theme) => theme.key === requested);
  if (uploaded) return uploaded;
  return builtInDefinition(requested)?.manifest || builtInDefinition(DEFAULT_STOREFRONT_THEME)!.manifest;
}

export function getStorefrontThemeDefinition(value: string | null | undefined) {
  return builtInDefinition(value) || builtInDefinition(DEFAULT_STOREFRONT_THEME)!;
}

export async function renderStorefrontTheme(context: StorefrontRuntimeContext) {
  const activeTheme = context.themeManifest || getStorefrontThemeManifest(context.themeKey, context.uploadedThemes);
  const activeContext = { ...context, themeKey: activeTheme.key, themeManifest: activeTheme };
  if (activeTheme.source === 'uploaded') return renderUploadedStorefrontTheme(activeContext);
  return getStorefrontThemeDefinition(activeTheme.key).renderer(activeContext);
}
