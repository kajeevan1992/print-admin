-- Platform billing tables for Super Admin SaaS billing.
-- Safe for existing databases: all tables and indexes use IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "PlatformBillingPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "monthlyPriceMinor" INTEGER NOT NULL DEFAULT 0,
  "yearlyPriceMinor" INTEGER NOT NULL DEFAULT 0,
  "storefrontsLimit" INTEGER NOT NULL DEFAULT 1,
  "adminUsersLimit" INTEGER NOT NULL DEFAULT 3,
  "storageLimitGb" INTEGER NOT NULL DEFAULT 10,
  "apiAccess" BOOLEAN NOT NULL DEFAULT false,
  "supplierIntegrations" BOOLEAN NOT NULL DEFAULT false,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformBillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBillingPlan_name_key" ON "PlatformBillingPlan"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBillingPlan_slug_key" ON "PlatformBillingPlan"("slug");

CREATE TABLE IF NOT EXISTS "PlatformBillingSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'trialing',
  "billingInterval" TEXT NOT NULL DEFAULT 'monthly',
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "amountMinor" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "providerCustomerId" TEXT,
  "providerSubscriptionId" TEXT,
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformBillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformBillingSubscription_tenantId_idx" ON "PlatformBillingSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "PlatformBillingSubscription_planId_idx" ON "PlatformBillingSubscription"("planId");
CREATE INDEX IF NOT EXISTS "PlatformBillingSubscription_status_idx" ON "PlatformBillingSubscription"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingSubscription_tenantId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingSubscription"
      ADD CONSTRAINT "PlatformBillingSubscription_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingSubscription_planId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingSubscription"
      ADD CONSTRAINT "PlatformBillingSubscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "PlatformBillingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformBillingInvoice" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
  "taxMinor" INTEGER NOT NULL DEFAULT 0,
  "totalMinor" INTEGER NOT NULL DEFAULT 0,
  "amountPaidMinor" INTEGER NOT NULL DEFAULT 0,
  "dueAt" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "providerInvoiceId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformBillingInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformBillingInvoice_invoiceNumber_key" ON "PlatformBillingInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "PlatformBillingInvoice_tenantId_idx" ON "PlatformBillingInvoice"("tenantId");
CREATE INDEX IF NOT EXISTS "PlatformBillingInvoice_subscriptionId_idx" ON "PlatformBillingInvoice"("subscriptionId");
CREATE INDEX IF NOT EXISTS "PlatformBillingInvoice_status_idx" ON "PlatformBillingInvoice"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingInvoice_tenantId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingInvoice"
      ADD CONSTRAINT "PlatformBillingInvoice_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingInvoice_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingInvoice"
      ADD CONSTRAINT "PlatformBillingInvoice_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "PlatformBillingSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformBillingPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "invoiceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "provider" TEXT NOT NULL DEFAULT 'manual',
  "providerPaymentId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "amountMinor" INTEGER NOT NULL DEFAULT 0,
  "paidAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformBillingPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformBillingPayment_tenantId_idx" ON "PlatformBillingPayment"("tenantId");
CREATE INDEX IF NOT EXISTS "PlatformBillingPayment_subscriptionId_idx" ON "PlatformBillingPayment"("subscriptionId");
CREATE INDEX IF NOT EXISTS "PlatformBillingPayment_invoiceId_idx" ON "PlatformBillingPayment"("invoiceId");
CREATE INDEX IF NOT EXISTS "PlatformBillingPayment_status_idx" ON "PlatformBillingPayment"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingPayment_tenantId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingPayment"
      ADD CONSTRAINT "PlatformBillingPayment_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingPayment_subscriptionId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingPayment"
      ADD CONSTRAINT "PlatformBillingPayment_subscriptionId_fkey"
      FOREIGN KEY ("subscriptionId") REFERENCES "PlatformBillingSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformBillingPayment_invoiceId_fkey'
  ) THEN
    ALTER TABLE "PlatformBillingPayment"
      ADD CONSTRAINT "PlatformBillingPayment_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "PlatformBillingInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "PlatformBillingPlan" (
  "id", "name", "slug", "currency", "monthlyPriceMinor", "yearlyPriceMinor",
  "storefrontsLimit", "adminUsersLimit", "storageLimitGb", "apiAccess", "supplierIntegrations"
) VALUES
  ('plan-starter', 'Starter', 'starter', 'GBP', 6900, 69000, 1, 3, 10, false, false),
  ('plan-growth', 'Growth', 'growth', 'GBP', 24900, 249000, 3, 15, 100, true, true),
  ('plan-enterprise', 'Enterprise', 'enterprise', 'GBP', 59900, 599000, 10, 50, 500, true, true)
ON CONFLICT ("slug") DO UPDATE SET
  "name" = EXCLUDED."name",
  "currency" = EXCLUDED."currency",
  "monthlyPriceMinor" = EXCLUDED."monthlyPriceMinor",
  "yearlyPriceMinor" = EXCLUDED."yearlyPriceMinor",
  "storefrontsLimit" = EXCLUDED."storefrontsLimit",
  "adminUsersLimit" = EXCLUDED."adminUsersLimit",
  "storageLimitGb" = EXCLUDED."storageLimitGb",
  "apiAccess" = EXCLUDED."apiAccess",
  "supplierIntegrations" = EXCLUDED."supplierIntegrations",
  "updatedAt" = CURRENT_TIMESTAMP;
