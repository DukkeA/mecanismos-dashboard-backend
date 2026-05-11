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
});
