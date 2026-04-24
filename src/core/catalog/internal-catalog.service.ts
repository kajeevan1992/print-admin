import type { TenantContext } from '../tenant/types';
import { listDemoCatalog, toPaginated, type CatalogResource } from './catalog-store';
import { findTenantDatabaseConnection } from '../db/tenant-prisma';
import { toConnectionInput } from '../db/database-connection-store';
import { withPgClient } from '../db/tenant-schema';

type ListOptions = {
  search?: string;
  page?: number;
  limit?: number;
};

type WriteInput = {
  id?: string;
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  metadataJson?: Record<string, unknown>;
  categoryId?: string | null;
  isActive?: boolean;
  priceFromMinor?: number | null;
  currency?: string;
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

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function paginate<T>(items: T[], page = 1, limit = 50) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const offset = (safePage - 1) * safeLimit;
  return {
    items: items.slice(offset, offset + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / safeLimit)),
    },
  };
}

async function readFromTenantDb(ctx: TenantContext, resource: CatalogResource, options: ListOptions) {
  const connection = await findTenantDatabaseConnection(ctx);
  if (!connection?.encryptedPassword) return null;

  const search = normalizeSearch(options.search);
  const like = `%${search}%`;

  return withPgClient(toConnectionInput(connection), async (client) => {
    if (resource === 'products') {
      const result = await client.query(
        `SELECT p."id", p."slug", p."title", p."subtitle", p."productType", p."isActive", p."priceFromMinor", p."currency", p."categoryId", p."createdAt", p."updatedAt", c."name" as "categoryName", c."slug" as "categorySlug"
         FROM "Product" p
         LEFT JOIN "Category" c ON c."id" = p."categoryId"
         WHERE p."tenantId" = $1 AND ($2 = '' OR lower(concat_ws(' ', p."title", p."slug", p."subtitle", c."name")) LIKE $3)
         ORDER BY p."updatedAt" DESC, p."createdAt" DESC`,
        [ctx.tenantId, search, like]
      );
      return paginate(result.rows, options.page, options.limit);
    }

    if (resource === 'categories') {
      const result = await client.query(
        `SELECT "id", "slug", "name", "description", "createdAt", "updatedAt"
         FROM "Category"
         WHERE "tenantId" = $1 AND ($2 = '' OR lower(concat_ws(' ', "name", "slug", "description")) LIKE $3)
         ORDER BY "updatedAt" DESC, "createdAt" DESC`,
        [ctx.tenantId, search, like]
      );
      return paginate(result.rows, options.page, options.limit);
    }

    const result = await client.query(
      `SELECT "id", "slug", "name", "description", "metadataJson", "createdAt", "updatedAt"
       FROM "CoreCatalogRecord"
       WHERE "tenantId" = $1 AND "resource" = $2 AND ($3 = '' OR lower(concat_ws(' ', "name", "slug", "description")) LIKE $4)
       ORDER BY "updatedAt" DESC, "createdAt" DESC`,
      [ctx.tenantId, resource, search, like]
    );
    return paginate(result.rows, options.page, options.limit);
  });
}

export async function listInternalCatalog(ctx: TenantContext, resource: CatalogResource, options: ListOptions = {}) {
  try {
    const dbData = await readFromTenantDb(ctx, resource, options);
    if (dbData) return dbData;
  } catch {
    // Keep admin usable if the selected tenant DB has not been initialised yet.
  }

  const items = filterItems(listDemoCatalog(resource), options.search);
  return toPaginated(items, options.page || 1, options.limit || 50);
}

export async function listInternalCatalogArray(ctx: TenantContext, resource: CatalogResource, options: ListOptions = {}) {
  const result = await listInternalCatalog(ctx, resource, options);
  return result.items;
}

export async function upsertInternalCatalogRecord(ctx: TenantContext, resource: CatalogResource, input: WriteInput) {
  const connection = await findTenantDatabaseConnection(ctx);
  if (!connection?.encryptedPassword) throw new Error(`No writable tenant database configured for tenant ${ctx.tenantId}.`);

  return withPgClient(toConnectionInput(connection), async (client) => {
    const id = input.id || makeId(resource.replace(/[^a-z]/g, ''));
    if (resource === 'products') {
      const result = await client.query(
        `INSERT INTO "Product" ("id", "tenantId", "slug", "title", "subtitle", "categoryId", "isActive", "priceFromMinor", "currency", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
         ON CONFLICT ("tenantId", "slug") DO UPDATE SET
           "title" = EXCLUDED."title", "subtitle" = EXCLUDED."subtitle", "categoryId" = EXCLUDED."categoryId",
           "isActive" = EXCLUDED."isActive", "priceFromMinor" = EXCLUDED."priceFromMinor", "currency" = EXCLUDED."currency", "updatedAt" = CURRENT_TIMESTAMP
         RETURNING *`,
        [id, ctx.tenantId, input.slug, input.title || input.name || input.slug, input.description || null, input.categoryId || null, input.isActive ?? true, input.priceFromMinor ?? null, input.currency || 'GBP']
      );
      return result.rows[0];
    }

    if (resource === 'categories') {
      const result = await client.query(
        `INSERT INTO "Category" ("id", "tenantId", "slug", "name", "description", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
         ON CONFLICT ("tenantId", "slug") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "updatedAt" = CURRENT_TIMESTAMP
         RETURNING *`,
        [id, ctx.tenantId, input.slug, input.name || input.title || input.slug, input.description || null]
      );
      return result.rows[0];
    }

    const result = await client.query(
      `INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
       ON CONFLICT ("tenantId", "resource", "slug") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "metadataJson" = EXCLUDED."metadataJson", "updatedAt" = CURRENT_TIMESTAMP
       RETURNING *`,
      [id, ctx.tenantId, resource, input.slug, input.name || input.title || input.slug, input.description || null, input.metadataJson || null]
    );
    return result.rows[0];
  });
}

export async function deleteInternalCatalogRecord(ctx: TenantContext, resource: CatalogResource, id: string) {
  const connection = await findTenantDatabaseConnection(ctx);
  if (!connection?.encryptedPassword) throw new Error(`No writable tenant database configured for tenant ${ctx.tenantId}.`);

  return withPgClient(toConnectionInput(connection), async (client) => {
    if (resource === 'products') {
      await client.query('DELETE FROM "Product" WHERE "tenantId" = $1 AND "id" = $2', [ctx.tenantId, id]);
    } else if (resource === 'categories') {
      await client.query('DELETE FROM "Category" WHERE "tenantId" = $1 AND "id" = $2', [ctx.tenantId, id]);
    } else {
      await client.query('DELETE FROM "CoreCatalogRecord" WHERE "tenantId" = $1 AND "resource" = $2 AND "id" = $3', [ctx.tenantId, resource, id]);
    }
    return { ok: true };
  });
}
