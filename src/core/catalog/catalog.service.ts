import type { TenantContext } from '../tenant/types';

export type CatalogListResult<T> = {
  items: T[];
  source: 'internal-core' | 'fallback';
};

export async function listCatalogProducts(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}

export async function listCatalogCategories(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}

export async function listCatalogCollections(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}

export async function listCatalogTags(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}

export async function listMaterials(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}

export async function listFinishes(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}

export async function listOptionSets(_ctx: TenantContext): Promise<CatalogListResult<Record<string, unknown>>> {
  return { items: [], source: 'internal-core' };
}
