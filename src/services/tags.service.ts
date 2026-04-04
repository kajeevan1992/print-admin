import { tagsMock } from '@/data/tags';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Tag, TagFormValues } from '@/modules/tags/types';

let tagsStore: Tag[] = [...tagsMock];
const STORAGE_KEY = 'print-admin-tags-store';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

function readStore(): Tag[] {
  if (typeof window === 'undefined') return tagsStore;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return tagsStore;
    const parsed = JSON.parse(raw) as Tag[];
    return Array.isArray(parsed) ? parsed : tagsStore;
  } catch {
    return tagsStore;
  }
}

function writeStore(next: Tag[]) {
  tagsStore = next;
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function hydrate(values: TagFormValues, id: string): Tag {
  const parent = readStore().find((item) => item.id === values.parentId);
  return {
    id,
    name: values.name,
    parentId: values.parentId,
    browseBy: parent?.name ?? '',
    friendlyUrl: values.friendlyUrl || `tag/${values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    published: values.published,
    sidebar: values.sidebar,
    cmsPageLink: `<%= PageLink(${id.replace(/\D/g, '') || '100'}) %>`
  };
}

export const tagsService = {
  listTags: async (search?: string): Promise<PaginatedResponse<Tag>> => {
    await wait();
    const items = readStore().filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()));
    return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
  },
  getTag: async (id: string): Promise<ApiResponse<Tag>> => {
    await wait();
    const item = readStore().find((tag) => tag.id === id);
    if (!item) throw new Error('Tag not found');
    return ok(item);
  },
  createTag: async (values: TagFormValues): Promise<ApiResponse<Tag>> => {
    await wait();
    const created = hydrate(values, `tag-${Math.floor(Math.random() * 9000 + 1000)}`);
    writeStore([created, ...readStore()]);
    return ok(created);
  },
  updateTag: async (id: string, values: Partial<TagFormValues>): Promise<ApiResponse<Tag>> => {
    await wait();
    const existing = readStore().find((tag) => tag.id === id);
    if (!existing) throw new Error('Tag not found');
    const updated = hydrate(
      {
        name: values.name ?? existing.name,
        parentId: values.parentId ?? (existing.parentId || ''),
        published: values.published ?? existing.published,
        sidebar: values.sidebar ?? existing.sidebar,
        friendlyUrl: values.friendlyUrl ?? existing.friendlyUrl
      },
      id
    );
    writeStore(readStore().map((item) => (item.id === id ? updated : item)));
    return ok(updated);
  },
  deleteTag: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    await wait();
    writeStore(readStore().filter((item) => item.id !== id && item.parentId !== id));
    return ok({ success: true });
  }
};
