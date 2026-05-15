import { readFileSync } from 'fs';
import { join } from 'path';
import { assertLifecycleMigrationContract } from './entity-lifecycle-migration-contract';

describe('entity lifecycle migration contract', () => {
  it('adds active defaults, backfills existing rows, and enforces not-null lifecycle columns', () => {
    const migrationSql = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        'prisma',
        'migrations',
        '20260515031500_add_customer_asset_is_active',
        'migration.sql',
      ),
      'utf8',
    );

    expect(assertLifecycleMigrationContract(migrationSql)).toEqual({
      Customer: {
        addDefaultBeforeBackfill: true,
        backfillBeforeNotNull: true,
        defaultValue: true,
      },
      Vehicle: {
        addDefaultBeforeBackfill: true,
        backfillBeforeNotNull: true,
        defaultValue: true,
      },
      Component: {
        addDefaultBeforeBackfill: true,
        backfillBeforeNotNull: true,
        defaultValue: true,
      },
    });
  });
});
