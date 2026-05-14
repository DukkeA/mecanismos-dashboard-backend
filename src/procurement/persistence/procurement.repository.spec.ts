import { SupplierQuoteStatus } from '../../../generated/prisma/enums';
import { LEXICAL_NOTE_EXAMPLE } from '../../common/rich-text/lexical-note';
import { ProcurementRepository } from './procurement.repository';

describe('ProcurementRepository', () => {
  const supplier = {
    id: 'supplier-1',
    name: 'Repuestos Central',
    contactName: 'Laura Perez',
  };
  const inventoryItem = {
    id: 'item-1',
    name: 'Inyector Bosch',
    brand: 'Bosch',
    reference: '0445120231',
    identifier: 'INV-001',
  };
  const quoteRecord = {
    id: 'quote-1',
    supplierId: 'supplier-1',
    inventoryItemId: 'item-1',
    quotedCost: 182000,
    quotedAt: new Date('2026-05-06T10:00:00.000Z'),
    notes: LEXICAL_NOTE_EXAMPLE,
    status: SupplierQuoteStatus.ACTIVE,
    correctionReason: null,
    voidedAt: null,
    voidReason: null,
    createdAt: new Date('2026-05-06T10:01:00.000Z'),
    updatedAt: new Date('2026-05-06T10:01:00.000Z'),
    Supplier: supplier,
    InventoryItem: inventoryItem,
  };

  it('persists supplier quote notes as JSON and maps included relations', async () => {
    type CreateArgs = { data: Record<string, unknown>; include: unknown };
    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      supplierQuoteHistory: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(quoteRecord);
        }),
      },
    };

    const repository = new ProcurementRepository(prisma as never);

    await expect(
      repository.createQuote({
        supplierId: 'supplier-1',
        inventoryItemId: 'item-1',
        quotedCost: 182000,
        quotedAt: quoteRecord.quotedAt,
        notes: LEXICAL_NOTE_EXAMPLE,
      }),
    ).resolves.toEqual({
      ...withoutPrismaRelationAliases(quoteRecord),
      supplier,
      inventoryItem,
    });

    expect(receivedCreateArgs?.data).toMatchObject({
      supplierId: 'supplier-1',
      inventoryItemId: 'item-1',
      quotedCost: 182000,
      quotedAt: quoteRecord.quotedAt,
      notes: LEXICAL_NOTE_EXAMPLE,
      status: SupplierQuoteStatus.ACTIVE,
    });
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('preserves undefined note updates and clears notes when null is provided', async () => {
    type UpdateArgs = { data: Record<string, unknown> };
    const updateArgs: UpdateArgs[] = [];

    const prisma = {
      supplierQuoteHistory: {
        update: jest.fn((args: UpdateArgs) => {
          updateArgs.push(args);

          return Promise.resolve({ ...quoteRecord, ...args.data });
        }),
      },
    };

    const repository = new ProcurementRepository(prisma as never);

    await repository.updateQuoteCorrection('quote-1', {
      quotedCost: 190000,
      correctionReason: ' Ajuste de lista ',
    });
    await repository.updateQuoteCorrection('quote-1', {
      notes: null,
      correctionReason: ' Limpieza de nota ',
    });

    expect(updateArgs[0]?.data).toMatchObject({
      quotedCost: 190000,
      correctionReason: 'Ajuste de lista',
    });
    expect(updateArgs[0]?.data).not.toHaveProperty('notes');
    expect(updateArgs[1]?.data).toMatchObject({
      notes: null,
      correctionReason: 'Limpieza de nota',
    });
  });

  it('does not include JSON note content in supplier quote timeline search filters', async () => {
    type FindManyArgs = { where: Record<string, unknown> };
    type CountArgs = { where: Record<string, unknown> };
    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      supplierQuoteHistory: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([quoteRecord]);
        }),
        count: jest.fn((args: CountArgs) => {
          receivedCountArgs = args;

          return Promise.resolve(1);
        }),
      },
    };

    const repository = new ProcurementRepository(prisma as never);

    await expect(
      repository.findSupplierQuoteTimeline('supplier-1', {
        page: 1,
        limit: 10,
        search: ' hydraulic leak ',
      }),
    ).resolves.toMatchObject({
      total: 1,
      items: [{ notes: LEXICAL_NOTE_EXAMPLE, supplier, inventoryItem }],
    });

    expect(receivedFindManyArgs?.where).toEqual({
      supplierId: 'supplier-1',
      status: SupplierQuoteStatus.ACTIVE,
      OR: [
        {
          InventoryItem: {
            name: { contains: 'hydraulic leak', mode: 'insensitive' },
          },
        },
        {
          InventoryItem: {
            brand: { contains: 'hydraulic leak', mode: 'insensitive' },
          },
        },
        {
          InventoryItem: {
            reference: { contains: 'hydraulic leak', mode: 'insensitive' },
          },
        },
        {
          InventoryItem: {
            identifier: { contains: 'hydraulic leak', mode: 'insensitive' },
          },
        },
      ],
    });
    expect(receivedCountArgs?.where).toEqual(receivedFindManyArgs?.where);
  });
});

function withoutPrismaRelationAliases(record: {
  Supplier: unknown;
  InventoryItem: unknown;
  [key: string]: unknown;
}) {
  const { Supplier: _supplier, InventoryItem: _inventoryItem, ...quote } =
    record;

  return quote;
}
