CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_normalizedName_key" ON "Brand"("normalizedName");
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");
CREATE INDEX "Brand_name_idx" ON "Brand"("name");

ALTER TABLE "Vehicle" ADD COLUMN "brandId" TEXT;
ALTER TABLE "Component" ADD COLUMN "brandId" TEXT;

INSERT INTO "Brand" ("id", "name", "normalizedName", "isActive", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    MIN(TRIM("brand")) AS "name",
    LOWER(REGEXP_REPLACE(TRIM("brand"), '\\s+', ' ', 'g')) AS "normalizedName",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT "brand" FROM "Vehicle" WHERE TRIM("brand") <> ''
    UNION ALL
    SELECT "brand" FROM "Component" WHERE TRIM("brand") <> ''
) AS asset_brands
GROUP BY LOWER(REGEXP_REPLACE(TRIM("brand"), '\\s+', ' ', 'g'))
ON CONFLICT ("normalizedName") DO NOTHING;

UPDATE "Vehicle"
SET "brandId" = "Brand"."id"
FROM "Brand"
WHERE "Brand"."normalizedName" = LOWER(REGEXP_REPLACE(TRIM("Vehicle"."brand"), '\\s+', ' ', 'g'));

UPDATE "Component"
SET "brandId" = "Brand"."id"
FROM "Brand"
WHERE "Brand"."normalizedName" = LOWER(REGEXP_REPLACE(TRIM("Component"."brand"), '\\s+', ' ', 'g'));

CREATE INDEX "Vehicle_brandId_idx" ON "Vehicle"("brandId");
CREATE INDEX "Component_brandId_idx" ON "Component"("brandId");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Component" ADD CONSTRAINT "Component_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
