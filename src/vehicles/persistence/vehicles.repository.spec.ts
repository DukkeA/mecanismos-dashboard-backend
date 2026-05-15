import { LEXICAL_NOTE_EXAMPLE } from '../../common/rich-text/lexical-note';
import { VehiclesRepository } from './vehicles.repository';

describe('VehiclesRepository', () => {
  it('normalizes trimmed strings and uppercase plate on create', async () => {
    const createdVehicle = {
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      notes: LEXICAL_NOTE_EXAMPLE,
      createdAt: new Date('2026-05-05T12:00:00.000Z'),
      updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    };
    type CreateArgs = {
      data: {
        id: string;
        customerId: string;
        brand: string;
        modelReference: string;
        plate: string;
        notes: typeof LEXICAL_NOTE_EXAMPLE;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      vehicle: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdVehicle);
        }),
      },
    };

    const repository = new VehiclesRepository(prisma as never);

    await expect(
      repository.create({
        customerId: 'customer-1',
        brand: ' Mazda ',
        modelReference: ' CX5 ',
        plate: ' abc123 ',
        notes: LEXICAL_NOTE_EXAMPLE,
      }),
    ).resolves.toEqual(createdVehicle);

    expect(receivedCreateArgs).toBeDefined();
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.customerId).toBe('customer-1');
    expect(receivedCreateArgs?.data.brand).toBe('Mazda');
    expect(receivedCreateArgs?.data.modelReference).toBe('CX5');
    expect(receivedCreateArgs?.data.plate).toBe('ABC123');
    expect(receivedCreateArgs?.data.notes).toBe(LEXICAL_NOTE_EXAMPLE);
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('builds paginated search filters for vehicle list', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { createdAt: string };
      skip: number;
      take: number;
    };
    type CountArgs = {
      where: Record<string, unknown>;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      vehicle: {
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

    const repository = new VehiclesRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      customerId: 'customer-1',
      search: '  mazda  ',
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        customerId: 'customer-1',
        OR: [
          { plate: { contains: 'mazda', mode: 'insensitive' } },
          { brand: { contains: 'mazda', mode: 'insensitive' } },
          { modelReference: { contains: 'mazda', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        customerId: 'customer-1',
        OR: [
          { plate: { contains: 'mazda', mode: 'insensitive' } },
          { brand: { contains: 'mazda', mode: 'insensitive' } },
          { modelReference: { contains: 'mazda', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('persists and filters inactive vehicles without changing unfiltered lists', async () => {
    type CreateArgs = { data: Record<string, unknown> };
    type UpdateArgs = { where: { id: string }; data: Record<string, unknown> };
    type FindManyArgs = { where: Record<string, unknown> };

    let receivedCreateArgs: CreateArgs | undefined;
    let receivedUpdateArgs: UpdateArgs | undefined;
    let receivedFilteredFindManyArgs: FindManyArgs | undefined;
    let receivedUnfilteredFindManyArgs: FindManyArgs | undefined;

    const prisma = {
      vehicle: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;
          return Promise.resolve({ id: 'vehicle-1', isActive: false });
        }),
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;
          return Promise.resolve({ id: 'vehicle-1', isActive: false });
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

    const repository = new VehiclesRepository(prisma as never);

    await repository.create({
      customerId: 'customer-1',
      brand: 'Mazda',
      modelReference: 'CX5',
      plate: 'ABC123',
      isActive: false,
    });
    await repository.update('vehicle-1', { isActive: false });
    await repository.findMany({ page: 1, limit: 10, isActive: false });
    await repository.findMany({ page: 1, limit: 10 });

    expect(receivedCreateArgs?.data.isActive).toBe(false);
    expect(receivedUpdateArgs?.data.isActive).toBe(false);
    expect(receivedFilteredFindManyArgs?.where).toEqual({ isActive: false });
    expect(receivedUnfilteredFindManyArgs?.where).toEqual({});
  });

  it('filters vehicle options by explicit lifecycle state', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      select: Record<string, boolean>;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;

    const prisma = {
      vehicle: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;
          return Promise.resolve([]);
        }),
      },
    };

    const repository = new VehiclesRepository(prisma as never);

    await repository.findOptions({ limit: 10, isActive: false });

    expect(receivedFindManyArgs?.where).toEqual({ isActive: false });
    expect(receivedFindManyArgs?.select.isActive).toBe(true);
  });
});
