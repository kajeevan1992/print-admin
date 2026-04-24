import { Client } from 'pg';
import type { PostgresConnectionInput } from './connection-string';
import { buildPgClientConfig } from './pg-client-config';

export async function withPgClient<T>(input: PostgresConnectionInput, fn: (client: Client) => Promise<T>) {
  const client = new Client(buildPgClientConfig(input));
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function ensureTenantSchema(input: PostgresConnectionInput) {
  return withPgClient(input, async (client) => {
    await client.query('BEGIN');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "Tenant" (
          "id" text PRIMARY KEY,
          "name" text NOT NULL,
          "slug" text NOT NULL UNIQUE,
          "status" text NOT NULL DEFAULT 'ACTIVE',
          "defaultSubdomain" text NOT NULL UNIQUE,
          "primaryDomain" text,
          "planName" text NOT NULL DEFAULT 'Starter',
          "storefrontsLimit" integer NOT NULL DEFAULT 1,
          "adminUsersLimit" integer NOT NULL DEFAULT 3,
          "storageLimitGb" integer NOT NULL DEFAULT 10,
          "themeKey" text NOT NULL DEFAULT 'base',
          "supportEmail" text,
          "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS "Category" (
          "id" text PRIMARY KEY,
          "tenantId" text NOT NULL,
          "slug" text NOT NULL,
          "name" text NOT NULL,
          "description" text,
          "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "Category_tenantId_slug_key" ON "Category"("tenantId", "slug")');
      await client.query('CREATE INDEX IF NOT EXISTS "Category_tenantId_idx" ON "Category"("tenantId")');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "Product" (
          "id" text PRIMARY KEY,
          "tenantId" text NOT NULL,
          "categoryId" text,
          "slug" text NOT NULL,
          "title" text NOT NULL,
          "subtitle" text,
          "productType" text NOT NULL DEFAULT 'STANDARD',
          "isActive" boolean NOT NULL DEFAULT true,
          "priceFromMinor" integer,
          "currency" text NOT NULL DEFAULT 'GBP',
          "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "Product_tenantId_slug_key" ON "Product"("tenantId", "slug")');
      await client.query('CREATE INDEX IF NOT EXISTS "Product_tenantId_categoryId_idx" ON "Product"("tenantId", "categoryId")');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" (
          "id" text PRIMARY KEY,
          "tenantId" text NOT NULL,
          "resource" text NOT NULL,
          "slug" text NOT NULL,
          "name" text NOT NULL,
          "description" text,
          "metadataJson" jsonb,
          "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await client.query('CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_slug_key" ON "CoreCatalogRecord"("tenantId", "resource", "slug")');
      await client.query('CREATE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_idx" ON "CoreCatalogRecord"("tenantId", "resource")');
      await client.query('COMMIT');
      return { ok: true, message: 'Tenant schema is ready.' };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  });
}
