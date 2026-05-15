import { CustomerDocumentType } from '../../../generated/prisma/enums';
import { LEXICAL_NOTE_EXAMPLE } from '../../common/rich-text/lexical-note';
import { CustomersRepository } from './customers.repository';

describe('CustomersRepository', () => {
  it('normalizes trimmed strings and lowercase email on create while relying on the database default for activity', async () => {
    const createdCustomer = {
      id: 'customer-1',
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: CustomerDocumentType.CEDULA,
      documentNumber: '123456789',
      email: 'ana@mecanismos.test',
      notes: LEXICAL_NOTE_EXAMPLE,
      isActive: true,
      createdAt: new Date('2026-05-05T10:00:00.000Z'),
      updatedAt: new Date('2026-05-05T10:00:00.000Z'),
    };
    type CreateArgs = {
      data: {
        id: string;
        name: string;
        phone: string;
        documentType: string;
        documentNumber: string;
        email: string;
        notes: typeof LEXICAL_NOTE_EXAMPLE;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      customer: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdCustomer);
        }),
      },
    };

    const repository = new CustomersRepository(prisma as never);

    await expect(
      repository.create({
        name: '  Ana Gomez  ',
        phone: ' 3001234567  ',
        documentType: CustomerDocumentType.CEDULA,
        documentNumber: ' 123456789 ',
        email: '  ANA@MECANISMOS.TEST ',
        notes: LEXICAL_NOTE_EXAMPLE,
      }),
    ).resolves.toEqual(createdCustomer);

    expect(receivedCreateArgs).toBeDefined();
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.name).toBe('Ana Gomez');
    expect(receivedCreateArgs?.data.phone).toBe('3001234567');
    expect(receivedCreateArgs?.data.documentType).toBe(
      CustomerDocumentType.CEDULA,
    );
    expect(receivedCreateArgs?.data.documentNumber).toBe('123456789');
    expect(receivedCreateArgs?.data.email).toBe('ana@mecanismos.test');
    expect(receivedCreateArgs?.data.notes).toBe(LEXICAL_NOTE_EXAMPLE);
    expect(receivedCreateArgs?.data).not.toHaveProperty('isActive');
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('builds paginated pragmatic search filters for customer list', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: Record<string, string>;
      skip: number;
      take: number;
    };
    type CountArgs = {
      where: Record<string, unknown>;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      customer: {
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

    const repository = new CustomersRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 10,
      search: '  ana  ',
      documentType: CustomerDocumentType.CEDULA,
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        documentType: CustomerDocumentType.CEDULA,
        OR: [
          { name: { contains: 'ana', mode: 'insensitive' } },
          { documentNumber: { contains: 'ana', mode: 'insensitive' } },
          { phone: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        documentType: CustomerDocumentType.CEDULA,
        OR: [
          { name: { contains: 'ana', mode: 'insensitive' } },
          { documentNumber: { contains: 'ana', mode: 'insensitive' } },
          { phone: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('persists and filters inactive customers without changing unfiltered lists', async () => {
    type CreateArgs = { data: Record<string, unknown> };
    type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };
    type FindManyArgs = { where: Record<string, unknown> };

    let receivedCreateArgs: CreateArgs | undefined;
    let receivedUpdateArgs: UpdateArgs | undefined;
    let receivedFilteredFindManyArgs: FindManyArgs | undefined;
    let receivedUnfilteredFindManyArgs: FindManyArgs | undefined;

    const prisma = {
      customer: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;
          return Promise.resolve({ id: 'customer-1', isActive: false });
        }),
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;
          return Promise.resolve({ id: 'customer-1', isActive: false });
        }),
        findMany: jest
          .fn()
          .mockImplementationOnce((args: FindManyArgs) => {
            receivedFilteredFindManyArgs = args;
            return Promise.resolve([]);
          })
          .mockImplementationOnce((args: FindManyArgs) => {
            receivedUnfilteredFindManyArgs = args;
            return Promise.resolve([]);
          }),
        count: jest.fn(() => Promise.resolve(0)),
      },
    };

    const repository = new CustomersRepository(prisma as never);

    await repository.create({
      name: 'Ana Gomez',
      phone: '3001234567',
      documentType: CustomerDocumentType.CEDULA,
      documentNumber: '123456789',
      isActive: false,
    });
    await repository.update('customer-1', { isActive: false });
    await repository.findMany({ page: 1, limit: 10, isActive: false });
    await repository.findMany({ page: 1, limit: 10 });

    expect(receivedCreateArgs?.data.isActive).toBe(false);
    expect(receivedUpdateArgs?.data.isActive).toBe(false);
    expect(receivedFilteredFindManyArgs?.where).toEqual({ isActive: false });
    expect(receivedUnfilteredFindManyArgs?.where).toEqual({});
  });

  it('filters customer options by explicit lifecycle state', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      select: Record<string, boolean>;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;

    const prisma = {
      customer: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new CustomersRepository(prisma as never);

    await repository.findOptions({ limit: 10, isActive: false });

    expect(receivedFindManyArgs?.where).toEqual({ isActive: false });
    expect(receivedFindManyArgs?.select.isActive).toBe(true);
  });

  it('uses requested allowlisted sorting for customer list', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: Record<string, string>;
      skip: number;
      take: number;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;

    const prisma = {
      customer: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
        count: jest.fn(() => Promise.resolve(0)),
      },
    };

    const repository = new CustomersRepository(prisma as never);

    await repository.findMany({
      page: 1,
      limit: 10,
      sortBy: 'name',
      sortDir: 'asc',
    });

    expect(receivedFindManyArgs?.orderBy).toEqual({ name: 'asc' });
  });
});
