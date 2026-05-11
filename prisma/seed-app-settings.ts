import type { Prisma } from '../generated/prisma/client';
import {
  APP_SETTINGS_SINGLETON_ID,
  buildPricingLaborSettingsCreateDefaults,
} from '../src/app-settings/app-settings.contract';

export type AppSettingsSeedPrismaClient = {
  appSettings: {
    upsert(args: Prisma.AppSettingsUpsertArgs): Promise<unknown>;
  };
};

export async function seedPricingLaborSettings(
  prisma: AppSettingsSeedPrismaClient,
  now: Date,
) {
  const defaults = buildPricingLaborSettingsCreateDefaults(now);

  await prisma.appSettings.upsert({
    where: { id: APP_SETTINGS_SINGLETON_ID },
    create: defaults,
    update: {
      companyName: defaults.companyName,
      currencyCode: defaults.currencyCode,
      monthlyWorkingHours: defaults.monthlyWorkingHours,
      defaultLaborHourlyRate: defaults.defaultLaborHourlyRate,
      saleContingencyPct: defaults.saleContingencyPct,
      workshopContingencyPct: defaults.workshopContingencyPct,
      diagnosticContingencyPct: defaults.diagnosticContingencyPct,
      minimumMarkupPct: defaults.minimumMarkupPct,
      recommendedMarkupPct: defaults.recommendedMarkupPct,
      highMarkupPct: defaults.highMarkupPct,
      updatedAt: now,
    },
  });
}
