import { AppSettingsRepository } from './app-settings.repository';
import { APP_SETTINGS_SINGLETON_ID } from './app-settings.contract';

describe('AppSettingsRepository', () => {
  it('upserts deterministic defaults for the singleton settings row', async () => {
    const upsert = jest.fn(() =>
      Promise.resolve({
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
      }),
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
    const update = jest.fn(() =>
      Promise.resolve({
        id: APP_SETTINGS_SINGLETON_ID,
        companyName: 'Mecanismos Tecnicos',
        currencyCode: 'USD',
        monthlyWorkingHours: 200,
        defaultLaborHourlyRate: 65000,
        saleContingencyPct: 5,
        workshopContingencyPct: 10,
        diagnosticContingencyPct: 20,
        minimumMarkupPct: 20,
        recommendedMarkupPct: 35,
        highMarkupPct: 50,
        createdAt: new Date('2026-05-11T10:00:00.000Z'),
        updatedAt: new Date('2026-05-11T11:00:00.000Z'),
      }),
    );

    const repository = new AppSettingsRepository({
      appSettings: {
        upsert: jest.fn(),
        update,
      },
    });

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
    const findUniqueOrThrow = jest.fn().mockResolvedValue({
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
    });
    const update = jest.fn().mockResolvedValue({
      id: APP_SETTINGS_SINGLETON_ID,
      companyName: 'Mecanismos Tecnicos',
      currencyCode: 'USD',
      monthlyWorkingHours: 176,
      defaultLaborHourlyRate: 65000,
      saleContingencyPct: 5,
      workshopContingencyPct: 10,
      diagnosticContingencyPct: 20,
      minimumMarkupPct: 20,
      recommendedMarkupPct: 35,
      highMarkupPct: 50,
      createdAt: new Date('2026-05-11T10:00:00.000Z'),
      updatedAt: new Date('2026-05-11T11:00:00.000Z'),
    });
    const create = jest.fn().mockResolvedValue({ id: 'audit-1' });
    const transactionClient = {
      appSettings: { findUniqueOrThrow, update },
      appSettingsAuditHistory: { create },
    };
    const transaction = jest.fn((callback: (tx: typeof transactionClient) => unknown) =>
      Promise.resolve(callback(transactionClient)),
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
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APP_SETTINGS_SINGLETON_ID },
        data: expect.objectContaining({
          currencyCode: 'USD',
          defaultLaborHourlyRate: 65000,
        }),
      }),
    );
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
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
      }),
    });
  });

  it('reads paginated pricing/labor audit history with newest-first typed rows', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'audit-2',
        actorUserId: 'seed-user-admin',
        changedFields: ['currencyCode'],
        beforeValues: { currencyCode: 'COP' },
        afterValues: { currencyCode: 'USD' },
        createdAt: new Date('2026-05-11T11:00:00.000Z'),
      },
    ]);
    const count = jest.fn().mockResolvedValue(1);

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

    expect(findMany).toHaveBeenCalledWith({
      where: { appSettingsId: APP_SETTINGS_SINGLETON_ID },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 5,
      take: 5,
      select: expect.objectContaining({
        id: true,
        actorUserId: true,
        changedFields: true,
        beforeValues: true,
        afterValues: true,
        createdAt: true,
      }),
    });
    expect(count).toHaveBeenCalledWith({
      where: { appSettingsId: APP_SETTINGS_SINGLETON_ID },
    });
  });
});
