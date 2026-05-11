import type { Prisma } from '../../generated/prisma/client';
import { AppSettingsRepository } from './app-settings.repository';
import { APP_SETTINGS_SINGLETON_ID } from './app-settings.contract';

type AppSettingsUpsertArgs = Prisma.AppSettingsUpsertArgs;
type AppSettingsUpdateArgs = Prisma.AppSettingsUpdateArgs;

describe('AppSettingsRepository', () => {
  it('upserts deterministic defaults for the singleton settings row', async () => {
    let receivedUpsertArgs: AppSettingsUpsertArgs | undefined;

    const repository = new AppSettingsRepository({
      appSettings: {
        upsert: jest.fn((args: AppSettingsUpsertArgs) => {
          receivedUpsertArgs = args;
          return Promise.resolve({
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
        }),
      },
    } as never);

    await expect(repository.getOrCreateCurrent()).resolves.toMatchObject({
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });

    expect(receivedUpsertArgs).toMatchObject({
      where: { id: APP_SETTINGS_SINGLETON_ID },
      create: expect.objectContaining({
        id: APP_SETTINGS_SINGLETON_ID,
        currencyCode: 'COP',
        defaultLaborHourlyRate: 50000,
      }),
      update: expect.objectContaining({
        companyName: 'Mecanismos Tecnicos',
      }),
    });
  });

  it('updates only provided singleton fields and returns the persisted shape', async () => {
    let receivedUpdateArgs: AppSettingsUpdateArgs | undefined;

    const repository = new AppSettingsRepository({
      appSettings: {
        upsert: jest.fn(),
        update: jest.fn((args: AppSettingsUpdateArgs) => {
          receivedUpdateArgs = args;
          return Promise.resolve({
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
          });
        }),
      },
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

    expect(receivedUpdateArgs).toMatchObject({
      where: { id: APP_SETTINGS_SINGLETON_ID },
      data: {
        currencyCode: 'USD',
        monthlyWorkingHours: 200,
        defaultLaborHourlyRate: 65000,
      },
    });
  });
});
