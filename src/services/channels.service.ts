import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import { http } from '@/services/api/http';
import type { Channel, ChannelForm } from '@/modules/channels/types';

type BackendEnvelope<T> = { success: boolean; data: T };
type BackendListData<T> = { items: T[]; pagination?: { page: number; perPage: number; total: number; totalPages?: number } };

const mapChannel = (raw: Record<string, unknown>): Channel => ({
  id: String(raw.id),
  name: String(raw.name ?? ''),
  slug: String(raw.slug ?? ''),
  domain: raw.domain ? String(raw.domain) : '',
  status: (raw.status as Channel['status']) ?? 'inactive',
  themeId: String(raw.themeId ?? ''),
  currency: String(raw.currency ?? 'USD'),
  locale: String(raw.locale ?? 'en-US'),
  isHeadless: Boolean(raw.isHeadless),
  createdAt: String(raw.createdAt ?? new Date().toISOString().slice(0, 10)),
  publicApiKey: String(raw.publicApiKey ?? ''),
  privateApiKey: String(raw.privateApiKey ?? '')
});

export const channelsService = {
  listChannels: async (params?: { search?: string; status?: 'active' | 'inactive' }): Promise<PaginatedResponse<Channel>> => {
    const response = await http.get<BackendEnvelope<BackendListData<Record<string, unknown>>>>('/channels', params);
    const items = (response.data.items ?? []).map(mapChannel);
    const pagination = response.data.pagination;

    return okPaginated(items, {
      page: pagination?.page ?? 1,
      perPage: pagination?.perPage ?? items.length || 1,
      total: pagination?.total ?? items.length,
      totalPages: pagination?.totalPages ?? 1
    });
  },

  getChannel: async (id: string): Promise<ApiResponse<Channel>> => {
    const response = await http.get<BackendEnvelope<Record<string, unknown>>>(`/channels/${id}`);
    return ok(mapChannel(response.data));
  },

  createChannel: async (payload: ChannelForm): Promise<ApiResponse<Channel>> => {
    const response = await http.post<BackendEnvelope<Record<string, unknown>>>('/channels', payload);
    return ok(mapChannel(response.data));
  },

  updateChannel: async (id: string, changes: Partial<Channel>): Promise<ApiResponse<Channel>> => {
    const response = await http.patch<BackendEnvelope<Record<string, unknown>>>(`/channels/${id}`, changes);
    return ok(mapChannel(response.data));
  }
};
