import type { Id } from '@/types/common';

export type ThemeFieldType = 'text' | 'textarea' | 'image' | 'colour' | 'boolean' | 'number' | 'select' | 'sections' | 'navigation';
export type ThemeFieldOption = { label: string; value: string };
export type ThemeSectionFieldType = 'text' | 'textarea' | 'image' | 'boolean' | 'number' | 'select' | 'string-list' | 'repeater';
export type ThemeSectionField = {
  key: string;
  label: string;
  type: ThemeSectionFieldType;
  description?: string;
  placeholder?: string;
  options?: ThemeFieldOption[];
  min?: number;
  max?: number;
  itemLabel?: string;
  itemFields?: ThemeSectionField[];
};
export type ThemeSectionType = {
  type: string;
  label: string;
  description?: string;
  defaults?: Record<string, unknown>;
  fields: ThemeSectionField[];
};
export type ThemeEditorField = {
  path: string;
  label: string;
  type: ThemeFieldType;
  group?: string;
  description?: string;
  options?: ThemeFieldOption[];
  sectionTypes?: ThemeSectionType[];
  maxItems?: number;
  pageCollection?: boolean;
};
export type ThemeEditorSchema = {
  content: ThemeEditorField[];
  settings: ThemeEditorField[];
};

export type Theme = {
  id: Id;
  key: string;
  name: string;
  description: string;
  version: string;
  author: string;
  previewImage: string;
  supportedFeatures: string[];
  source: 'built-in' | 'uploaded';
  aliases: string[];
  editor: ThemeEditorSchema;
  createdAt: string;
};

export type StorefrontThemeStore = {
  id: string;
  slug: string;
  name: string;
  status: string;
  liveThemeKey: string;
  previewUrl: string;
  updatedAt: string;
};

export type StorefrontThemeRevision = {
  storeSlug: string;
  liveThemeKey: string;
  draftThemeKey: string;
  publishedVersion: number;
  draftVersion: number;
  publishedAt: string;
  draftUpdatedAt: string;
  hasDraftChanges: boolean;
  values: Record<string, unknown>;
  publishedValues: Record<string, unknown>;
};

export type StorefrontThemeAdminState = {
  tenant: { id: string; slug: string };
  themes: Theme[];
  stores: StorefrontThemeStore[];
  selectedStore: StorefrontThemeStore | null;
  revision: StorefrontThemeRevision | null;
};

export type StorefrontThemeAdminAction = 'save-draft' | 'publish' | 'discard-draft';
