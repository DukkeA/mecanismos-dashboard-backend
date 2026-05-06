import {
  ServiceCatalogSlugConflictError,
  ServicesRepository,
} from './services.repository';

describe('ServicesRepository', () => {
  it('normalizes optional strings on create and persists the derived slug', async () => {
    const createdService = {
      id: 'service-1',
      name: 'Diagnóstico',
      slug: 'diagnostico',
      description: 'Lectura inicial',
      isActive: true,
      createdAt: new Date('2026-05-05T12:00:00.000Z'),
      updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    };
    type CreateArgs = {
      data: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        isActive: boolean;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      serviceCatalog: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdService);
        }),
      },
    };

    const repository = new ServicesRepository(prisma as never);

    await expect(
      repository.create({
        name: ' Diagnóstico ',
        slug: 'diagnostico',
        description: ' Lectura inicial ',
      }),
    ).resolves.toEqual(createdService);

    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.name).toBe('Diagnóstico');
    expect(receivedCreateArgs?.data.slug).toBe('diagnostico');
    expect(receivedCreateArgs?.data.description).toBe('Lectura inicial');
    expect(receivedCreateArgs?.data.isActive).toBe(true);
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('builds paginated filters for service search and isActive', async () => {
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
      serviceCatalog: {
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

    const repository = new ServicesRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      search: '  diag  ',
      isActive: true,
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'diag', mode: 'insensitive' } },
          { slug: { contains: 'diag', mode: 'insensitive' } },
          { description: { contains: 'diag', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      skip: 5,
      take: 5,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'diag', mode: 'insensitive' } },
          { slug: { contains: 'diag', mode: 'insensitive' } },
          { description: { contains: 'diag', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('normalizes blank descriptions to null on update', async () => {
    type UpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
    };

    let receivedUpdateArgs: UpdateArgs | undefined;

    const prisma = {
      serviceCatalog: {
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;

          return Promise.resolve({ id: 'service-1' });
        }),
      },
    };

    const repository = new ServicesRepository(prisma as never);

    await repository.update('service-1', {
      name: ' Calibración ',
      slug: 'calibracion',
      description: ' ',
      isActive: false,
    });

    expect(receivedUpdateArgs?.where).toEqual({ id: 'service-1' });
    expect(receivedUpdateArgs?.data).toMatchObject({
      name: 'Calibración',
      slug: 'calibracion',
      description: null,
      isActive: false,
    });
    expect(receivedUpdateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('maps prisma unique violations to a slug conflict error', async () => {
    const prisma = {
      serviceCatalog: {
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };

    const repository = new ServicesRepository(prisma as never);

    await expect(
      repository.create({
        name: 'Diagnóstico',
        slug: 'diagnostico',
      }),
    ).rejects.toBeInstanceOf(ServiceCatalogSlugConflictError);
  });
});
