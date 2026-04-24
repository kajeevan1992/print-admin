import { tagsMock } from '@/data/tags';
import { ok, okPaginated, type PaginatedResponse } from '@/services/api/responses';
import type { ApiResponse } from '@/services/api/types';
import type { Tag, TagFormValues } from '@/modules/tags/types';

let tagsStore: Tag[] = [...tagsMock];
const STORAGE_KEY = 'print-admin-tags-store';
const LIVE_ENDPOINT = '/api/internal/catalog/tags';
const wait = async () => new Promise((resolve) => setTimeout(resolve, 60));

function slugify(value: string, fallback: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/^\/+/, '')
      .replace(/[^a-z0-9/]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}

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
    friendlyUrl: values.friendlyUrl || `tag/${slugify(values.name, id)}`,
    published: values.published,
    sidebar: values.sidebar,
    cmsPageLink: `<%= PageLink(${id.replace(/\D/g, '') || '100'}) %>`
  };
}

function mapLiveTag(row: any, index: number): Tag {
  const metadata = row?.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {};
  return {
    id: String(row.id || row.slug || `tag-${index + 1}`),
    name: String(row.name || row.title || `Tag ${index + 1}`),
    parentId: String(metadata.parentId || row.parentId || ''),
    browseBy: String(metadata.browseBy || row.browseBy || ''),
    friendlyUrl: String(metadata.friendlyUrl || row.friendlyUrl || row.slug || `tag/${index + 1}`),
    published: Boolean(metadata.published ?? row.published ?? true),
    sidebar: Boolean(metadata.sidebar ?? row.sidebar ?? false),
    cmsPageLink: String(metadata.cmsPageLink || row.cmsPageLink || '')
  };
}

async function liveJson<T>(endpoint: string, init?: RequestInit): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const res = await fetch(endpoint, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.ok) throw new Error(payload?.error || 'Internal tags API failed.');
  return payload as T;
}

async function tryLiveTags(search?: string): Promise<Tag[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const endpoint = search ? `${LIVE_ENDPOINT}?search=${encodeURIComponent(search)}` : LIVE_ENDPOINT;
    const payload: any = await liveJson(endpoint, { cache: 'no-store' });
    const raw = payload?.data?.items || payload?.data || payload?.payload?.data?.items || payload?.payload || [];
    if (!Array.isArray(raw)) return null;
    return raw.map(mapLiveTag);
  } catch {
    return null;
  }
}

function livePayload(values: TagFormValues, id?: string) {
  const friendlyUrl = values.friendlyUrl || `tag/${slugify(values.name, id || `tag-${Date.now()}`)}`;
  const slug = slugify(friendlyUrl, id || `tag-${Date.now()}`);
  const parent = readStore().find((item) => item.id === values.parentId);
  return {
    id,
    slug,
    name: values.name,
    title: values.name,
    description: parent?.name ? `Child of ${parent.name}` : 'Storefront tag',
    metadataJson: {
      parentId: values.parentId || '',
      browseBy: parent?.name || '',
      friendlyUrl,
      published: values.published,
      sidebar: values.sidebar,
      cmsPageLink: id ? `<%= PageLink(${id.replace(/\D/g, '') || '100'}) %>` : '',
      recordType: 'storefront-tag',
    },
  };
}

async function writeLiveTag(values: TagFormValues, id?: string) {
  const payload: any = await liveJson(LIVE_ENDPOINT, {
    method: id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(livePayload(values, id)),
  });
  return mapLiveTag(payload?.data || payload?.item || payload?.payload || livePayload(values, id), 0);
}

async function deleteLiveTag(id: string) {
  await liveJson(`${LIVE_ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
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
    try {
      const live = await writeLiveTag(values);
      return ok(live);
    } catch {
      await wait();
      const next = hydrate(values, `tag-${Math.floor(Math.random() * 9000 + 1000)}`);
      writeStore([next, ...readStore()]);
      return ok(next);
    }
  },
  updateTag: async (id: string, values: TagFormValues): Promise<ApiResponse<Tag>> => {
    try {
      const live = await writeLiveTag(values, id);
      return ok(live);
    } catch {
      await wait();
      const next = hydrate(values, id);
      writeStore(readStore().map((item) => (item.id === id ? next : item)));
      return ok(next);
    }
  },
  deleteTag: async (id: string): Promise<ApiResponse<{ id: string }>> => {
    try {
      await deleteLiveTag(id);
    } catch {
      await wait();
    }
    writeStore(readStore().filter((item) => item.id !== id));
    return ok({ id });
  }
};
