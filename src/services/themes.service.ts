import { ok } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type {
  StorefrontThemeAdminAction,
  StorefrontThemeAdminState,
  Theme,
} from '@/modules/themes/types';

type BackendEnvelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string } | string };

function errorMessage(payload: BackendEnvelope<unknown>, fallback: string) {
  if (typeof payload.error === 'string') return payload.error;
  return payload.error?.message || fallback;
}

async function requestState(storeSlug?: string) {
  const query = storeSlug ? `?storeSlug=${encodeURIComponent(storeSlug)}` : '';
  const response = await fetch(`/api/internal/storefront-themes${query}`, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({})) as BackendEnvelope<StorefrontThemeAdminState>;
  if (!response.ok || !payload.ok || !payload.data) throw new Error(errorMessage(payload, 'Failed to load storefront themes.'));
  return payload.data;
}

async function mutateState(input: {
  action: StorefrontThemeAdminAction;
  storeSlug: string;
  themeKey?: string;
  values?: Record<string, unknown>;
}) {
  const response = await fetch('/api/internal/storefront-themes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({})) as BackendEnvelope<StorefrontThemeAdminState>;
  if (!response.ok || !payload.ok || !payload.data) throw new Error(errorMessage(payload, 'Failed to update storefront theme.'));
  return payload.data;
}

function normaliseTheme(theme: Theme): Theme {
  return {
    ...theme,
    id: String(theme.id || theme.key),
    key: String(theme.key || theme.id),
    aliases: Array.isArray(theme.aliases) ? theme.aliases : [],
    supportedFeatures: Array.isArray(theme.supportedFeatures) ? theme.supportedFeatures : [],
    editor: theme.editor || { content: [], settings: [] },
    createdAt: theme.createdAt || '',
  };
}

function normaliseState(state: StorefrontThemeAdminState): StorefrontThemeAdminState {
  return { ...state, themes: (state.themes || []).map(normaliseTheme) };
}

export const themesService = {
  getAdminState: async (storeSlug?: string): Promise<ApiResponse<StorefrontThemeAdminState>> => {
    return ok(normaliseState(await requestState(storeSlug)));
  },

  listThemes: async (): Promise<ApiResponse<{ items: Theme[] }>> => {
    const state = normaliseState(await requestState());
    return ok({ items: state.themes });
  },

  getTheme: async (id: string): Promise<ApiResponse<Theme>> => {
    const state = normaliseState(await requestState());
    const theme = state.themes.find((item) => item.id === id || item.key === id || item.aliases.includes(id));
    if (!theme) throw new Error('Theme not found.');
    return ok(theme);
  },

  saveDraft: async (storeSlug: string, themeKey: string, values: Record<string, unknown>) => {
    return ok(normaliseState(await mutateState({ action: 'save-draft', storeSlug, themeKey, values })));
  },

  publish: async (storeSlug: string, themeKey: string, values: Record<string, unknown>) => {
    return ok(normaliseState(await mutateState({ action: 'publish', storeSlug, themeKey, values })));
  },

  discardDraft: async (storeSlug: string) => {
    return ok(normaliseState(await mutateState({ action: 'discard-draft', storeSlug })));
  },
};
