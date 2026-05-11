import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import {
  ServiceCatalogSlugConflictError,
  ServicesRepository,
} from './persistence/services.repository';

describe('ServicesService', () => {
  const serviceRecord = {
    id: 'service-1',
    name: 'Diagnóstico electrónico',
    slug: 'diagnostico-electronico',
    description: 'Lectura de fallas y validación inicial.',
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
  } as unknown as jest.Mocked<ServicesRepository>;

  let service: ServicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServicesService(repository);
  });

  it('creates a service by trimming the name and deriving the slug from it', async () => {
    repository.create.mockResolvedValue(serviceRecord);

    await expect(
      service.create({
        name: '  Diagnóstico electrónico  ',
        description: '  Lectura de fallas y validación inicial.  ',
      }),
    ).resolves.toEqual(serviceRecord);

    expect(repository.create.mock.calls[0]).toEqual([
      {
        name: 'Diagnóstico electrónico',
        slug: 'diagnostico-electronico',
        description: 'Lectura de fallas y validación inicial.',
      },
    ]);
  });

  it('rejects duplicate canonical service names with a 409 conflict', async () => {
    repository.create.mockRejectedValue(new ServiceCatalogSlugConflictError());

    await expect(
      service.create({
        name: 'Diagnóstico',
      }),
    ).rejects.toThrow(
      new ConflictException('Service catalog slug already exists'),
    );
  });

  it('rejects names whose canonical slug becomes empty on create', async () => {
    await expect(
      service.create({
        name: '!!!',
      }),
    ).rejects.toThrow(
      new BadRequestException('Service name must contain letters or numbers'),
    );

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('returns paginated services with pragmatic filters', async () => {
    repository.findMany.mockResolvedValue({
      items: [serviceRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        search: 'diag',
        isActive: true,
      }),
    ).resolves.toEqual({
      data: [serviceRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns active service options', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'service-1',
        name: 'Diagnóstico electrónico',
        description: 'Lectura de fallas y validación inicial.',
        isActive: true,
      },
    ] as never);

    await expect(service.findOptions({ limit: 10 })).resolves.toEqual({
      data: [
        {
          id: 'service-1',
          label: 'Diagnóstico electrónico',
          description: 'Lectura de fallas y validación inicial.',
          isActive: true,
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('throws NotFoundException when the service does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-service')).rejects.toThrow(
      new NotFoundException('Service missing-service not found'),
    );
  });

  it('regenerates the slug when the service name changes on update', async () => {
    repository.findById.mockResolvedValue(serviceRecord);
    repository.update.mockResolvedValue({
      ...serviceRecord,
      name: 'Calibración de bomba',
      slug: 'calibracion-de-bomba',
      description: 'Banco actualizado.',
      isActive: false,
    });

    await expect(
      service.update('service-1', {
        name: '  Calibración de bomba  ',
        description: '  Banco actualizado.  ',
        isActive: false,
      }),
    ).resolves.toMatchObject({
      id: 'service-1',
      slug: 'calibracion-de-bomba',
      isActive: false,
    });

    expect(repository.update.mock.calls[0]).toEqual([
      'service-1',
      {
        name: 'Calibración de bomba',
        slug: 'calibracion-de-bomba',
        description: 'Banco actualizado.',
        isActive: false,
      },
    ]);
  });

  it('rejects names whose canonical slug becomes empty on update', async () => {
    repository.findById.mockResolvedValue(serviceRecord);

    await expect(
      service.update('service-1', {
        name: '!!!',
      }),
    ).rejects.toThrow(
      new BadRequestException('Service name must contain letters or numbers'),
    );

    expect(repository.update.mock.calls).toHaveLength(0);
  });

  it('quick-creates a service with option-compatible response data', async () => {
    repository.create.mockResolvedValue(serviceRecord);

    await expect(
      service.quickCreate({ name: 'Diagnóstico electrónico' }),
    ).resolves.toMatchObject({
      data: { id: 'service-1', label: 'Diagnóstico electrónico' },
      entity: serviceRecord,
    });
  });
});
