import { ok } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import { http } from '@/services/api/http';
import type { Theme } from '@/modules/themes/types';

type BackendEnvelope<T> = { success: boolean; data: T };
type BackendListData<T> = { items: T[] };

const mapTheme = (raw: Record<string, unknown>): Theme => ({
  id: String(raw.id),
  name: String(raw.name ?? ''),
  description: String(raw.description ?? ''),
  version: String(raw.version ?? '1.0.0'),
  author: String(raw.author ?? 'Unknown'),
  previewImage: String(raw.previewImage ?? 'TH'),
  supportedFeatures: Array.isArray(raw.supportedFeatures) ? raw.supportedFeatures.map(String) : [],
  createdAt: String(raw.createdAt ?? new Date().toISOString().slice(0, 10))
});

export const themesService = {
  listThemes: async (): Promise<ApiResponse<{ items: Theme[] }>> => {
    const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>('/themes');
    return ok({ items: (response.data.items ?? []).map(mapTheme) });
  },

  getTheme: async (id: string): Promise<ApiResponse<Theme>> => {
    const response = await http.get<BackendEnvelope<Record<string, unknown>>>(`/themes/${id}`);
    return ok(mapTheme(response.data));
  },

  assignThemeToChannel: async (channelId: string, themeId: string) => {
    const response = await http.post<BackendEnvelope<{ channelId: string; themeId: string }>>('/themes/assign', { channelId, themeId });
    return ok(response.data);
  }
};
