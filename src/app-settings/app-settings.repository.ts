import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  APP_SETTINGS_SINGLETON_ID,
  buildPricingLaborSettingsCreateDefaults,
  type PricingLaborSettings,
} from './app-settings.contract';
import type { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

export const APP_SETTINGS_PRISMA_CLIENT = Symbol('APP_SETTINGS_PRISMA_CLIENT');

type AppSettingsRecord = Prisma.AppSettingsGetPayload<object>;

type AppSettingsPrismaClient = {
  appSettings: {
    upsert(args: Prisma.AppSettingsUpsertArgs): Promise<AppSettingsRecord>;
    update(args: Prisma.AppSettingsUpdateArgs): Promise<AppSettingsRecord>;
  };
};

@Injectable()
export class AppSettingsRepository {
  constructor(
    @Inject(APP_SETTINGS_PRISMA_CLIENT)
    private readonly prisma: AppSettingsPrismaClient,
  ) {}

  async getOrCreateCurrent(): Promise<PricingLaborSettings> {
    const now = new Date();
    const record = await this.prisma.appSettings.upsert({
      where: { id: APP_SETTINGS_SINGLETON_ID },
      create: buildPricingLaborSettingsCreateDefaults(now),
      update: {
        companyName: buildPricingLaborSettingsCreateDefaults(now).companyName,
      },
    });

    return mapPricingLaborSettings(record);
  }

  async updateCurrent(
    dto: UpdatePricingLaborSettingsDto,
  ): Promise<PricingLaborSettings> {
    const record = await this.prisma.appSettings.update({
      where: { id: APP_SETTINGS_SINGLETON_ID },
      data: {
        ...(dto.currencyCode !== undefined
          ? { currencyCode: dto.currencyCode }
          : {}),
        ...(dto.monthlyWorkingHours !== undefined
          ? { monthlyWorkingHours: dto.monthlyWorkingHours }
          : {}),
        ...(dto.defaultLaborHourlyRate !== undefined
          ? { defaultLaborHourlyRate: dto.defaultLaborHourlyRate }
          : {}),
        ...(dto.saleContingencyPct !== undefined
          ? { saleContingencyPct: dto.saleContingencyPct }
          : {}),
        ...(dto.workshopContingencyPct !== undefined
          ? { workshopContingencyPct: dto.workshopContingencyPct }
          : {}),
        ...(dto.diagnosticContingencyPct !== undefined
          ? { diagnosticContingencyPct: dto.diagnosticContingencyPct }
          : {}),
        ...(dto.minimumMarkupPct !== undefined
          ? { minimumMarkupPct: dto.minimumMarkupPct }
          : {}),
        ...(dto.recommendedMarkupPct !== undefined
          ? { recommendedMarkupPct: dto.recommendedMarkupPct }
          : {}),
        ...(dto.highMarkupPct !== undefined
          ? { highMarkupPct: dto.highMarkupPct }
          : {}),
        updatedAt: new Date(),
      },
    });

    return mapPricingLaborSettings(record);
  }
}

function mapPricingLaborSettings(
  record: AppSettingsRecord,
): PricingLaborSettings {
  return {
    companyName: record.companyName,
    currencyCode: record.currencyCode,
    monthlyWorkingHours: record.monthlyWorkingHours,
    defaultLaborHourlyRate: record.defaultLaborHourlyRate,
    saleContingencyPct: record.saleContingencyPct,
    workshopContingencyPct: record.workshopContingencyPct,
    diagnosticContingencyPct: record.diagnosticContingencyPct,
    minimumMarkupPct: record.minimumMarkupPct,
    recommendedMarkupPct: record.recommendedMarkupPct,
    highMarkupPct: record.highMarkupPct,
    updatedAt: record.updatedAt,
  };
}
