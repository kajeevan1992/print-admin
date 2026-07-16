import type { ReactNode } from 'react';

export type V0ThemeFieldType = 'text' | 'textarea' | 'image' | 'colour' | 'boolean' | 'number' | 'select' | 'sections';
export type V0ThemeField = {
  path: string;
  label: string;
  type: V0ThemeFieldType;
  group?: string;
  description?: string;
  options?: Array<{ label: string; value: string }>;
};

export type V0ThemePackageManifest = {
  key: string;
  aliases?: string[];
  name: string;
  version: string;
  description: string;
  editor: {
    content: V0ThemeField[];
    settings: V0ThemeField[];
  };
};

export type V0ThemeBrand = {
  name: string;
  logoUrl: string;
  primary: string;
  accent: string;
  background: string;
  text: string;
  muted: string;
  border: string;
};

export type V0ThemeNavigationItem = {
  label: string;
  href: string;
  active: boolean;
};

export type V0ThemeProduct = {
  slug: string;
  category: string;
  title: string;
  description: string;
  image: string;
  price: string;
  href: string;
};

export type V0ThemeCategory = {
  slug: string;
  title: string;
  description: string;
  image: string;
  productCount: number;
  href: string;
};

export type V0ThemeCollectionPoint = {
  slug: string;
  name: string;
  address: string;
  note: string;
};

export type V0ThemeSection = Record<string, unknown> & {
  id: string;
  type: string;
  enabled: boolean;
};

export type V0ThemeHomeProps = {
  basePath: string;
  preview: boolean;
  brand: V0ThemeBrand;
  navigation: V0ThemeNavigationItem[];
  products: V0ThemeProduct[];
  categories: V0ThemeCategory[];
  collectionPoints: V0ThemeCollectionPoint[];
  sections: V0ThemeSection[];
  content: Record<string, unknown>;
  layout: Record<string, unknown>;
  slots?: {
    previewBanner?: ReactNode;
  };
};
