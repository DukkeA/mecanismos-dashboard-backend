import * as fs from 'node:fs';
import * as path from 'node:path';
import type {
  Prisma,
  SupplierDocumentType,
  SupplierType,
} from '../../generated/prisma/client';

describe('supplier management foundation artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const prismaSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  const migrationsDir = path.join(projectRoot, 'prisma', 'migrations');
  const prismaSeedPath = path.join(projectRoot, 'prisma', 'seed.ts');

  it('reshapes the Supplier schema into an aggregate with phones and identity metadata', () => {
    const schema = fs.readFileSync(prismaSchemaPath, 'utf8');
    const supplierBlock = sliceBlock(schema, 'Supplier');
    const supplierPhoneBlock = sliceBlock(schema, 'SupplierPhone');

    expect(schema).toContain('enum SupplierType {');
    expect(schema).toContain('enum SupplierDocumentType {');
    expect(supplierBlock).toContain('model Supplier {');
    expect(supplierBlock).toContain('type                  SupplierType');
    expect(supplierBlock).toContain('contactName           String?');
    expect(supplierBlock).toContain(
      'documentType          SupplierDocumentType?',
    );
    expect(supplierBlock).toContain('documentNumber        String?');
    expect(supplierBlock).toContain('notes                 String?');
    expect(supplierBlock).toContain('phones                SupplierPhone[]');
    expect(supplierBlock).not.toContain('@unique');
    expect(supplierBlock).not.toContain('phone                 String?');
    expect(supplierPhoneBlock).toContain('model SupplierPhone {');
    expect(supplierPhoneBlock).toContain('supplierId  String');
    expect(supplierPhoneBlock).toContain('phone       String');
    expect(supplierPhoneBlock).toContain('label       String?');
    expect(supplierPhoneBlock).toContain('isPrimary   Boolean');
    expect(supplierPhoneBlock).toContain('hasWhatsapp Boolean');
    expect(supplierPhoneBlock).toContain('notes       String?');
  });

  it('ships a supplier reshape migration that backfills legacy phone data before dropping the old column', () => {
    const migrationName = fs
      .readdirSync(migrationsDir)
      .find((entry) => /_supplier_management$/.test(entry));

    expect(migrationName).toBeDefined();

    const migrationSql = fs.readFileSync(
      path.join(migrationsDir, migrationName ?? '', 'migration.sql'),
      'utf8',
    );

    expect(migrationSql).toContain('CREATE TYPE "SupplierType" AS ENUM');
    expect(migrationSql).toContain(
      'CREATE TYPE "SupplierDocumentType" AS ENUM',
    );
    expect(migrationSql).toContain('CREATE TABLE "SupplierPhone"');
    expect(migrationSql).toContain('INSERT INTO "SupplierPhone"');
    expect(migrationSql).toContain('WHERE');
    expect(migrationSql).toContain(`TRIM("phone") <> ''`);
    expect(migrationSql).toContain('DROP INDEX "Supplier_name_key"');
    expect(migrationSql).toContain('ALTER TABLE "Supplier"');
    expect(migrationSql).toContain('DROP COLUMN "phone"');
  });

  it('defines idempotent supplier seed fixtures with duplicate names and multiple phones', () => {
    const seedSource = fs.readFileSync(prismaSeedPath, 'utf8');

    expect(seedSource).toContain('const SEED_SUPPLIERS = [');
    expect(seedSource).toContain("name: 'Repuestos Central'");
    expect(seedSource).toContain('documentType: SupplierDocumentType.NIT');
    expect(seedSource).toContain('documentType: SupplierDocumentType.CEDULA');
    expect(seedSource).toContain('phones: [');
    expect(seedSource).toContain('isPrimary: true');
    expect(seedSource).toContain('hasWhatsapp: true');
  });

  it('matches supplier seed payloads against the generated Prisma aggregate types', () => {
    const supplierSeed = {
      id: 'seed-supplier-repuestos-central-main',
      name: 'Repuestos Central',
      type: 'COMPANY' as SupplierType,
      contactName: 'Laura Perez',
      documentType: 'NIT' as SupplierDocumentType,
      documentNumber: '900555111',
      email: 'compras@repuestos-central.test',
      notes: 'Proveedor de repuestos con líneas móviles para WhatsApp.',
      isActive: true,
      updatedAt: new Date('2026-05-05T17:00:00.000Z'),
      phones: {
        create: [
          {
            id: 'seed-supplier-repuestos-central-main-phone-principal',
            label: 'Principal',
            phone: '3001112233',
            isPrimary: true,
            hasWhatsapp: true,
            notes: 'Canal comercial',
            updatedAt: new Date('2026-05-05T17:00:00.000Z'),
          },
          {
            id: 'seed-supplier-repuestos-central-main-phone-bodega',
            label: 'Bodega',
            phone: '6015550101',
            isPrimary: false,
            hasWhatsapp: false,
            updatedAt: new Date('2026-05-05T17:00:00.000Z'),
          },
        ],
      },
    } satisfies Prisma.SupplierCreateInput;

    expect(supplierSeed.phones.create).toHaveLength(2);
    expect(supplierSeed.phones.create[0]).toMatchObject({
      isPrimary: true,
      hasWhatsapp: true,
    });
    expect(supplierSeed.type).toBe('COMPANY');
  });
});

function sliceBlock(schema: string, modelName: string) {
  const matcher = new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`);

  return schema.match(matcher)?.[0] ?? '';
}
