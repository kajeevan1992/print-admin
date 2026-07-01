import type { ReactNode } from 'react';
import type { NavItem } from '@/themes/atlantis-native/types';
import type { ThemeProductCard } from '@/themes/atlantis-native/catalog-adapter';

export type StorefrontThemeKey = 'atlantis-print-hosted' | 'atlantis-native';

export type StorefrontRuntimeRequest = {
  tenantSlug: string;
  storeSlug: string;
  routeBase: string;
  path: string[];
};

export type StorefrontRuntimeContext = {
  tenantSlug: string;
  storeSlug: string;
  tenantIds: string[];
  storeBase: string;
  routeSegments: string[];
  themeKey: StorefrontThemeKey;
  themeSource: 'tenant-setting' | 'default';
  navItems: NavItem[];
  products: ThemeProductCard[];
};

export type StorefrontThemeRenderer = (context: StorefrontRuntimeContext) => Promise<ReactNode> | ReactNode;
