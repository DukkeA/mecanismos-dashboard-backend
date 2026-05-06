import { buildLatestValidQuoteSummary } from './quote.helpers';

describe('quote.helpers', () => {
  it('keeps only the latest non-voided quote per supplier for lookup summaries', () => {
    expect(
      buildLatestValidQuoteSummary([
        {
          id: 'quote-3',
          supplierId: 'supplier-1',
          inventoryItemId: 'item-1',
          quotedCost: 185000,
          quotedAt: new Date('2026-05-03T00:00:00.000Z'),
          status: 'VOIDED',
          notes: null,
          correctionReason: null,
          voidReason: 'bad ref',
          voidedAt: new Date('2026-05-03T01:00:00.000Z'),
          supplier: { id: 'supplier-1', name: 'Central', contactName: null },
        },
        {
          id: 'quote-2',
          supplierId: 'supplier-1',
          inventoryItemId: 'item-1',
          quotedCost: 180000,
          quotedAt: new Date('2026-05-02T00:00:00.000Z'),
          status: 'ACTIVE',
          notes: null,
          correctionReason: null,
          voidReason: null,
          voidedAt: null,
          supplier: { id: 'supplier-1', name: 'Central', contactName: null },
        },
        {
          id: 'quote-1',
          supplierId: 'supplier-2',
          inventoryItemId: 'item-1',
          quotedCost: 190000,
          quotedAt: new Date('2026-05-01T00:00:00.000Z'),
          status: 'ACTIVE',
          notes: null,
          correctionReason: null,
          voidReason: null,
          voidedAt: null,
          supplier: { id: 'supplier-2', name: 'Aliado', contactName: null },
        },
      ]).map((quote) => quote.id),
    ).toEqual(['quote-2', 'quote-1']);
  });
});
