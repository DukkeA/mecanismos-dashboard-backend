import type { Prisma } from '../../generated/prisma/client';
import { seedPricingLaborSettings } from '../../prisma/seed-app-settings';
import { APP_SETTINGS_SINGLETON_ID } from './app-settings.contract';

type AppSettingsUpsertArgs = Prisma.AppSettingsUpsertArgs;

describe('pricing/labor settings seed', () => {
  it('upserts deterministic singleton defaults for local review flows', async () => {
    let receivedArgs: AppSettingsUpsertArgs | undefined;

    await seedPricingLaborSettings(
      {
        appSettings: {
          upsert: jest.fn((args: AppSettingsUpsertArgs) => {
            receivedArgs = args;
            return Promise.resolve(undefined);
          }),
        },
      } as never,
      new Date('2026-05-11T12:00:00.000Z'),
    );

    expect(receivedArgs).toMatchObject({
      where: { id: APP_SETTINGS_SINGLETON_ID },
      create: expect.objectContaining({
        id: APP_SETTINGS_SINGLETON_ID,
        currencyCode: 'COP',
        defaultLaborHourlyRate: 50000,
      }),
      update: expect.objectContaining({
        currencyCode: 'COP',
        defaultLaborHourlyRate: 50000,
      }),
    });
  });
});
