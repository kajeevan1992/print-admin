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

async function tryLiveTags(search?: string): Promise<Tag[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/proxy/catalog-tags', { cache: 'no-store' });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) return null;
    const raw = payload?.payload?.data?.items || payload?.payload?.data || payload?.payload || [];
    if (!Array.isArray(raw)) return null;
    const term = search?.trim().toLowerCase();
    return raw
      .map((row: any, index: number) => ({
        id: row.id || `tag-${index + 1}`,
        name: row.name || `Tag ${index + 1}`,
        parentId: row.parentId || '',
        browseBy: row.browseBy || '',
        friendlyUrl: row.friendlyUrl || row.slug || `/tag-${index + 1}`,
        published: Boolean(row.published ?? true),
        sidebar: Boolean(row.sidebar ?? false),
        cmsPageLink: row.cmsPageLink || ''
      }))
      .filter((item) => !term || item.name.toLowerCase().includes(term));
  } catch {
    return null;
  }
}

export const tagsService = {
  listTags: async (search?: string): Promise<PaginatedResponse<Tag>> => {
    const live = await tryLiveTags(search);
    if (live) return okPaginated(live, { page: 1, perPage: Math.max(1, live.length), total: live.length, totalPages: 1 });

    await wait();
    const items = readStore().filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()));
    return okPaginated(items, { page: 1, perPage: Math.max(1, items.length), total: items.length, totalPages: 1 });
  },
  getTag: async (id: string): Promise<ApiResponse<Tag>> => {
    await wait();
    const item = readStore().find((tag) => tag.id === id) ?? tagsStore[0];
    return ok(item);
  },
  createTag: async (values: TagFormValues): Promise<ApiResponse<Tag>> => {
    await wait();
    const next = hydrate(values, `tag-${Math.floor(Math.random() * 9000 + 1000)}`);
    writeStore([next, ...readStore()]);
    return ok(next);
  },
  updateTag: async (id: string, values: TagFormValues): Promise<ApiResponse<Tag>> => {
    await wait();
    const next = hydrate(values, id);
    writeStore(readStore().map((item) => (item.id === id ? next : item)));
    return ok(next);
  },
  deleteTag: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    await wait();
    writeStore(readStore().filter((item) => item.id !== id));
    return ok({ id });
  }
};
