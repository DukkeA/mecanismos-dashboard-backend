-- Add lifecycle columns with defaults for new writes.
ALTER TABLE "Customer" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Vehicle" ADD COLUMN "isActive" BOOLEAN DEFAULT true;
ALTER TABLE "Component" ADD COLUMN "isActive" BOOLEAN DEFAULT true;

-- Backfill existing master-data rows as active.
UPDATE "Customer" SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE "Vehicle" SET "isActive" = true WHERE "isActive" IS NULL;
UPDATE "Component" SET "isActive" = true WHERE "isActive" IS NULL;

-- Enforce lifecycle presence after backfill.
ALTER TABLE "Customer" ALTER COLUMN "isActive" SET NOT NULL;
ALTER TABLE "Vehicle" ALTER COLUMN "isActive" SET NOT NULL;
ALTER TABLE "Component" ALTER COLUMN "isActive" SET NOT NULL;

-- Customer lifecycle indexes.
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");
CREATE INDEX "Customer_documentType_isActive_idx" ON "Customer"("documentType", "isActive");

-- Vehicle lifecycle indexes.
CREATE INDEX "Vehicle_isActive_idx" ON "Vehicle"("isActive");
CREATE INDEX "Vehicle_customerId_isActive_idx" ON "Vehicle"("customerId", "isActive");

-- Component lifecycle indexes.
CREATE INDEX "Component_isActive_idx" ON "Component"("isActive");
CREATE INDEX "Component_customerId_isActive_idx" ON "Component"("customerId", "isActive");
CREATE INDEX "Component_vehicleId_isActive_idx" ON "Component"("vehicleId", "isActive");
CREATE INDEX "Component_componentTypeId_isActive_idx" ON "Component"("componentTypeId", "isActive");
