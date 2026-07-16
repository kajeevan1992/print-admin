import type { ReactNode } from 'react';

export type StorefrontThemeKey = 'atlantis-print-hosted' | 'atlantis-native' | (string & {});
export type StorefrontThemeSource = 'built-in' | 'uploaded';
export type StorefrontThemeStatus = 'draft' | 'active' | 'archived' | 'failed';

export type StorefrontThemeFieldType = 'text' | 'textarea' | 'image' | 'colour' | 'boolean' | 'number' | 'select' | 'sections';
export type StorefrontThemeFieldOption = { label: string; value: string };
export type StorefrontThemeFieldSchema = {
  path: string;
  label: string;
  type: StorefrontThemeFieldType;
  group?: string;
  description?: string;
  options?: StorefrontThemeFieldOption[];
};
export type StorefrontThemeEditorSchema = {
  content: StorefrontThemeFieldSchema[];
  settings: StorefrontThemeFieldSchema[];
};

export type StorefrontThemeManifest = {
  key: StorefrontThemeKey;
  name: string;
  version: string;
  source: StorefrontThemeSource;
  description?: string;
  aliases?: StorefrontThemeKey[];
  editor?: StorefrontThemeEditorSchema;
};

export type StorefrontMenuItem = {
  id: string;
  slug: string;
  label: string;
  path: string;
  order: number;
  parentId: string;
  parentSlug: string;
  description: string;
  enabled: boolean;
};

export type StorefrontNavColumn = { title: string; links: [string, string][] };
export type StorefrontNavItem = {
  label: string;
  path: string;
  feature: { title: string; body: string; image: string; cta: string };
  columns: StorefrontNavColumn[];
};

export type StorefrontProductOptionValue = { slug: string; label: string; value?: string };
export type StorefrontProductOptionGroup = { key: string; label: string; values: StorefrontProductOptionValue[] };
export type StorefrontProductCard = {
  slug: string;
  category: string;
  title: string;
  text: string;
  image: string;
  price: string;
  priceFromMinor?: number;
  currency?: string;
  productType?: string;
  buyingMode?: 'cart' | 'quote';
  optionGroups?: StorefrontProductOptionGroup[];
};
export type StorefrontCategoryCard = {
  slug: string;
  title: string;
  description: string;
  productCount: number;
  sortOrder: number;
  image: string;
};
export type StorefrontCollectionPoint = {
  slug: string;
  name: string;
  address: string;
  note: string;
  status: string;
};

export type StorefrontBrandSettings = {
  brandName: string;
  logoUrl: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
};
export type StorefrontHomepageSection = Record<string, any> & {
  id: string;
  type: string;
  enabled: boolean;
};
export type StorefrontRuntimeSettings = {
  tenantIds: string[];
  storeSlug: string;
  storeName: string;
  storeStatus: string;
  storeFound?: boolean;
  themeKey: string;
  brand: StorefrontBrandSettings;
  content: Record<string, any>;
  layout: Record<string, any>;
  navigation: StorefrontMenuItem[];
  sections: StorefrontHomepageSection[];
  themePublished: boolean;
  themeVersion: number;
  source: 'store-and-published-theme' | 'store' | 'defaults';
};

export type UploadedStorefrontThemeRecord = { tenantId: string; key: StorefrontThemeKey; name: string; version: string; status: StorefrontThemeStatus; manifest: StorefrontThemeManifest; storagePath: string; assetBasePath: string; entryComponent?: string; createdAt?: string; updatedAt?: string; };
export type UploadedThemeValidationResult = { valid: boolean; manifest?: StorefrontThemeManifest; errors: string[]; warnings: string[]; };
export type StorefrontRuntimeRequest = { tenantSlug: string; storeSlug: string; routeBase: string; path: string[]; };
export type StorefrontRuntimeSearchParams = Record<string, string>;

export type StorefrontRuntimeContext = {
  tenantSlug: string;
  storeSlug: string;
  tenantIds: string[];
  storeBase: string;
  routeSegments: string[];
  searchParams?: StorefrontRuntimeSearchParams;
  themeKey: StorefrontThemeKey;
  themeSource: 'tenant-setting' | 'default';
  themeManifest?: StorefrontThemeManifest;
  uploadedThemes?: StorefrontThemeManifest[];
  navItems: StorefrontNavItem[];
  products: StorefrontProductCard[];
  categories?: StorefrontCategoryCard[];
  collectionPoints?: StorefrontCollectionPoint[];
  settings?: StorefrontRuntimeSettings;
};

export type StorefrontThemeRenderer = (context: StorefrontRuntimeContext) => Promise<ReactNode> | ReactNode;
export type StorefrontThemeDefinition = { manifest: StorefrontThemeManifest; renderer: StorefrontThemeRenderer };
