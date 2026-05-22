CREATE TABLE IF NOT EXISTS "ProductionJobTicket" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT,
  "orderNumber" TEXT NOT NULL,
  "artworkUploadId" TEXT,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "dueDate" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "artworkStatus" TEXT NOT NULL DEFAULT 'approved',
  "machine" TEXT NOT NULL DEFAULT 'Unassigned',
  "material" TEXT NOT NULL DEFAULT '',
  "routeJson" JSONB,
  "finishingJson" JSONB,
  "supplier" TEXT NOT NULL DEFAULT 'internal',
  "notes" TEXT,
  "operatorNotes" TEXT,
  "warningsJson" JSONB,
  "startedAt" TIMESTAMP(3),
  "printCompletedAt" TIMESTAMP(3),
  "packedAt" TIMESTAMP(3),
  "dispatchedAt" TIMESTAMP(3),
  "blockedAt" TIMESTAMP(3),
  "blockedReason" TEXT,
  "currentOperator" TEXT,
  "dispatchJson" JSONB,
  "stageHistoryJson" JSONB,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "metadataJson" JSONB,
  "migratedFromFile" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionJobTicket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductionJobTicket_tenantId_artworkUploadId_key" ON "ProductionJobTicket"("tenantId", "artworkUploadId");
CREATE INDEX IF NOT EXISTS "ProductionJobTicket_tenantId_status_idx" ON "ProductionJobTicket"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ProductionJobTicket_tenantId_orderId_idx" ON "ProductionJobTicket"("tenantId", "orderId");
CREATE INDEX IF NOT EXISTS "ProductionJobTicket_tenantId_orderNumber_idx" ON "ProductionJobTicket"("tenantId", "orderNumber");
CREATE INDEX IF NOT EXISTS "ProductionJobTicket_tenantId_artworkUploadId_idx" ON "ProductionJobTicket"("tenantId", "artworkUploadId");
