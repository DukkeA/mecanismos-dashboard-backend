import {
  ComponentTypeSlugConflictError,
  ComponentTypesRepository,
} from './component-types.repository';

describe('ComponentTypesRepository', () => {
  it('normalizes optional strings on create and persists the provided slug', async () => {
    const createdComponentType = {
      id: 'component-type-1',
      name: 'Bomba de inyección',
      slug: 'bomba-de-inyeccion',
      description: 'Bombas diesel',
      isActive: true,
      createdAt: new Date('2026-05-05T12:00:00.000Z'),
      updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    };
    type CreateArgs = {
      data: {
        id: string;
        name: string;
        slug: string;
        description: string;
        isActive: boolean;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      componentType: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdComponentType);
        }),
      },
    };

    const repository = new ComponentTypesRepository(prisma as never);

    await expect(
      repository.create({
        name: ' Bomba de inyección ',
        slug: 'bomba-de-inyeccion',
        description: ' Bombas diesel ',
      }),
    ).resolves.toEqual(createdComponentType);

    expect(receivedCreateArgs).toBeDefined();
    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.name).toBe('Bomba de inyección');
    expect(receivedCreateArgs?.data.slug).toBe('bomba-de-inyeccion');
    expect(receivedCreateArgs?.data.description).toBe('Bombas diesel');
    expect(receivedCreateArgs?.data.isActive).toBe(true);
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('builds paginated filters for component type search and isActive', async () => {
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
      componentType: {
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

    const repository = new ComponentTypesRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      search: '  iny  ',
      isActive: true,
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'iny', mode: 'insensitive' } },
          { slug: { contains: 'iny', mode: 'insensitive' } },
          { description: { contains: 'iny', mode: 'insensitive' } },
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
          { name: { contains: 'iny', mode: 'insensitive' } },
          { slug: { contains: 'iny', mode: 'insensitive' } },
          { description: { contains: 'iny', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('maps prisma unique violations to a slug conflict error', async () => {
    const prisma = {
      componentType: {
        create: jest.fn().mockRejectedValue({ code: 'P2002' }),
      },
    };

    const repository = new ComponentTypesRepository(prisma as never);

    await expect(
      repository.create({
        name: 'Inyector',
        slug: 'inyector',
      }),
    ).rejects.toBeInstanceOf(ComponentTypeSlugConflictError);
  });
});
