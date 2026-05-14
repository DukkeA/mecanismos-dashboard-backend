import {
  SupplierDocumentType,
  SupplierType,
} from '../../../generated/prisma/enums';
import { LEXICAL_NOTE_EXAMPLE } from '../../common/rich-text/lexical-note';
import { SuppliersRepository } from './suppliers.repository';

describe('SuppliersRepository', () => {
  const supplierRecord = {
    id: 'supplier-1',
    name: 'Repuestos Central',
    type: SupplierType.COMPANY,
    contactName: 'Laura Perez',
    documentType: SupplierDocumentType.NIT,
    documentNumber: '900123456',
    email: 'compras@repuestos.test',
    notes: LEXICAL_NOTE_EXAMPLE,
    isActive: true,
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    phones: [
      {
        id: 'phone-1',
        supplierId: 'supplier-1',
        label: 'Principal',
        phone: '3001234567',
        isPrimary: true,
        hasWhatsapp: true,
        notes: null,
        createdAt: new Date('2026-05-05T12:00:00.000Z'),
        updatedAt: new Date('2026-05-05T12:00:00.000Z'),
      },
    ],
  };

  it('normalizes supplier strings and persists phones inside a transaction on create', async () => {
    type SupplierCreateArgs = {
      data: Record<string, unknown>;
      include: {
        phones: {
          orderBy: Array<{ isPrimary: 'desc' } | { createdAt: 'asc' }>;
        };
      };
    };

    let receivedCreateArgs: SupplierCreateArgs | undefined;

    const tx = {
      supplier: {
        create: jest.fn((args: SupplierCreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(supplierRecord);
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transactionClient: typeof tx) => Promise<T>) =>
          callback(tx),
      ),
    };

    const repository = new SuppliersRepository(prisma as never);

    await expect(
      repository.create({
        name: '  Repuestos Central  ',
        type: SupplierType.COMPANY,
        contactName: ' Laura Perez ',
        documentType: SupplierDocumentType.NIT,
        documentNumber: ' 900123456 ',
        email: ' COMPRAS@REPUESTOS.TEST ',
        notes: LEXICAL_NOTE_EXAMPLE,
        isActive: true,
        phones: [
          {
            label: ' Principal ',
            phone: ' 3001234567 ',
            isPrimary: true,
            hasWhatsapp: true,
            notes: null,
          },
        ],
      }),
    ).resolves.toEqual(supplierRecord);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(receivedCreateArgs?.data).toMatchObject({
      name: 'Repuestos Central',
      type: SupplierType.COMPANY,
      contactName: 'Laura Perez',
      documentType: SupplierDocumentType.NIT,
      documentNumber: '900123456',
      email: 'compras@repuestos.test',
      notes: LEXICAL_NOTE_EXAMPLE,
      isActive: true,
    });
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
    expect(receivedCreateArgs?.data.phones).toMatchObject({
      create: [
        {
          label: 'Principal',
          phone: '3001234567',
          isPrimary: true,
          hasWhatsapp: true,
          notes: null,
        },
      ],
    });
    expect(
      (
        receivedCreateArgs?.data.phones as {
          create: Array<Record<string, unknown>>;
        }
      ).create[0]?.id,
    ).toEqual(expect.any(String));
    expect(
      (
        receivedCreateArgs?.data.phones as {
          create: Array<Record<string, unknown>>;
        }
      ).create[0]?.updatedAt,
    ).toEqual(expect.any(Date));
    expect(receivedCreateArgs?.include).toEqual({
      phones: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
    });
  });

  it('builds pragmatic supplier search filters including phone numbers', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { createdAt: 'desc' };
      skip: number;
      take: number;
      include: {
        phones: {
          orderBy: Array<{ isPrimary: 'desc' } | { createdAt: 'asc' }>;
        };
      };
    };
    type CountArgs = {
      where: Record<string, unknown>;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      supplier: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
        count: jest.fn((args: CountArgs) => {
          receivedCountArgs = args;

          return Promise.resolve(0);
        }),
      },
    };

    const repository = new SuppliersRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 10,
      search: '  repuestos  ',
      isActive: true,
      type: SupplierType.COMPANY,
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        isActive: true,
        type: SupplierType.COMPANY,
        OR: [
          { name: { contains: 'repuestos', mode: 'insensitive' } },
          { email: { contains: 'repuestos', mode: 'insensitive' } },
          { contactName: { contains: 'repuestos', mode: 'insensitive' } },
          { documentNumber: { contains: 'repuestos', mode: 'insensitive' } },
          {
            phones: {
              some: {
                phone: { contains: 'repuestos', mode: 'insensitive' },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
      include: {
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
    expect(receivedCountArgs).toEqual({
      where: {
        isActive: true,
        type: SupplierType.COMPANY,
        OR: [
          { name: { contains: 'repuestos', mode: 'insensitive' } },
          { email: { contains: 'repuestos', mode: 'insensitive' } },
          { contactName: { contains: 'repuestos', mode: 'insensitive' } },
          { documentNumber: { contains: 'repuestos', mode: 'insensitive' } },
          {
            phones: {
              some: {
                phone: { contains: 'repuestos', mode: 'insensitive' },
              },
            },
          },
        ],
      },
    });
  });

  it('reads one supplier with phones ordered by primary first', async () => {
    type FindUniqueArgs = {
      where: { id: string };
      include: {
        phones: {
          orderBy: Array<{ isPrimary: 'desc' } | { createdAt: 'asc' }>;
        };
      };
    };

    let receivedFindUniqueArgs: FindUniqueArgs | undefined;

    const prisma = {
      supplier: {
        findUnique: jest.fn((args: FindUniqueArgs) => {
          receivedFindUniqueArgs = args;

          return Promise.resolve(supplierRecord);
        }),
      },
    };

    const repository = new SuppliersRepository(prisma as never);

    await expect(repository.findById('supplier-1')).resolves.toEqual(
      supplierRecord,
    );
    expect(receivedFindUniqueArgs).toEqual({
      where: { id: 'supplier-1' },
      include: {
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  });

  it('replaces the full phone set inside a transaction when update receives phones', async () => {
    type SupplierUpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
    };
    type SupplierPhoneDeleteManyArgs = { where: { supplierId: string } };
    type SupplierPhoneCreateManyArgs = { data: Array<Record<string, unknown>> };
    type SupplierFindUniqueArgs = {
      where: { id: string };
      include: {
        phones: {
          orderBy: Array<{ isPrimary: 'desc' } | { createdAt: 'asc' }>;
        };
      };
    };

    let receivedUpdateArgs: SupplierUpdateArgs | undefined;
    let receivedDeleteManyArgs: SupplierPhoneDeleteManyArgs | undefined;
    let receivedCreateManyArgs: SupplierPhoneCreateManyArgs | undefined;
    let receivedFindUniqueArgs: SupplierFindUniqueArgs | undefined;

    const tx = {
      supplier: {
        update: jest.fn((args: SupplierUpdateArgs) => {
          receivedUpdateArgs = args;

          return Promise.resolve(undefined);
        }),
        findUnique: jest.fn((args: SupplierFindUniqueArgs) => {
          receivedFindUniqueArgs = args;

          return Promise.resolve(supplierRecord);
        }),
      },
      supplierPhone: {
        deleteMany: jest.fn((args: SupplierPhoneDeleteManyArgs) => {
          receivedDeleteManyArgs = args;

          return Promise.resolve({ count: 1 });
        }),
        createMany: jest.fn((args: SupplierPhoneCreateManyArgs) => {
          receivedCreateManyArgs = args;

          return Promise.resolve({ count: 2 });
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        <T>(callback: (transactionClient: typeof tx) => Promise<T>) =>
          callback(tx),
      ),
    };

    const repository = new SuppliersRepository(prisma as never);

    await expect(
      repository.update('supplier-1', {
        contactName: ' Andrea Diaz ',
        phones: [
          {
            label: ' Principal ',
            phone: ' 3009998888 ',
            isPrimary: true,
            hasWhatsapp: true,
          },
          {
            label: ' Bodega ',
            phone: ' 3107776666 ',
            isPrimary: false,
            hasWhatsapp: false,
            notes: LEXICAL_NOTE_EXAMPLE,
          },
        ],
      }),
    ).resolves.toEqual(supplierRecord);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(receivedUpdateArgs?.where).toEqual({ id: 'supplier-1' });
    expect(receivedUpdateArgs?.data).toMatchObject({
      contactName: 'Andrea Diaz',
    });
    expect(receivedUpdateArgs?.data.updatedAt).toEqual(expect.any(Date));
    expect(receivedDeleteManyArgs).toEqual({
      where: { supplierId: 'supplier-1' },
    });
    expect(receivedCreateManyArgs?.data).toMatchObject([
      {
        supplierId: 'supplier-1',
        label: 'Principal',
        phone: '3009998888',
        isPrimary: true,
        hasWhatsapp: true,
        notes: null,
      },
      {
        supplierId: 'supplier-1',
        label: 'Bodega',
        phone: '3107776666',
        isPrimary: false,
        hasWhatsapp: false,
          notes: LEXICAL_NOTE_EXAMPLE,
      },
    ]);
    expect(receivedCreateManyArgs?.data[0]?.id).toEqual(expect.any(String));
    expect(receivedCreateManyArgs?.data[0]?.updatedAt).toEqual(
      expect.any(Date),
    );
    expect(receivedCreateManyArgs?.data[1]?.id).toEqual(expect.any(String));
    expect(receivedCreateManyArgs?.data[1]?.updatedAt).toEqual(
      expect.any(Date),
    );
    expect(receivedFindUniqueArgs).toEqual({
      where: { id: 'supplier-1' },
      include: {
        phones: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });
  });
});
