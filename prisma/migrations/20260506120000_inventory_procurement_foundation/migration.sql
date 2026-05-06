ALTER TYPE "InventoryItemType" ADD VALUE IF NOT EXISTS 'STOCK_OWNED';
ALTER TYPE "InventoryItemType" ADD VALUE IF NOT EXISTS 'DEMAND_PURCHASED';

CREATE TYPE "SupplierQuoteStatus" AS ENUM ('ACTIVE', 'VOIDED');

ALTER TABLE "SupplierQuoteHistory"
  ADD COLUMN "status" "SupplierQuoteStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "correctionReason" TEXT,
  ADD COLUMN "voidReason" TEXT,
  ADD COLUMN "voidedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "WorkOrderEstimateLine"
  ADD COLUMN "supplierQuoteHistoryId" TEXT;

ALTER TABLE "WorkOrderActualCost"
  ADD COLUMN "supplierQuoteHistoryId" TEXT;

CREATE INDEX "InventoryItem_isActive_idx" ON "InventoryItem"("isActive");
CREATE INDEX "InventoryItem_itemType_idx" ON "InventoryItem"("itemType");
CREATE INDEX "InventoryItem_condition_idx" ON "InventoryItem"("condition");
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");
CREATE INDEX "SupplierQuoteHistory_inventoryItemId_status_quotedAt_idx" ON "SupplierQuoteHistory"("inventoryItemId", "status", "quotedAt");
CREATE INDEX "SupplierQuoteHistory_supplierId_status_quotedAt_idx" ON "SupplierQuoteHistory"("supplierId", "status", "quotedAt");
CREATE INDEX "SupplierQuoteHistory_status_idx" ON "SupplierQuoteHistory"("status");
CREATE INDEX "WorkOrderEstimateLine_supplierQuoteHistoryId_idx" ON "WorkOrderEstimateLine"("supplierQuoteHistoryId");
CREATE INDEX "WorkOrderActualCost_supplierQuoteHistoryId_idx" ON "WorkOrderActualCost"("supplierQuoteHistoryId");

ALTER TABLE "WorkOrderEstimateLine"
  ADD CONSTRAINT "WorkOrderEstimateLine_supplierQuoteHistoryId_fkey"
  FOREIGN KEY ("supplierQuoteHistoryId") REFERENCES "SupplierQuoteHistory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkOrderActualCost"
  ADD CONSTRAINT "WorkOrderActualCost_supplierQuoteHistoryId_fkey"
  FOREIGN KEY ("supplierQuoteHistoryId") REFERENCES "SupplierQuoteHistory"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
