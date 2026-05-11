import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  APP_SETTINGS_SINGLETON_ID,
  asPricingLaborAuditJson,
  buildPricingLaborSettingsCreateDefaults,
  type PricingLaborAuditEntry,
  type PricingLaborAuditValueMap,
  type PricingLaborSettings,
} from './app-settings.contract';
import type { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

export const APP_SETTINGS_PRISMA_CLIENT = Symbol('APP_SETTINGS_PRISMA_CLIENT');

type AppSettingsRecord = Prisma.AppSettingsGetPayload<object>;
type AppSettingsAuditHistoryRecord = Prisma.AppSettingsAuditHistoryGetPayload<{
  select: typeof pricingLaborAuditHistorySelect;
}>;

const pricingLaborAuditHistorySelect = {
  id: true,
  actorUserId: true,
  changedFields: true,
  beforeValues: true,
  afterValues: true,
  createdAt: true,
} satisfies Prisma.AppSettingsAuditHistorySelect;

type AppSettingsPrismaClient = {
  $transaction<T>(
    callback: (tx: AppSettingsTransactionClient) => Promise<T>,
  ): Promise<T>;
  appSettings: {
    upsert(args: Prisma.AppSettingsUpsertArgs): Promise<AppSettingsRecord>;
    update(args: Prisma.AppSettingsUpdateArgs): Promise<AppSettingsRecord>;
    findUniqueOrThrow(
      args: Prisma.AppSettingsFindUniqueOrThrowArgs,
    ): Promise<AppSettingsRecord>;
  };
  appSettingsAuditHistory: {
    create(args: Prisma.AppSettingsAuditHistoryCreateArgs): Promise<unknown>;
    findMany(
      args: Prisma.AppSettingsAuditHistoryFindManyArgs,
    ): Promise<AppSettingsAuditHistoryRecord[]>;
    count(args: Prisma.AppSettingsAuditHistoryCountArgs): Promise<number>;
  };
};

type AppSettingsTransactionClient = Pick<
  AppSettingsPrismaClient,
  'appSettings' | 'appSettingsAuditHistory'
>;

type UpdateCurrentWithAuditInput = {
  actorUserId: string;
  dto: UpdatePricingLaborSettingsDto;
  changedFields: PricingLaborAuditEntry['changedFields'];
  beforeValues: PricingLaborAuditEntry['beforeValues'];
  afterValues: PricingLaborAuditEntry['afterValues'];
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

  async updateCurrentWithAudit(
    input: UpdateCurrentWithAuditInput,
  ): Promise<PricingLaborSettings> {
    return this.prisma.$transaction(async (tx) => {
      await tx.appSettings.findUniqueOrThrow({
        where: { id: APP_SETTINGS_SINGLETON_ID },
      });

      const record = await tx.appSettings.update({
        where: { id: APP_SETTINGS_SINGLETON_ID },
        data: {
          ...(input.dto.currencyCode !== undefined
            ? { currencyCode: input.dto.currencyCode }
            : {}),
          ...(input.dto.monthlyWorkingHours !== undefined
            ? { monthlyWorkingHours: input.dto.monthlyWorkingHours }
            : {}),
          ...(input.dto.defaultLaborHourlyRate !== undefined
            ? { defaultLaborHourlyRate: input.dto.defaultLaborHourlyRate }
            : {}),
          ...(input.dto.saleContingencyPct !== undefined
            ? { saleContingencyPct: input.dto.saleContingencyPct }
            : {}),
          ...(input.dto.workshopContingencyPct !== undefined
            ? { workshopContingencyPct: input.dto.workshopContingencyPct }
            : {}),
          ...(input.dto.diagnosticContingencyPct !== undefined
            ? { diagnosticContingencyPct: input.dto.diagnosticContingencyPct }
            : {}),
          ...(input.dto.minimumMarkupPct !== undefined
            ? { minimumMarkupPct: input.dto.minimumMarkupPct }
            : {}),
          ...(input.dto.recommendedMarkupPct !== undefined
            ? { recommendedMarkupPct: input.dto.recommendedMarkupPct }
            : {}),
          ...(input.dto.highMarkupPct !== undefined
            ? { highMarkupPct: input.dto.highMarkupPct }
            : {}),
          updatedAt: new Date(),
        },
      });

      await tx.appSettingsAuditHistory.create({
        data: {
          id: randomUUID(),
          appSettingsId: APP_SETTINGS_SINGLETON_ID,
          actorUserId: input.actorUserId,
          changedFields: input.changedFields,
          beforeValues: asPricingLaborAuditJson(input.beforeValues),
          afterValues: asPricingLaborAuditJson(input.afterValues),
        },
      });

      return mapPricingLaborSettings(record);
    });
  }

  findPricingLaborHistory({
    page,
    limit,
  }: {
    page: number;
    limit: number;
  }): Promise<PricingLaborAuditEntry[]> {
    return this.prisma.appSettingsAuditHistory
      .findMany({
        where: { appSettingsId: APP_SETTINGS_SINGLETON_ID },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: pricingLaborAuditHistorySelect,
      })
      .then((records) => records.map(mapPricingLaborAuditEntry));
  }

  countPricingLaborHistory(): Promise<number> {
    return this.prisma.appSettingsAuditHistory.count({
      where: { appSettingsId: APP_SETTINGS_SINGLETON_ID },
    });
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

function mapPricingLaborAuditEntry(
  record: AppSettingsAuditHistoryRecord,
): PricingLaborAuditEntry {
  return {
    id: record.id,
    actorUserId: record.actorUserId,
    changedFields:
      record.changedFields as PricingLaborAuditEntry['changedFields'],
    beforeValues: mapPricingLaborAuditValueMap(record.beforeValues),
    afterValues: mapPricingLaborAuditValueMap(record.afterValues),
    createdAt: record.createdAt,
  };
}

function mapPricingLaborAuditValueMap(
  value: Prisma.JsonValue,
): PricingLaborAuditValueMap {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [keyof PricingLaborAuditValueMap, string | number] =>
        typeof entry[1] === 'string' || typeof entry[1] === 'number',
    ),
  );
}
