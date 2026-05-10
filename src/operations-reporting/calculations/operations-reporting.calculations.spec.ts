import { EstimatePhase } from '../../../generated/prisma/enums';
import {
  calculateBalance,
  calculateGrossMargin,
  calculateGrossUtility,
  isOverpaid,
  resolvePayableAmount,
} from './operations-reporting.calculations';

describe('operations-reporting calculations', () => {
  it('prefers FINAL estimate payable before INITIAL', () => {
    expect(
      resolvePayableAmount([
        { phase: EstimatePhase.INITIAL, totalPriceAmount: 120_000 },
        { phase: EstimatePhase.FINAL, totalPriceAmount: 150_000 },
      ]),
    ).toBe(150_000);
  });

  it('returns null payable when no INITIAL or FINAL estimate exists', () => {
    expect(resolvePayableAmount([])).toBeNull();
  });

  it('calculates known balances and overpaid rows from payable totals', () => {
    expect(calculateBalance({ payableAmount: 100_000, paidTotal: 40_000 })).toBe(
      60_000,
    );
    expect(isOverpaid({ payableAmount: 100_000, paidTotal: 110_000 })).toBe(true);
  });

  it('keeps balance and overpaid false when payable is unknown', () => {
    expect(calculateBalance({ payableAmount: null, paidTotal: 40_000 })).toBeNull();
    expect(isOverpaid({ payableAmount: null, paidTotal: 110_000 })).toBe(false);
  });

  it('calculates gross utility and margin only when payable is known', () => {
    expect(
      calculateGrossUtility({ payableAmount: 200_000, actualCostTotal: 80_000 }),
    ).toBe(120_000);
    expect(
      calculateGrossMargin({ payableAmount: 200_000, actualCostTotal: 80_000 }),
    ).toBe(0.6);
    expect(
      calculateGrossMargin({ payableAmount: null, actualCostTotal: 80_000 }),
    ).toBeNull();
  });
});
