CREATE TABLE IF NOT EXISTS "TenantEmailSettings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "brandName" TEXT NOT NULL DEFAULT 'HOLO PRINT',
  "fromName" TEXT NOT NULL DEFAULT 'HOLO PRINT',
  "fromEmail" TEXT NOT NULL DEFAULT '',
  "replyTo" TEXT NOT NULL DEFAULT '',
  "storefrontUrl" TEXT NOT NULL DEFAULT '',
  "adminUrl" TEXT NOT NULL DEFAULT '',
  "autoSendArtworkEmails" BOOLEAN NOT NULL DEFAULT false,
  "smtpHost" TEXT NOT NULL DEFAULT '',
  "smtpPort" TEXT NOT NULL DEFAULT '587',
  "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
  "smtpUser" TEXT NOT NULL DEFAULT '',
  "smtpPass" TEXT NOT NULL DEFAULT '',
  "templatesJson" JSONB,
  "metadataJson" JSONB,
  "migratedFromFile" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantEmailSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TenantEmailOutboxEmail" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "to" TEXT NOT NULL DEFAULT '',
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "html" TEXT,
  "reuploadLink" TEXT,
  "uploadId" TEXT,
  "orderId" TEXT,
  "quoteId" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "messageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "migratedFromFile" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantEmailOutboxEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantEmailSettings_tenantId_key" ON "TenantEmailSettings"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantEmailSettings_tenantId_idx" ON "TenantEmailSettings"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantEmailOutboxEmail_tenantId_status_idx" ON "TenantEmailOutboxEmail"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "TenantEmailOutboxEmail_tenantId_type_idx" ON "TenantEmailOutboxEmail"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "TenantEmailOutboxEmail_tenantId_orderId_idx" ON "TenantEmailOutboxEmail"("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "TenantEmailOutboxEmail_tenantId_uploadId_idx" ON "TenantEmailOutboxEmail"("tenantId", "uploadId");
CREATE INDEX IF NOT EXISTS "TenantEmailOutboxEmail_tenantId_createdAt_idx" ON "TenantEmailOutboxEmail"("tenantId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "TenantEmailSettings" ADD CONSTRAINT "TenantEmailSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "TenantEmailOutboxEmail" ADD CONSTRAINT "TenantEmailOutboxEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
