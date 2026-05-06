-- AlterTable
ALTER TABLE "ServiceCatalog" ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "ServiceCatalog" ALTER COLUMN "slug" SET NOT NULL;

-- DropIndex
DROP INDEX "ServiceCatalog_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalog_slug_key" ON "ServiceCatalog"("slug");

-- CreateIndex
CREATE INDEX "ServiceCatalog_name_idx" ON "ServiceCatalog"("name");

-- CreateIndex
CREATE INDEX "ServiceCatalog_isActive_idx" ON "ServiceCatalog"("isActive");
