import { seedPricingLaborSettings } from '../../prisma/seed-app-settings';
import { APP_SETTINGS_SINGLETON_ID } from './app-settings.contract';

describe('pricing/labor settings seed', () => {
  it('upserts deterministic singleton defaults for local review flows', async () => {
    const upsert = jest.fn(() => Promise.resolve(undefined));

    await seedPricingLaborSettings(
      {
        appSettings: {
          upsert,
        },
      },
      new Date('2026-05-11T12:00:00.000Z'),
    );

    const createSettingsMatcher: unknown = expect.objectContaining({
      id: APP_SETTINGS_SINGLETON_ID,
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });
    const updateSettingsMatcher: unknown = expect.objectContaining({
      currencyCode: 'COP',
      defaultLaborHourlyRate: 50000,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: APP_SETTINGS_SINGLETON_ID },
        create: createSettingsMatcher,
        update: updateSettingsMatcher,
      }),
    );
  });
});
