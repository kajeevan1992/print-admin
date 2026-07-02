import type { ReactNode } from 'react';
import type { NavItem } from '@/themes/atlantis-native/types';
import type { ThemeProductCard, ThemeCategoryCard } from '@/themes/atlantis-native/catalog-adapter';
import type { CollectionPoint } from '@/themes/atlantis-native/collection-points';

export type StorefrontThemeKey = 'atlantis-print-hosted' | 'atlantis-native' | (string & {});
export type StorefrontThemeSource = 'built-in' | 'uploaded';
export type StorefrontThemeStatus = 'draft' | 'active' | 'archived' | 'failed';

export type StorefrontThemeManifest = { key: StorefrontThemeKey; name: string; version: string; source: StorefrontThemeSource; description?: string; };

export type UploadedStorefrontThemeRecord = { tenantId: string; key: StorefrontThemeKey; name: string; version: string; status: StorefrontThemeStatus; manifest: StorefrontThemeManifest; storagePath: string; assetBasePath: string; entryComponent?: string; createdAt?: string; updatedAt?: string; };

export type UploadedThemeValidationResult = { valid: boolean; manifest?: StorefrontThemeManifest; errors: string[]; warnings: string[]; };

export type StorefrontRuntimeRequest = { tenantSlug: string; storeSlug: string; routeBase: string; path: string[]; };

export type StorefrontRuntimeContext = { tenantSlug: string; storeSlug: string; tenantIds: string[]; storeBase: string; routeSegments: string[]; themeKey: StorefrontThemeKey; themeSource: 'tenant-setting' | 'default'; themeManifest?: StorefrontThemeManifest; uploadedThemes?: StorefrontThemeManifest[]; navItems: NavItem[]; products: ThemeProductCard[]; categories?: ThemeCategoryCard[]; collectionPoints?: CollectionPoint[]; };

export type StorefrontThemeRenderer = (context: StorefrontRuntimeContext) => Promise<ReactNode> | ReactNode;
