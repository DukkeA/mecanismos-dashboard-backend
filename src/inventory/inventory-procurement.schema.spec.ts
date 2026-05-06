import * as fs from 'node:fs';
import * as path from 'node:path';

describe('inventory procurement schema artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  const seedPath = path.join(projectRoot, 'prisma', 'seed.ts');
  const migrationPath = path.join(
    projectRoot,
    'prisma',
    'migrations',
    '20260506120000_inventory_procurement_foundation',
    'migration.sql',
  );

  it('defines inventory lookup indexes, quote audit fields, and future quote linkage columns', () => {
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(schema).toContain('model InventoryItem');
    expect(schema).toContain('@@index([isActive])');
    expect(schema).toContain('@@index([itemType])');
    expect(schema).toContain('@@index([condition])');
    expect(schema).toContain('@@index([name])');
    expect(schema).toContain('enum SupplierQuoteStatus');
    expect(schema).toContain(
      'status                    SupplierQuoteStatus     @default(ACTIVE)',
    );
    expect(schema).toContain('voidedAt                  DateTime?');
    expect(schema).toContain('voidReason                String?');
    expect(schema).toContain('correctionReason          String?');
    expect(schema).toContain('supplierQuoteHistoryId String?');
  });

  it('ships a forward-only migration that adds quote lifecycle structure without table drops', () => {
    const migration = fs.readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('CREATE TYPE "SupplierQuoteStatus" AS ENUM');
    expect(migration).toContain(
      'ALTER TYPE "InventoryItemType" ADD VALUE IF NOT EXISTS',
    );
    expect(migration).toContain('ALTER TABLE "SupplierQuoteHistory"');
    expect(migration).toContain('ADD COLUMN "status" "SupplierQuoteStatus"');
    expect(migration).toContain('ALTER TABLE "WorkOrderEstimateLine"');
    expect(migration).toContain('ADD COLUMN "supplierQuoteHistoryId" TEXT');
    expect(migration).toContain('ALTER TABLE "WorkOrderActualCost"');
    expect(migration).toContain('CREATE INDEX "InventoryItem_name_idx"');
    expect(migration).not.toContain('DROP TABLE');
  });

  it('seeds representative items, movements, and quote history idempotently', () => {
    const seed = fs.readFileSync(seedPath, 'utf8');

    expect(seed).toContain('const SEED_INVENTORY_ITEMS = [');
    expect(seed).toContain('const SEED_INVENTORY_MOVEMENTS = [');
    expect(seed).toContain('const SEED_SUPPLIER_QUOTES = [');
    expect(seed).toContain('seed-inventory-item-bosch-inyector');
    expect(seed).toContain('seed-inventory-item-cotizable-tobera');
    expect(seed).toContain('seed-supplier-quote-bosch-central-v2');
  });
});
