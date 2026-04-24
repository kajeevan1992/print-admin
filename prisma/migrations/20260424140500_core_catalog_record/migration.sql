-- Internal unified-core catalog records for resources that do not yet have first-class tables.
CREATE TABLE IF NOT EXISTS "CoreCatalogRecord" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoreCatalogRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_slug_key" ON "CoreCatalogRecord"("tenantId", "resource", "slug");
CREATE INDEX IF NOT EXISTS "CoreCatalogRecord_tenantId_resource_idx" ON "CoreCatalogRecord"("tenantId", "resource");
