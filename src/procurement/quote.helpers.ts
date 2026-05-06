import type { SupplierQuoteStatus } from '../../generated/prisma/enums';

export type QuoteTimelineRow = {
  id: string;
  supplierId: string;
  inventoryItemId: string;
  quotedCost: number;
  quotedAt: Date;
  status: SupplierQuoteStatus;
  notes: string | null;
  correctionReason: string | null;
  voidReason: string | null;
  voidedAt: Date | null;
  supplier: {
    id: string;
    name: string;
    contactName: string | null;
  };
};

export function buildLatestValidQuoteSummary(history: QuoteTimelineRow[]) {
  const seenSupplierIds = new Set<string>();

  return history.filter((quote) => {
    if (quote.status === 'VOIDED' || seenSupplierIds.has(quote.supplierId)) {
      return false;
    }

    seenSupplierIds.add(quote.supplierId);
    return true;
  });
}

export function sortQuotesChronologically<T extends { quotedAt: Date }>(
  quotes: T[],
) {
  return [...quotes].sort(
    (left, right) => right.quotedAt.getTime() - left.quotedAt.getTime(),
  );
}
