import { WorkOrderType } from '../../generated/prisma/enums';

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

export type PricingLaborSettings = typeof DEFAULT_PRICING_LABOR_SETTINGS & {
  updatedAt: Date;
};

export function buildPricingLaborSettingsCreateDefaults(now = new Date()) {
  return {
    id: APP_SETTINGS_SINGLETON_ID,
    ...DEFAULT_PRICING_LABOR_SETTINGS,
    createdAt: now,
    updatedAt: now,
  };
}

export function resolveDefaultContingencyPct(
  workOrderType: string,
  diagnosisRequired: boolean,
  settings: Pick<
    PricingLaborSettings,
    | 'saleContingencyPct'
    | 'workshopContingencyPct'
    | 'diagnosticContingencyPct'
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
