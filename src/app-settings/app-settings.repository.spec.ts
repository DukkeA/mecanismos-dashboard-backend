import type { Prisma } from '../../generated/prisma/client';
import { AppSettingsRepository } from './app-settings.repository';
import { APP_SETTINGS_SINGLETON_ID } from './app-settings.contract';

type AppSettingsRecord = Prisma.AppSettingsGetPayload<object>;
type AuditHistorySelect = {
  id: true;
  actorUserId: true;
  changedFields: true;
  beforeValues: true;
  afterValues: true;
  createdAt: true;
};
type AppSettingsAuditHistoryRecord = Prisma.AppSettingsAuditHistoryGetPayload<{
  select: AuditHistorySelect;
}>;

type AppSettingsTransactionClient = {
  appSettings: {
    findUniqueOrThrow(
      args: Prisma.AppSettingsFindUniqueOrThrowArgs,
    ): Promise<AppSettingsRecord>;
    update(args: Prisma.AppSettingsUpdateArgs): Promise<AppSettingsRecord>;
  };
  appSettingsAuditHistory: {
    create(
      args: Prisma.AppSettingsAuditHistoryCreateArgs,
    ): Promise<{ id: string }>;
  };
};

function createCurrentSettingsRecord(
  overrides: Partial<AppSettingsRecord> = {},
): AppSettingsRecord {
  return {
    id: APP_SETTINGS_SINGLETON_ID,
    companyName: 'Mecanismos Tecnicos',
    currencyCode: 'COP',
    monthlyWorkingHours: 176,
    defaultLaborHourlyRate: 50000,
    saleContingencyPct: 5,
    workshopContingencyPct: 10,
    diagnosticContingencyPct: 20,
    minimumMarkupPct: 20,
    recommendedMarkupPct: 35,
    highMarkupPct: 50,
    createdAt: new Date('2026-05-11T10:00:00.000Z'),
    updatedAt: new Date('2026-05-11T10:00:00.000Z'),
    ...overrides,
  };
}

describe('AppSettingsRepository', () => {
  it('upserts deterministic defaults for the singleton settings row', async () => {
    const upsert = jest.fn(() =>
      Promise.resolve(createCurrentSettingsRecord()),
    );

    const repository = new AppSettingsRepository({
      appSettings: {
        upsert,
      },
    } as never);

    await expect(repository.getOrCreateCurrent()).resolves.toMatchObject({
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });

    const createDefaultsMatcher: unknown = expect.objectContaining({
      id: APP_SETTINGS_SINGLETON_ID,
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });
    const updateDefaultsMatcher: unknown = expect.objectContaining({
      companyName: 'Mecanismos Tecnicos',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APP_SETTINGS_SINGLETON_ID },
        create: createDefaultsMatcher,
        update: updateDefaultsMatcher,
      }),
    );
  });

  it('updates only provided singleton fields and returns the persisted shape', async () => {
    const update = jest.fn(
      (args: Prisma.AppSettingsUpdateArgs): Promise<AppSettingsRecord> => {
        void args;

        return Promise.resolve(
          createCurrentSettingsRecord({
            currencyCode: 'USD',
            monthlyWorkingHours: 200,
            defaultLaborHourlyRate: 65000,
            updatedAt: new Date('2026-05-11T11:00:00.000Z'),
          }),
        );
      },
    );

    const repository = new AppSettingsRepository({
      appSettings: {
        upsert: jest.fn(),
        update,
        findUniqueOrThrow: jest.fn(),
      },
      appSettingsAuditHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    } as never);

    await expect(
      repository.updateCurrent({
        currencyCode: 'USD',
        monthlyWorkingHours: 200,
        defaultLaborHourlyRate: 65000,
      }),
    ).resolves.toMatchObject({
      currencyCode: 'USD',
      monthlyWorkingHours: 200,
      defaultLaborHourlyRate: 65000,
    });

    const updateMatcher: unknown = expect.objectContaining({
      currencyCode: 'USD',
      monthlyWorkingHours: 200,
      defaultLaborHourlyRate: 65000,
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APP_SETTINGS_SINGLETON_ID },
        data: updateMatcher,
      }),
    );
  });

  it('updates current settings and appends one audit row inside the same transaction', async () => {
    const findUniqueOrThrow = jest.fn(
      (
        args: Prisma.AppSettingsFindUniqueOrThrowArgs,
      ): Promise<AppSettingsRecord> => {
        void args;
        return Promise.resolve(createCurrentSettingsRecord());
      },
    );
    const update = jest.fn(
      (args: Prisma.AppSettingsUpdateArgs): Promise<AppSettingsRecord> => {
        void args;

        return Promise.resolve(
          createCurrentSettingsRecord({
            currencyCode: 'USD',
            defaultLaborHourlyRate: 65000,
            updatedAt: new Date('2026-05-11T11:00:00.000Z'),
          }),
        );
      },
    );
    const create = jest.fn(
      (
        args: Prisma.AppSettingsAuditHistoryCreateArgs,
      ): Promise<{ id: string }> => {
        void args;
        return Promise.resolve({ id: 'audit-1' });
      },
    );
    const transactionClient = {
      appSettings: { findUniqueOrThrow, update },
      appSettingsAuditHistory: { create },
    } satisfies AppSettingsTransactionClient;
    const transaction = jest.fn(
      (
        callback: (tx: typeof transactionClient) => Promise<AppSettingsRecord>,
      ) => callback(transactionClient),
    );

    const repository = new AppSettingsRepository({
      $transaction: transaction,
      appSettings: {
        upsert: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      appSettingsAuditHistory: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    } as never);

    await expect(
      repository.updateCurrentWithAudit({
        actorUserId: 'seed-user-admin',
        dto: {
          currencyCode: 'USD',
          defaultLaborHourlyRate: 65000,
        },
        changedFields: ['currencyCode', 'defaultLaborHourlyRate'],
        beforeValues: {
          currencyCode: 'COP',
          defaultLaborHourlyRate: 50000,
        },
        afterValues: {
          currencyCode: 'USD',
          defaultLaborHourlyRate: 65000,
        },
      }),
    ).resolves.toMatchObject({
      currencyCode: 'USD',
      defaultLaborHourlyRate: 65000,
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: APP_SETTINGS_SINGLETON_ID },
    });

    const updateArgs = update.mock.calls[0]?.[0];
    const createArgs = create.mock.calls[0]?.[0];

    expect(updateArgs?.where).toEqual({ id: APP_SETTINGS_SINGLETON_ID });
    expect(updateArgs?.data).toMatchObject({
      currencyCode: 'USD',
      defaultLaborHourlyRate: 65000,
    });
    expect(createArgs?.data).toMatchObject({
      appSettingsId: APP_SETTINGS_SINGLETON_ID,
      actorUserId: 'seed-user-admin',
      changedFields: ['currencyCode', 'defaultLaborHourlyRate'],
      beforeValues: {
        currencyCode: 'COP',
        defaultLaborHourlyRate: 50000,
      },
      afterValues: {
        currencyCode: 'USD',
        defaultLaborHourlyRate: 65000,
      },
    });
  });

  it('preserves current singleton values when audit persistence fails inside the transaction', async () => {
    const persistedCurrent = createCurrentSettingsRecord();
    const auditFailure = new Error('audit write failed');

    const transaction = jest.fn(
      async (
        callback: (
          tx: AppSettingsTransactionClient,
        ) => Promise<AppSettingsRecord>,
      ): Promise<AppSettingsRecord> => {
        const workingCopy = { ...persistedCurrent };

        const result = await callback({
          appSettings: {
            findUniqueOrThrow: jest.fn(
              (
                args: Prisma.AppSettingsFindUniqueOrThrowArgs,
              ): Promise<AppSettingsRecord> => {
                void args;
                return Promise.resolve({ ...workingCopy });
              },
            ),
            update: jest.fn(
              ({
                data,
              }: Prisma.AppSettingsUpdateArgs): Promise<AppSettingsRecord> => {
                Object.assign(workingCopy, data, {
                  updatedAt: new Date('2026-05-11T11:00:00.000Z'),
                });

                return Promise.resolve({ ...workingCopy });
              },
            ),
          },
          appSettingsAuditHistory: {
            create: jest.fn(
              (args: Prisma.AppSettingsAuditHistoryCreateArgs) => {
                void args;
                return Promise.reject<{ id: string }>(auditFailure);
              },
            ),
          },
        });

        Object.assign(persistedCurrent, result);

        return result;
      },
    );

    const repository = new AppSettingsRepository({
      $transaction: transaction,
      appSettings: {
        upsert: jest.fn(() => Promise.resolve({ ...persistedCurrent })),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      appSettingsAuditHistory: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    } as never);

    await expect(
      repository.updateCurrentWithAudit({
        actorUserId: 'seed-user-admin',
        dto: {
          currencyCode: 'USD',
          defaultLaborHourlyRate: 65000,
        },
        changedFields: ['currencyCode', 'defaultLaborHourlyRate'],
        beforeValues: {
          currencyCode: 'COP',
          defaultLaborHourlyRate: 50000,
        },
        afterValues: {
          currencyCode: 'USD',
          defaultLaborHourlyRate: 65000,
        },
      }),
    ).rejects.toThrow(auditFailure);

    expect(persistedCurrent.currencyCode).toBe('COP');
    expect(persistedCurrent.defaultLaborHourlyRate).toBe(50000);
    await expect(repository.getOrCreateCurrent()).resolves.toMatchObject({
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });
  });

  it('reads paginated pricing/labor audit history with newest-first typed rows', async () => {
    const findMany = jest.fn(
      (
        args: Prisma.AppSettingsAuditHistoryFindManyArgs,
      ): Promise<AppSettingsAuditHistoryRecord[]> => {
        void args;

        return Promise.resolve([
          {
            id: 'audit-2',
            actorUserId: 'seed-user-admin',
            changedFields: ['currencyCode'],
            beforeValues: { currencyCode: 'COP' },
            afterValues: { currencyCode: 'USD' },
            createdAt: new Date('2026-05-11T11:00:00.000Z'),
          },
        ]);
      },
    );
    const count = jest.fn(
      (args: Prisma.AppSettingsAuditHistoryCountArgs): Promise<number> => {
        void args;
        return Promise.resolve(1);
      },
    );

    const repository = new AppSettingsRepository({
      $transaction: jest.fn(),
      appSettings: {
        upsert: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      appSettingsAuditHistory: {
        create: jest.fn(),
        findMany,
        count,
      },
    } as never);

    await expect(
      repository.findPricingLaborHistory({ page: 2, limit: 5 }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'audit-2',
        actorUserId: 'seed-user-admin',
        changedFields: ['currencyCode'],
      }),
    ]);
    await expect(repository.countPricingLaborHistory()).resolves.toBe(1);

    const findManyArgs = findMany.mock.calls[0]?.[0];

    expect(findManyArgs?.where).toEqual({
      appSettingsId: APP_SETTINGS_SINGLETON_ID,
    });
    expect(findManyArgs?.orderBy).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
    expect(findManyArgs?.skip).toBe(5);
    expect(findManyArgs?.take).toBe(5);
    expect(findManyArgs?.select).toMatchObject({
      id: true,
      actorUserId: true,
      changedFields: true,
      beforeValues: true,
      afterValues: true,
      createdAt: true,
    });
    expect(count).toHaveBeenCalledWith({
      where: { appSettingsId: APP_SETTINGS_SINGLETON_ID },
    });
  });
});
