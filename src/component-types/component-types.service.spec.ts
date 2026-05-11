import { ConflictException, NotFoundException } from '@nestjs/common';
import { ComponentTypesService } from './component-types.service';
import {
  ComponentTypeSlugConflictError,
  ComponentTypesRepository,
} from './persistence/component-types.repository';

describe('ComponentTypesService', () => {
  const componentTypeRecord = {
    id: 'component-type-1',
    name: 'Bomba de inyeccion',
    slug: 'bomba-de-inyeccion',
    description: 'Bombas de inyeccion diesel',
    isActive: true,
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: new Date('2026-05-05T12:00:00.000Z'),
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ComponentTypesRepository>;

  let service: ComponentTypesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComponentTypesService(repository);
  });

  it('creates a component type by normalizing the slug from the name', async () => {
    repository.create.mockResolvedValue(componentTypeRecord);

    await expect(
      service.create({
        name: '  Bomba de inyección  ',
        description: '  Bombas de inyección diesel  ',
      }),
    ).resolves.toEqual(componentTypeRecord);

    expect(repository.create.mock.calls[0]?.[0]).toEqual({
      name: 'Bomba de inyección',
      slug: 'bomba-de-inyeccion',
      description: 'Bombas de inyección diesel',
    });
  });

  it('rejects duplicate component type slugs with a 409 conflict', async () => {
    repository.create.mockRejectedValue(new ComponentTypeSlugConflictError());

    await expect(
      service.create({
        name: 'Inyector',
      }),
    ).rejects.toThrow(
      new ConflictException('Component type slug already exists'),
    );
  });

  it('returns a paginated component type list with search and isActive filters', async () => {
    repository.findMany.mockResolvedValue({
      items: [componentTypeRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        search: 'inye',
        isActive: true,
      }),
    ).resolves.toEqual({
      data: [componentTypeRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns active component type options', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'component-type-1',
        name: 'Bomba de inyeccion',
        description: 'Bombas de inyeccion diesel',
        isActive: true,
      },
    ] as never);

    await expect(service.findOptions({ limit: 10 })).resolves.toEqual({
      data: [
        {
          id: 'component-type-1',
          label: 'Bomba de inyeccion',
          description: 'Bombas de inyeccion diesel',
          isActive: true,
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('throws NotFoundException when the component type does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-component-type')).rejects.toThrow(
      new NotFoundException('Component type missing-component-type not found'),
    );
  });

  it('updates a component type and preserves explicit slugs when provided', async () => {
    repository.findById.mockResolvedValue(componentTypeRecord);
    repository.update.mockResolvedValue({
      ...componentTypeRecord,
      name: 'Tobera',
      slug: 'tobera-diesel',
      description: 'Toberas para banco de pruebas',
      isActive: false,
    });

    await expect(
      service.update('component-type-1', {
        name: '  Tobera  ',
        slug: '  Tobera Diesel  ',
        description: '  Toberas para banco de pruebas  ',
        isActive: false,
      }),
    ).resolves.toMatchObject({
      id: 'component-type-1',
      slug: 'tobera-diesel',
      isActive: false,
    });

    expect(repository.update.mock.calls[0]).toEqual([
      'component-type-1',
      {
        name: 'Tobera',
        slug: 'tobera-diesel',
        description: 'Toberas para banco de pruebas',
        isActive: false,
      },
    ]);
  });
});
