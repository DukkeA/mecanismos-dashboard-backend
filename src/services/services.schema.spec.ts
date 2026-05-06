import * as fs from 'node:fs';
import * as path from 'node:path';

describe('service catalog schema and seed artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  const seedPath = path.join(projectRoot, 'prisma', 'seed.ts');
  const businessBaselineMigrationPath = path.join(
    projectRoot,
    'prisma',
    'migrations',
    '20260504065151_add_business_domain',
    'migration.sql',
  );
  const serviceCatalogMigrationPath = path.join(
    projectRoot,
    'prisma',
    'migrations',
    '20260506090000_service_catalog_management',
    'migration.sql',
  );

  it('defines ServiceCatalog slug uniqueness and lookup indexes in schema.prisma', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toContain('model ServiceCatalog');
    expect(schema).toContain(
      'slug                  String                  @unique',
    );
    expect(schema).toContain('@@index([name])');
    expect(schema).toContain('@@index([isActive])');
    expect(schema).not.toContain(
      'name                  String                  @unique',
    );
  });

  it('ships a dev-oriented migration that keeps slug uniqueness in the database without SQL slug drift', () => {
    const migration = fs.readFileSync(serviceCatalogMigrationPath, 'utf8');

    expect(migration).toContain(
      'ALTER TABLE "ServiceCatalog" ADD COLUMN "slug" TEXT',
    );
    expect(migration).toContain(
      'ALTER TABLE "ServiceCatalog" ALTER COLUMN "slug" SET NOT NULL',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "ServiceCatalog_slug_key"',
    );
    expect(migration).toContain('DROP INDEX "ServiceCatalog_name_key"');
    expect(migration).toContain(
      'CREATE INDEX "ServiceCatalog_name_idx" ON "ServiceCatalog"("name")',
    );
    expect(migration).toContain(
      'CREATE INDEX "ServiceCatalog_isActive_idx" ON "ServiceCatalog"("isActive")',
    );
    expect(migration).not.toContain('normalize_service_catalog_slug');
    expect(migration).not.toContain('translate(');
    expect(migration).not.toContain('duplicate canonical service names');
    expect(migration).not.toContain('WHERE "slug" IS NULL');
  });

  it('seeds representative services idempotently by slug', () => {
    const seed = fs.readFileSync(seedPath, 'utf8');

    expect(seed).toContain('const SEED_SERVICES = [');
    expect(seed).toContain("slug: 'diagnostico'");
    expect(seed).toContain("slug: 'reparacion'");
    expect(seed).toContain("slug: 'calibracion'");
    expect(seed).toContain("slug: 'instalacion'");
    expect(seed).toContain('where: { slug: seedService.slug }');
  });

  it('keeps the existing ServiceCatalog table and foreign keys untouched while adding slug structure', () => {
    const baselineMigration = fs.readFileSync(
      businessBaselineMigrationPath,
      'utf8',
    );
    const serviceCatalogMigration = fs.readFileSync(
      serviceCatalogMigrationPath,
      'utf8',
    );

    expect(baselineMigration).toContain(
      'CONSTRAINT "WorkOrderEstimateLine_serviceCatalogId_fkey" FOREIGN KEY ("serviceCatalogId") REFERENCES "ServiceCatalog"("id")',
    );

    expect(serviceCatalogMigration).not.toContain(
      'CREATE TABLE "ServiceCatalog"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'DROP TABLE "ServiceCatalog"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'ALTER TABLE "ServiceCatalog" DROP COLUMN "id"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'ALTER TABLE "ServiceCatalog" ALTER COLUMN "id"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'UPDATE "ServiceCatalog"\nSET "id"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'ALTER TABLE "WorkOrderEstimateLine"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'UPDATE "WorkOrderEstimateLine"\nSET "serviceCatalogId"',
    );
    expect(serviceCatalogMigration).not.toContain(
      'DROP CONSTRAINT "WorkOrderEstimateLine_serviceCatalogId_fkey"',
    );
  });
});
