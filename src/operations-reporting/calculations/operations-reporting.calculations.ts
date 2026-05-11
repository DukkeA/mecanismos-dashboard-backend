import { EstimatePhase } from '../../../generated/prisma/enums';

export type PayableEstimate = {
  phase: EstimatePhase;
  totalPriceAmount: number;
};

export type BalanceInput = {
  payableAmount: number | null;
  paidTotal: number;
};

export type GrossUtilityInput = {
  payableAmount: number | null;
  actualCostTotal: number;
};

export function resolvePayableAmount(
  estimates: PayableEstimate[],
): number | null {
  const finalEstimate = estimates.find(
    (estimate) => estimate.phase === EstimatePhase.FINAL,
  );

  if (finalEstimate) {
    return finalEstimate.totalPriceAmount;
  }

  const initialEstimate = estimates.find(
    (estimate) => estimate.phase === EstimatePhase.INITIAL,
  );

  return initialEstimate?.totalPriceAmount ?? null;
}

export function calculateBalance({
  payableAmount,
  paidTotal,
}: BalanceInput): number | null {
  if (payableAmount === null) {
    return null;
  }

  return payableAmount - paidTotal;
}

export function isOverpaid({
  payableAmount,
  paidTotal,
}: BalanceInput): boolean {
  return payableAmount !== null && paidTotal > payableAmount;
}

export function calculateGrossUtility({
  payableAmount,
  actualCostTotal,
}: GrossUtilityInput): number | null {
  if (payableAmount === null) {
    return null;
  }

  return payableAmount - actualCostTotal;
}

export function calculateGrossMargin(input: GrossUtilityInput): number | null {
  if (input.payableAmount === null || input.payableAmount === 0) {
    return null;
  }

  const grossUtility = calculateGrossUtility(input);

  return grossUtility === null ? null : grossUtility / input.payableAmount;
}
