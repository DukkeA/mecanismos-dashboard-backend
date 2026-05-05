-- CreateTable
CREATE TABLE "ComponentType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComponentType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComponentType_slug_key" ON "ComponentType"("slug");

-- CreateIndex
CREATE INDEX "ComponentType_isActive_idx" ON "ComponentType"("isActive");

-- CreateIndex
CREATE INDEX "ComponentType_name_idx" ON "ComponentType"("name");

-- Insert backfill type for legacy components
INSERT INTO "ComponentType" ("id", "name", "slug", "description", "isActive", "createdAt", "updatedAt")
VALUES (
  'legacy-component-type-unspecified',
  'Sin tipo',
  'sin-tipo',
  'Backfill de migracion para componentes legacy previos al catalogo normalizado.',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- AlterTable
ALTER TABLE "Component"
ADD COLUMN "componentTypeId" TEXT;

-- Backfill existing components
UPDATE "Component"
SET "componentTypeId" = 'legacy-component-type-unspecified'
WHERE "componentTypeId" IS NULL;

-- AlterTable
ALTER TABLE "Component"
ALTER COLUMN "componentTypeId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Component_componentTypeId_idx" ON "Component"("componentTypeId");

-- AddForeignKey
ALTER TABLE "Component"
ADD CONSTRAINT "Component_componentTypeId_fkey"
FOREIGN KEY ("componentTypeId") REFERENCES "ComponentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
