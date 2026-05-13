CREATE TABLE IF NOT EXISTS "InventoryItem" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'unit',
  "supplierName" TEXT,
  "supplierSku" TEXT,
  "supplierCostMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "onHandQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reorderPointQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_tenantId_sku_key" ON "InventoryItem" ("tenantId", "sku");
CREATE INDEX IF NOT EXISTS "InventoryItem_tenantId_idx" ON "InventoryItem" ("tenantId");

CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitCostMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "referenceType" TEXT,
  "referenceId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StockMovement_tenantId_idx" ON "StockMovement" ("tenantId");
CREATE INDEX IF NOT EXISTS "StockMovement_inventoryItemId_idx" ON "StockMovement" ("inventoryItemId");

CREATE TABLE IF NOT EXISTS "StockReservation" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "orderId" TEXT,
  "productionJobId" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockReservation_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StockReservation_tenantId_idx" ON "StockReservation" ("tenantId");
CREATE INDEX IF NOT EXISTS "StockReservation_inventoryItemId_idx" ON "StockReservation" ("inventoryItemId");

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "supplierName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
  "taxMinor" INTEGER NOT NULL DEFAULT 0,
  "totalMinor" INTEGER NOT NULL DEFAULT 0,
  "expectedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder" ("tenantId", "poNumber");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_tenantId_status_idx" ON "PurchaseOrder" ("tenantId", "status");

CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "inventoryItemId" TEXT,
  "sku" TEXT,
  "description" TEXT NOT NULL,
  "quantityOrdered" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quantityReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "unitCostMinor" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'GBP',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PurchaseOrderLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine" ("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "PurchaseOrderLine_inventoryItemId_idx" ON "PurchaseOrderLine" ("inventoryItemId");

CREATE TABLE IF NOT EXISTS "ConsumptionPlan" (
  "id" TEXT PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT,
  "productionJobId" TEXT,
  "inventoryItemId" TEXT NOT NULL,
  "plannedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "consumedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsumptionPlan_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ConsumptionPlan_tenantId_idx" ON "ConsumptionPlan" ("tenantId");
CREATE INDEX IF NOT EXISTS "ConsumptionPlan_inventoryItemId_idx" ON "ConsumptionPlan" ("inventoryItemId");