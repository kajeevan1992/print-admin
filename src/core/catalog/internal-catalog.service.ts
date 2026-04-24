import type { Client, QueryResult } from 'pg';
import type { TenantContext } from '../tenant/types';
import { listDemoCatalog, toPaginated, type CatalogResource } from './catalog-store';
import { findTenantDatabaseConnection } from '../db/tenant-prisma';
import { toConnectionInput } from '../db/database-connection-store';
import { ensureTenantSchema, withPgClient } from '../db/tenant-schema';

type ListOptions = {
  search?: string;
  page?: number;
  limit?: number;
};

export type InternalCatalogWriteInput = {
  id?: string;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  metadataJson?: Record<string, unknown>;
  categoryId?: string | null;
  isActive?: boolean;
  priceFromMinor?: number | null;
  currency?: string;
};

export type InternalCatalogWriteMode = 'create' | 'update' | 'upsert';

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

function slugFromInput(input: InternalCatalogWriteInput) {
  return input.slug?.trim().replace(/^\/+/, '') || '';
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

async function getCatalogConnection(ctx: TenantContext) {
  const connection = await findTenantDatabaseConnection(ctx);
  if (!connection?.encryptedPassword) return null;
  const input = toConnectionInput(connection);
  await ensureTenantSchema(input);
  return input;
}

async function requireCatalogConnection(ctx: TenantContext) {
  const connectionInput = await getCatalogConnection(ctx);
  if (!connectionInput) throw new Error(`No writable tenant database configured for tenant ${ctx.tenantId}.`);
  return connectionInput;
}

async function ensureTenantRow(client: Client, tenantId: string) {
  await client.query(
    `INSERT INTO "Tenant" ("id", "name", "slug", "status", "defaultSubdomain", "updatedAt")
     VALUES ($1, $2, $1, 'ACTIVE', $1, CURRENT_TIMESTAMP)
     ON CONFLICT ("id") DO NOTHING`,
    [tenantId, tenantId]
  );
}

async function maybeResolveCategoryId(client: Client, tenantId: string, categoryId?: string | null) {
  if (categoryId === undefined) return undefined;
  if (categoryId === null || categoryId === '') return null;

  const result = await client.query(
    `SELECT "id" FROM "Category" WHERE "tenantId" = $1 AND ("id" = $2 OR "slug" = $2) LIMIT 1`,
    [tenantId, categoryId]
  );
  return result.rows[0]?.id ?? categoryId;
}

function productSelectSql() {
  return `SELECT p."id", p."slug", p."title", p."title" as "name", p."subtitle", p."subtitle" as "description", p."productType", p."isActive",
                 CASE WHEN p."isActive" THEN 'published' ELSE 'draft' END as "status",
                 p."priceFromMinor", p."currency", p."categoryId", p."createdAt", p."updatedAt",
                 c."name" as "categoryName", c."slug" as "categorySlug"
          FROM "Product" p
          LEFT JOIN "Category" c ON c."id" = p."categoryId" AND c."tenantId" = p."tenantId"`;
}

async function readProductByIdOrSlug(client: Client, tenantId: string, idOrSlug: string) {
  const result = await client.query(
    `${productSelectSql()} WHERE p."tenantId" = $1 AND (p."id" = $2 OR p."slug" = $2) LIMIT 1`,
    [tenantId, idOrSlug]
  );
  return result.rows[0] ?? null;
}

async function readCategoryByIdOrSlug(client: Client, tenantId: string, idOrSlug: string) {
  const result = await client.query(
    `SELECT c."id", c."slug", c."name", c."description", c."createdAt", c."updatedAt", count(p."id")::int as "productCount"
     FROM "Category" c
     LEFT JOIN "Product" p ON p."categoryId" = c."id" AND p."tenantId" = c."tenantId"
     WHERE c."tenantId" = $1 AND (c."id" = $2 OR c."slug" = $2)
     GROUP BY c."id"
     LIMIT 1`,
    [tenantId, idOrSlug]
  );
  return result.rows[0] ?? null;
}

async function readFromTenantDb(ctx: TenantContext, resource: CatalogResource, options: ListOptions) {
  const connectionInput = await getCatalogConnection(ctx);
  if (!connectionInput) return null;

  const search = normalizeSearch(options.search);
  const like = `%${search}%`;

  return withPgClient(connectionInput, async (client) => {
    await ensureTenantRow(client, ctx.tenantId);

    if (resource === 'products') {
      const result = await client.query(
        `${productSelectSql()}
         WHERE p."tenantId" = $1 AND ($2 = '' OR lower(concat_ws(' ', p."title", p."slug", p."subtitle", c."name")) LIKE $3)
         ORDER BY p."updatedAt" DESC, p."createdAt" DESC`,
        [ctx.tenantId, search, like]
      );
      return paginate(result.rows, options.page, options.limit);
    }

    if (resource === 'categories') {
      const result = await client.query(
        `SELECT c."id", c."slug", c."name", c."description", c."createdAt", c."updatedAt", count(p."id")::int as "productCount"
         FROM "Category" c
         LEFT JOIN "Product" p ON p."categoryId" = c."id" AND p."tenantId" = c."tenantId"
         WHERE c."tenantId" = $1 AND ($2 = '' OR lower(concat_ws(' ', c."name", c."slug", c."description")) LIKE $3)
         GROUP BY c."id"
         ORDER BY c."updatedAt" DESC, c."createdAt" DESC`,
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
  } catch (error) {
    if (resource === 'products' || resource === 'categories') throw error;
  }

  if (resource === 'products' || resource === 'categories') {
    return toPaginated([], options.page || 1, options.limit || 50);
  }

  const items = filterItems(listDemoCatalog(resource), options.search);
  return toPaginated(items, options.page || 1, options.limit || 50);
}

export async function listInternalCatalogArray(ctx: TenantContext, resource: CatalogResource, options: ListOptions = {}) {
  const result = await listInternalCatalog(ctx, resource, options);
  return result.items;
}

async function createProduct(client: Client, ctx: TenantContext, input: InternalCatalogWriteInput) {
  const slug = slugFromInput(input);
  if (!slug) throw new Error('Product create requires a slug.');
  const id = input.id || makeId('product');
  const categoryId = await maybeResolveCategoryId(client, ctx.tenantId, input.categoryId);
  const result = await client.query(
    `INSERT INTO "Product" ("id", "tenantId", "slug", "title", "subtitle", "categoryId", "isActive", "priceFromMinor", "currency", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
     RETURNING "id"`,
    [id, ctx.tenantId, slug, input.title || input.name || slug, input.description || null, categoryId ?? null, input.isActive ?? true, input.priceFromMinor ?? null, input.currency || 'GBP']
  );
  return readProductByIdOrSlug(client, ctx.tenantId, result.rows[0].id);
}

async function updateProduct(client: Client, ctx: TenantContext, input: InternalCatalogWriteInput) {
  const idOrSlug = input.id || slugFromInput(input);
  if (!idOrSlug) throw new Error('Product update requires an id or slug.');
  const current = await readProductByIdOrSlug(client, ctx.tenantId, idOrSlug);
  if (!current) throw new Error(`Product ${idOrSlug} was not found in tenant database.`);
  const categoryId = await maybeResolveCategoryId(client, ctx.tenantId, input.categoryId);
  const nextSlug = slugFromInput(input) || current.slug;
  await client.query(
    `UPDATE "Product"
     SET "slug" = $3,
         "title" = COALESCE($4, "title"),
         "subtitle" = $5,
         "categoryId" = CASE WHEN $6::boolean THEN $7 ELSE "categoryId" END,
         "isActive" = COALESCE($8, "isActive"),
         "priceFromMinor" = CASE WHEN $9::boolean THEN $10 ELSE "priceFromMinor" END,
         "currency" = COALESCE($11, "currency"),
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "tenantId" = $1 AND "id" = $2`,
    [
      ctx.tenantId,
      current.id,
      nextSlug,
      input.title || input.name || null,
      input.description ?? current.description ?? null,
      input.categoryId !== undefined,
      categoryId ?? null,
      input.isActive ?? null,
      input.priceFromMinor !== undefined,
      input.priceFromMinor ?? null,
      input.currency || null,
    ]
  );
  return readProductByIdOrSlug(client, ctx.tenantId, current.id);
}

async function createCategory(client: Client, ctx: TenantContext, input: InternalCatalogWriteInput) {
  const slug = slugFromInput(input);
  if (!slug) throw new Error('Category create requires a slug.');
  const id = input.id || makeId('category');
  const result = await client.query(
    `INSERT INTO "Category" ("id", "tenantId", "slug", "name", "description", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
     RETURNING "id"`,
    [id, ctx.tenantId, slug, input.name || input.title || slug, input.description || null]
  );
  return readCategoryByIdOrSlug(client, ctx.tenantId, result.rows[0].id);
}

async function updateCategory(client: Client, ctx: TenantContext, input: InternalCatalogWriteInput) {
  const idOrSlug = input.id || slugFromInput(input);
  if (!idOrSlug) throw new Error('Category update requires an id or slug.');
  const current = await readCategoryByIdOrSlug(client, ctx.tenantId, idOrSlug);
  if (!current) throw new Error(`Category ${idOrSlug} was not found in tenant database.`);
  const nextSlug = slugFromInput(input) || current.slug;
  await client.query(
    `UPDATE "Category"
     SET "slug" = $3,
         "name" = COALESCE($4, "name"),
         "description" = $5,
         "updatedAt" = CURRENT_TIMESTAMP
     WHERE "tenantId" = $1 AND "id" = $2`,
    [ctx.tenantId, current.id, nextSlug, input.name || input.title || null, input.description ?? current.description ?? null]
  );
  return readCategoryByIdOrSlug(client, ctx.tenantId, current.id);
}

async function writeGenericRecord(client: Client, ctx: TenantContext, resource: CatalogResource, input: InternalCatalogWriteInput, mode: InternalCatalogWriteMode) {
  const slug = slugFromInput(input);
  if (!slug) throw new Error(`${resource} writes require a slug.`);
  const id = input.id || makeId(resource.replace(/[^a-z]/g, ''));

  if (mode === 'create') {
    const result = await client.query(
      `INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, ctx.tenantId, resource, slug, input.name || input.title || slug, input.description || null, input.metadataJson || null]
    );
    return result.rows[0];
  }

  const result: QueryResult = await client.query(
    `UPDATE "CoreCatalogRecord"
     SET "slug" = $4, "name" = COALESCE($5, "name"), "description" = $6, "metadataJson" = COALESCE($7, "metadataJson"), "updatedAt" = CURRENT_TIMESTAMP
     WHERE "tenantId" = $1 AND "resource" = $2 AND ("id" = $3 OR "slug" = $3)
     RETURNING *`,
    [ctx.tenantId, resource, input.id || slug, slug, input.name || input.title || null, input.description || null, input.metadataJson || null]
  );

  if (result.rows[0]) return result.rows[0];
  if (mode === 'upsert') {
    const created = await client.query(
      `INSERT INTO "CoreCatalogRecord" ("id", "tenantId", "resource", "slug", "name", "description", "metadataJson", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, ctx.tenantId, resource, slug, input.name || input.title || slug, input.description || null, input.metadataJson || null]
    );
    return created.rows[0];
  }
  throw new Error(`${resource} record ${input.id || slug} was not found in tenant database.`);
}

export async function writeInternalCatalogRecord(ctx: TenantContext, resource: CatalogResource, input: InternalCatalogWriteInput, mode: InternalCatalogWriteMode = 'upsert') {
  const connectionInput = await requireCatalogConnection(ctx);

  return withPgClient(connectionInput, async (client) => {
    await ensureTenantRow(client, ctx.tenantId);

    if (resource === 'products') {
      if (mode === 'create') return createProduct(client, ctx, input);
      if (mode === 'update') return updateProduct(client, ctx, input);
      try {
        return await updateProduct(client, ctx, input);
      } catch (error) {
        if (error instanceof Error && error.message.includes('was not found')) return createProduct(client, ctx, input);
        throw error;
      }
    }

    if (resource === 'categories') {
      if (mode === 'create') return createCategory(client, ctx, input);
      if (mode === 'update') return updateCategory(client, ctx, input);
      try {
        return await updateCategory(client, ctx, input);
      } catch (error) {
        if (error instanceof Error && error.message.includes('was not found')) return createCategory(client, ctx, input);
        throw error;
      }
    }

    return writeGenericRecord(client, ctx, resource, input, mode);
  });
}

export const upsertInternalCatalogRecord = (ctx: TenantContext, resource: CatalogResource, input: InternalCatalogWriteInput) =>
  writeInternalCatalogRecord(ctx, resource, input, 'upsert');

export async function deleteInternalCatalogRecord(ctx: TenantContext, resource: CatalogResource, id: string) {
  const connectionInput = await requireCatalogConnection(ctx);

  return withPgClient(connectionInput, async (client) => {
    await ensureTenantRow(client, ctx.tenantId);
    if (resource === 'products') {
      const result = await client.query('DELETE FROM "Product" WHERE "tenantId" = $1 AND ("id" = $2 OR "slug" = $2) RETURNING "id", "slug", "title"', [ctx.tenantId, id]);
      return { ok: true, deleted: result.rowCount, item: result.rows[0] ?? null };
    }

    if (resource === 'categories') {
      await client.query('UPDATE "Product" SET "categoryId" = NULL, "updatedAt" = CURRENT_TIMESTAMP WHERE "tenantId" = $1 AND "categoryId" = $2', [ctx.tenantId, id]);
      const result = await client.query('DELETE FROM "Category" WHERE "tenantId" = $1 AND ("id" = $2 OR "slug" = $2) RETURNING "id", "slug", "name"', [ctx.tenantId, id]);
      return { ok: true, deleted: result.rowCount, item: result.rows[0] ?? null };
    }

    const result = await client.query('DELETE FROM "CoreCatalogRecord" WHERE "tenantId" = $1 AND "resource" = $2 AND ("id" = $3 OR "slug" = $3) RETURNING "id", "slug", "name"', [ctx.tenantId, resource, id]);
    return { ok: true, deleted: result.rowCount, item: result.rows[0] ?? null };
  });
}
