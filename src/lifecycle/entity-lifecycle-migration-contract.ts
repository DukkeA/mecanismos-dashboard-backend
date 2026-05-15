type LifecycleTable = 'Customer' | 'Vehicle' | 'Component';

type LifecycleMigrationTableContract = {
  addDefaultBeforeBackfill: boolean;
  backfillBeforeNotNull: boolean;
  defaultValue: true;
};

type LifecycleMigrationContract = Record<
  LifecycleTable,
  LifecycleMigrationTableContract
>;

const lifecycleTables: LifecycleTable[] = ['Customer', 'Vehicle', 'Component'];

export function assertLifecycleMigrationContract(
  migrationSql: string,
): LifecycleMigrationContract {
  return lifecycleTables.reduce((contract, table) => {
    const addDefaultIndex = migrationSql.indexOf(
      `ALTER TABLE "${table}" ADD COLUMN "isActive" BOOLEAN DEFAULT true`,
    );
    const backfillIndex = migrationSql.indexOf(
      `UPDATE "${table}" SET "isActive" = true WHERE "isActive" IS NULL`,
    );
    const notNullIndex = migrationSql.indexOf(
      `ALTER TABLE "${table}" ALTER COLUMN "isActive" SET NOT NULL`,
    );

    contract[table] = {
      addDefaultBeforeBackfill:
        addDefaultIndex >= 0 &&
        backfillIndex >= 0 &&
        addDefaultIndex < backfillIndex,
      backfillBeforeNotNull:
        backfillIndex >= 0 && notNullIndex >= 0 && backfillIndex < notNullIndex,
      defaultValue: true,
    };

    return contract;
  }, {} as LifecycleMigrationContract);
}
