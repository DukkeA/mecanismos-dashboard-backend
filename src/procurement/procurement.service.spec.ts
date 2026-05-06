import { NotFoundException } from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import {
  InventoryQuoteItemNotFoundError,
  ProcurementRepository,
  SupplierNotFoundError,
} from './persistence/procurement.repository';

describe('ProcurementService', () => {
  const repository = {
    ensureSupplierExists: jest.fn(),
    ensureInventoryItemExists: jest.fn(),
    createQuote: jest.fn(),
    findItemQuoteLookup: jest.fn(),
    findSupplierQuoteTimeline: jest.fn(),
    findQuoteById: jest.fn(),
    updateQuoteCorrection: jest.fn(),
    voidQuote: jest.fn(),
  } as unknown as jest.Mocked<ProcurementRepository>;

  let service: ProcurementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProcurementService(repository);
  });

  it('appends new supplier quotes instead of rewriting prior history', async () => {
    repository.createQuote.mockResolvedValue({
      id: 'quote-2',
      quotedCost: 182000,
    } as never);

    await expect(
      service.createQuote({
        supplierId: 'supplier-1',
        inventoryItemId: 'item-1',
        quotedCost: 182000,
        quotedAt: new Date('2026-05-06T10:00:00.000Z'),
      }),
    ).resolves.toMatchObject({ id: 'quote-2', quotedCost: 182000 });
  });

  it('returns latest-by-supplier summaries plus full history for item lookup', async () => {
    repository.findItemQuoteLookup.mockResolvedValue({
      latestBySupplier: [{ id: 'quote-2' }],
      history: [{ id: 'quote-2' }, { id: 'quote-1' }],
    } as never);

    await expect(service.findItemQuoteLookup('item-1')).resolves.toEqual({
      latestBySupplier: [{ id: 'quote-2' }],
      history: [{ id: 'quote-2' }, { id: 'quote-1' }],
    });
  });

  it('maps missing supplier context to 404 for supplier timeline lookup', async () => {
    repository.ensureSupplierExists.mockRejectedValue(
      new SupplierNotFoundError('missing-supplier'),
    );

    await expect(
      service.findSupplierQuoteTimeline('missing-supplier', {
        page: 1,
        limit: 10,
      }),
    ).rejects.toThrow(
      new NotFoundException('Supplier missing-supplier not found'),
    );
  });

  it('keeps voided quotes auditable while delegating the state change', async () => {
    repository.findQuoteById.mockResolvedValue({ id: 'quote-1' } as never);
    repository.voidQuote.mockResolvedValue({
      id: 'quote-1',
      status: 'VOIDED',
    } as never);

    await expect(
      service.voidQuote('quote-1', {
        voidReason: 'Proveedor cotizó otra referencia',
      }),
    ).resolves.toMatchObject({ id: 'quote-1', status: 'VOIDED' });
  });

  it('maps missing item lookup to 404', async () => {
    repository.ensureInventoryItemExists.mockRejectedValue(
      new InventoryQuoteItemNotFoundError('missing-item'),
    );

    await expect(service.findItemQuoteLookup('missing-item')).rejects.toThrow(
      new NotFoundException('Inventory item missing-item not found'),
    );
  });
});
