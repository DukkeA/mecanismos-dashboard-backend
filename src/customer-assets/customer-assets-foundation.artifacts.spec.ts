import * as fs from 'node:fs';
import * as path from 'node:path';

describe('customer assets foundation artifacts', () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const prismaSchemaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  const migrationsDir = path.join(projectRoot, 'prisma', 'migrations');

  it('adds optional notes to the Customer schema model', () => {
    const schema = fs.readFileSync(prismaSchemaPath, 'utf8');

    expect(schema).toContain('model Customer');
    expect(schema).toContain('notes          String?');
  });

  it('ships a customer-notes migration that alters the Customer table', () => {
    const migrationName = fs
      .readdirSync(migrationsDir)
      .find((entry) => /_customer_notes$/.test(entry));

    expect(migrationName).toBeDefined();

    const migrationSql = fs.readFileSync(
      path.join(migrationsDir, migrationName ?? '', 'migration.sql'),
      'utf8',
    );

    expect(migrationSql).toContain('ALTER TABLE "Customer"');
    expect(migrationSql).toContain('ADD COLUMN "notes" TEXT');
  });
});
