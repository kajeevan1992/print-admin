-- Platform Super Admin deployment/demo tables.
-- Safe for existing databases: all tables and indexes use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "PlatformDeployment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "tenantName" TEXT NOT NULL,
  "environment" TEXT NOT NULL DEFAULT 'production',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "owner" TEXT NOT NULL DEFAULT 'Owner Ops',
  "scheduledFor" TEXT,
  "note" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformDeployment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformDeployment_tenantId_idx" ON "PlatformDeployment"("tenantId");
CREATE INDEX IF NOT EXISTS "PlatformDeployment_status_idx" ON "PlatformDeployment"("status");
CREATE INDEX IF NOT EXISTS "PlatformDeployment_environment_idx" ON "PlatformDeployment"("environment");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Tenant')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformDeployment_tenantId_fkey') THEN
    ALTER TABLE "PlatformDeployment"
      ADD CONSTRAINT "PlatformDeployment_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformDemoUpload" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "tenantName" TEXT NOT NULL,
  "assetPack" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "uploadedBy" TEXT NOT NULL DEFAULT 'Owner Ops',
  "updatedLabel" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformDemoUpload_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformDemoUpload_tenantId_idx" ON "PlatformDemoUpload"("tenantId");
CREATE INDEX IF NOT EXISTS "PlatformDemoUpload_status_idx" ON "PlatformDemoUpload"("status");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Tenant')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PlatformDemoUpload_tenantId_fkey') THEN
    ALTER TABLE "PlatformDemoUpload"
      ADD CONSTRAINT "PlatformDemoUpload_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
