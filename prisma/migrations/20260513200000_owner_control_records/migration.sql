CREATE TABLE IF NOT EXISTS "OwnerControlRecord" (
  "id" TEXT PRIMARY KEY,
  "resource" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "scope" TEXT,
  "tenantId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "OwnerControlRecord_resource_recordId_key" ON "OwnerControlRecord" ("resource", "recordId");
CREATE INDEX IF NOT EXISTS "OwnerControlRecord_resource_idx" ON "OwnerControlRecord" ("resource");
CREATE INDEX IF NOT EXISTS "OwnerControlRecord_tenantId_idx" ON "OwnerControlRecord" ("tenantId");
CREATE INDEX IF NOT EXISTS "OwnerControlRecord_status_idx" ON "OwnerControlRecord" ("status");