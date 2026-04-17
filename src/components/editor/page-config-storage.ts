'use client';

import type { PageSchema } from '@/storefront/editor/page-schema';

export const STOREFRONT_EDITOR_STORAGE_KEY = 'printcore.storefront-editor.page-config';

export function loadSavedStorefrontPageConfig(): PageSchema | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STOREFRONT_EDITOR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PageSchema;
  } catch {
    return null;
  }
}

export function saveStorefrontPageConfig(page: PageSchema) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STOREFRONT_EDITOR_STORAGE_KEY, JSON.stringify(page));
}

export function clearSavedStorefrontPageConfig() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STOREFRONT_EDITOR_STORAGE_KEY);
}
