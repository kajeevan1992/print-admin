import type { TenantContext } from '../tenant/types';
import { listDemoCatalog, toPaginated, type CatalogResource } from './catalog-store';

type ListOptions = {
  search?: string;
  page?: number;
  limit?: number;
};

function normalizeSearch(value?: string) {
  return value?.trim().toLowerCase() || '';
}

function filterItems(items: Record<string, unknown>[], search?: string) {
  const q = normalizeSearch(search);
  if (!q) return items;
  return items.filter((item) =>
    [item.name, item.title, item.slug, item.friendlyUrl, item.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q)
  );
}

export async function listInternalCatalog(_ctx: TenantContext, resource: CatalogResource, options: ListOptions = {}) {
  // This is the unified-core entry point. Current phase uses internal demo/fallback data
  // until tenant DB connection resolution + Prisma-per-tenant queries are fully enabled.
  const items = filterItems(listDemoCatalog(resource), options.search);
  return toPaginated(items, options.page || 1, options.limit || 50);
}

export async function listInternalCatalogArray(ctx: TenantContext, resource: CatalogResource, options: ListOptions = {}) {
  const result = await listInternalCatalog(ctx, resource, options);
  return result.items;
}
