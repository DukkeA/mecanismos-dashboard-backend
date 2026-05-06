-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('CEDULA', 'NIT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('PERSON', 'COMPANY');

-- AlterTable
ALTER TABLE "Supplier"
ADD COLUMN "contactName" TEXT,
ADD COLUMN "documentNumber" TEXT,
ADD COLUMN "documentType" "SupplierDocumentType",
ADD COLUMN "notes" TEXT,
ADD COLUMN "type" "SupplierType" NOT NULL DEFAULT 'COMPANY';

-- CreateTable
CREATE TABLE "SupplierPhone" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "label" TEXT,
    "phone" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "hasWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPhone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_isActive_idx" ON "Supplier"("isActive");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "Supplier_type_idx" ON "Supplier"("type");

-- CreateIndex
CREATE INDEX "Supplier_documentNumber_idx" ON "Supplier"("documentNumber");

-- CreateIndex
CREATE INDEX "SupplierPhone_isPrimary_idx" ON "SupplierPhone"("isPrimary");

-- CreateIndex
CREATE INDEX "SupplierPhone_phone_idx" ON "SupplierPhone"("phone");

-- CreateIndex
CREATE INDEX "SupplierPhone_supplierId_idx" ON "SupplierPhone"("supplierId");

-- Backfill existing flat phones into child rows and skip blanks for reviewer visibility.
INSERT INTO "SupplierPhone" (
    "id",
    "supplierId",
    "phone",
    "isPrimary",
    "hasWhatsapp",
    "createdAt",
    "updatedAt"
)
SELECT
    "id" || '-legacy-phone',
    "id",
    TRIM("phone"),
    true,
    false,
    "createdAt",
    "updatedAt"
FROM "Supplier"
WHERE "phone" IS NOT NULL
  AND TRIM("phone") <> '';

-- Drop legacy global uniqueness after preserving ids and relations.
DROP INDEX "Supplier_name_key";

-- AddForeignKey
ALTER TABLE "SupplierPhone"
ADD CONSTRAINT "SupplierPhone_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Supplier"
DROP COLUMN "phone";
