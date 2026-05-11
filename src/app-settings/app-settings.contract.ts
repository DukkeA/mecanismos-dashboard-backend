import type { Prisma } from '../../generated/prisma/client';
import { WorkOrderType } from '../../generated/prisma/enums';
import type { UpdatePricingLaborSettingsDto } from './dto/update-pricing-labor-settings.dto';

export const APP_SETTINGS_SINGLETON_ID = 1;

export const DEFAULT_PRICING_LABOR_SETTINGS = {
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
} as const;

export type PricingLaborSettings = {
  companyName: string;
  currencyCode: string;
  monthlyWorkingHours: number;
  defaultLaborHourlyRate: number;
  saleContingencyPct: number;
  workshopContingencyPct: number;
  diagnosticContingencyPct: number;
  minimumMarkupPct: number;
  recommendedMarkupPct: number;
  highMarkupPct: number;
  updatedAt: Date;
};

export const PRICING_LABOR_AUDITED_FIELDS = [
  'currencyCode',
  'monthlyWorkingHours',
  'defaultLaborHourlyRate',
  'saleContingencyPct',
  'workshopContingencyPct',
  'diagnosticContingencyPct',
  'minimumMarkupPct',
  'recommendedMarkupPct',
  'highMarkupPct',
] as const satisfies readonly (keyof UpdatePricingLaborSettingsDto)[];

export type PricingLaborAuditedField =
  (typeof PRICING_LABOR_AUDITED_FIELDS)[number];

export type PricingLaborAuditValueMap = Partial<
  Pick<PricingLaborSettings, PricingLaborAuditedField>
>;

export type PricingLaborAuditEntry = {
  id: string;
  actorUserId: string;
  changedFields: PricingLaborAuditedField[];
  beforeValues: PricingLaborAuditValueMap;
  afterValues: PricingLaborAuditValueMap;
  createdAt: Date;
};

export type PricingLaborAuditHistoryPage = {
  data: PricingLaborAuditEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export type PricingLaborSettingsDiff = {
  changedFields: PricingLaborAuditedField[];
  beforeValues: PricingLaborAuditValueMap;
  afterValues: PricingLaborAuditValueMap;
  updatedValues: UpdatePricingLaborSettingsDto;
};

export function buildPricingLaborSettingsCreateDefaults(now = new Date()) {
  return {
    id: APP_SETTINGS_SINGLETON_ID,
    ...DEFAULT_PRICING_LABOR_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildPricingLaborSettingsDiff(
  current: PricingLaborSettings,
  dto: UpdatePricingLaborSettingsDto,
): PricingLaborSettingsDiff {
  const changedFields: PricingLaborAuditedField[] = [];
  const beforeValues: PricingLaborAuditValueMap = {};
  const afterValues: PricingLaborAuditValueMap = {};
  const updatedValues: UpdatePricingLaborSettingsDto = {};

  for (const field of PRICING_LABOR_AUDITED_FIELDS) {
    const currentValue = current[field];
    const nextValue = dto[field];

    if (nextValue === undefined || nextValue === currentValue) {
      continue;
    }

    changedFields.push(field);
    assignAuditValue(beforeValues, field, currentValue);
    assignAuditValue(afterValues, field, nextValue);
    assignUpdatedValue(updatedValues, field, nextValue);
  }

  return {
    changedFields,
    beforeValues,
    afterValues,
    updatedValues,
  };
}

export function isEmptyPricingLaborSettingsPatch(
  dto: UpdatePricingLaborSettingsDto,
): boolean {
  return PRICING_LABOR_AUDITED_FIELDS.every(
    (field) => dto[field] === undefined,
  );
}

export function asPricingLaborAuditJson(
  values: PricingLaborAuditValueMap,
): Prisma.InputJsonObject {
  return values;
}

function assignAuditValue<K extends PricingLaborAuditedField>(
  target: PricingLaborAuditValueMap,
  field: K,
  value: PricingLaborSettings[K],
): void {
  target[field] = value;
}

function assignUpdatedValue<K extends PricingLaborAuditedField>(
  target: UpdatePricingLaborSettingsDto,
  field: K,
  value: NonNullable<UpdatePricingLaborSettingsDto[K]>,
): void {
  target[field] = value;
}

export function resolveDefaultContingencyPct(
  workOrderType: string,
  diagnosisRequired: boolean,
  settings: Pick<
    PricingLaborSettings,
    'saleContingencyPct' | 'workshopContingencyPct' | 'diagnosticContingencyPct'
  >,
) {
  if (workOrderType === WorkOrderType.SALE) {
    return settings.saleContingencyPct;
  }

  if (workOrderType === WorkOrderType.WORKSHOP && diagnosisRequired) {
    return settings.diagnosticContingencyPct;
  }

  return settings.workshopContingencyPct;
}
