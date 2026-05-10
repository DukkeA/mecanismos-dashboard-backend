import {
  CostCenterCodeConflictError,
  CostCentersRepository,
} from './cost-centers.repository';

describe('CostCentersRepository', () => {
  it('creates cost centers with trimmed fields and active-by-default lifecycle', async () => {
    const createdCostCenter = {
      id: 'cost-center-1',
      code: 'GENERAL',
      name: 'General',
      isActive: true,
      createdAt: new Date('2026-05-09T12:00:00.000Z'),
      updatedAt: new Date('2026-05-09T12:00:00.000Z'),
    };
    type CreateArgs = {
      data: {
        id: string;
        code: string;
        name: string;
        isActive: boolean;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      costCenter: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdCostCenter);
        }),
      },
    };

    const repository = new CostCentersRepository(prisma as never);

    await expect(
      repository.create({
        code: ' GENERAL ',
        name: ' General ',
      }),
    ).resolves.toEqual(createdCostCenter);

    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.code).toBe('GENERAL');
    expect(receivedCreateArgs?.data.name).toBe('General');
    expect(receivedCreateArgs?.data.isActive).toBe(true);
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('builds paginated filters for code/name search and active state', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      orderBy: { name: string };
      skip: number;
      take: number;
    };
    type CountArgs = {
      where: Record<string, unknown>;
    };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      costCenter: {
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

    const repository = new CostCentersRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      search: '  gene  ',
      isActive: false,
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        isActive: false,
        OR: [
          { code: { contains: 'gene', mode: 'insensitive' } },
          { name: { contains: 'gene', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      skip: 5,
      take: 5,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        isActive: false,
        OR: [
          { code: { contains: 'gene', mode: 'insensitive' } },
          { name: { contains: 'gene', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('updates trimmed values and persists deactivate operations', async () => {
    type UpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
    };

    let receivedUpdateArgs: UpdateArgs | undefined;

    const prisma = {
      costCenter: {
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;

          return Promise.resolve({ id: 'cost-center-1' });
        }),
      },
    };

    const repository = new CostCentersRepository(prisma as never);

    await repository.update('cost-center-1', {
      code: ' OFICINA ',
      name: ' Oficina ',
      isActive: false,
    });

    expect(receivedUpdateArgs?.where).toEqual({ id: 'cost-center-1' });
    expect(receivedUpdateArgs?.data).toMatchObject({
      code: 'OFICINA',
      name: 'Oficina',
      isActive: false,
    });
    expect(receivedUpdateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('maps prisma unique violations to a canonical code conflict error', async () => {
    const prisma = {
      costCenter: {
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };

    const repository = new CostCentersRepository(prisma as never);

    await expect(
      repository.create({
        code: 'GENERAL',
        name: 'General',
      }),
    ).rejects.toBeInstanceOf(CostCenterCodeConflictError);
  });
});
