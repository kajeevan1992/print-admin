CREATE TABLE IF NOT EXISTS "TenantOnboarding" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "companyName" TEXT NOT NULL,
  "ownerName" TEXT,
  "ownerEmail" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "checklistJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OwnerInvitation" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "StoreActivation" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "storefrontName" TEXT NOT NULL,
  "theme" TEXT,
  "status" TEXT NOT NULL DEFAULT 'inactive',
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TenantOnboarding_status_idx" ON "TenantOnboarding" ("status");
CREATE INDEX IF NOT EXISTS "OwnerInvitation_status_idx" ON "OwnerInvitation" ("status");
CREATE INDEX IF NOT EXISTS "StoreActivation_status_idx" ON "StoreActivation" ("status");