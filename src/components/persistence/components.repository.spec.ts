import { ComponentsRepository } from './components.repository';

describe('ComponentsRepository', () => {
  it('normalizes trimmed strings on create and preserves optional vehicle links', async () => {
    const createdComponent = {
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      brand: 'Bosch',
      reference: 'ALT-90A',
      identifier: 'SER-100',
      notes: '<p>Alternador reemplazado</p>',
      createdAt: new Date('2026-05-05T12:00:00.000Z'),
      updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    };
    type CreateArgs = {
      data: {
        id: string;
        customerId: string;
        vehicleId: string;
        componentTypeId: string;
        brand: string;
        reference: string;
        identifier: string;
        notes: string;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      component: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdComponent);
        }),
      },
    };

    const repository = new ComponentsRepository(prisma as never);

    await expect(
      repository.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentTypeId: 'component-type-1',
        brand: ' Bosch ',
        reference: ' ALT-90A ',
        identifier: ' SER-100 ',
        notes: ' <p>Alternador reemplazado</p> ',
      }),
    ).resolves.toEqual(createdComponent);

    expect(receivedCreateArgs).toBeDefined();
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.customerId).toBe('customer-1');
    expect(receivedCreateArgs?.data.vehicleId).toBe('vehicle-1');
    expect(receivedCreateArgs?.data.componentTypeId).toBe('component-type-1');
    expect(receivedCreateArgs?.data.brand).toBe('Bosch');
    expect(receivedCreateArgs?.data.reference).toBe('ALT-90A');
    expect(receivedCreateArgs?.data.identifier).toBe('SER-100');
    expect(receivedCreateArgs?.data.notes).toBe(
      '<p>Alternador reemplazado</p>',
    );
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('builds paginated search filters for component list', async () => {
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
      component: {
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

    const repository = new ComponentsRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      customerId: 'customer-1',
      componentTypeId: 'component-type-1',
      vehicleId: 'vehicle-1',
      search: '  bosch  ',
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
        vehicleId: 'vehicle-1',
        OR: [
          { identifier: { contains: 'bosch', mode: 'insensitive' } },
          { reference: { contains: 'bosch', mode: 'insensitive' } },
          { brand: { contains: 'bosch', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
      include: { componentType: true },
    });
    expect(receivedCountArgs).toEqual({
      where: {
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
        vehicleId: 'vehicle-1',
        OR: [
          { identifier: { contains: 'bosch', mode: 'insensitive' } },
          { reference: { contains: 'bosch', mode: 'insensitive' } },
          { brand: { contains: 'bosch', mode: 'insensitive' } },
        ],
      },
    });
  });
});
