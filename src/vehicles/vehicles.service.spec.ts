import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  VehicleDuplicatePlateError,
  VehiclesRepository,
} from './persistence/vehicles.repository';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  const vehicleRecord = {
    id: 'vehicle-1',
    customerId: 'customer-1',
    brand: 'Mazda',
    modelReference: 'CX5',
    plate: 'ABC123',
    notes: '<p>Blindaje nivel 1</p>',
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: new Date('2026-05-05T12:00:00.000Z'),
  };

  const repository = {
    create: jest.fn(),
    customerExists: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    createWithResolvedRelations: jest.fn(),
  } as unknown as jest.Mocked<VehiclesRepository>;

  let service: VehiclesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new VehiclesService(repository);
  });

  it('creates a vehicle for an existing customer', async () => {
    repository.createWithResolvedRelations.mockResolvedValue(vehicleRecord as never);

    await expect(
      service.create({
        customerId: 'customer-1',
        brand: ' Mazda ',
        modelReference: ' CX5 ',
        plate: ' abc123 ',
        notes: ' <p>Blindaje nivel 1</p> ',
      }),
    ).resolves.toEqual(vehicleRecord);
  });

  it('creates a vehicle by resolving an existing customer and existing brand', async () => {
    repository.createWithResolvedRelations.mockResolvedValue({
      ...vehicleRecord,
      brandId: 'brand-mazda',
      brandRef: { id: 'brand-mazda', name: 'Mazda', normalizedName: 'mazda' },
    } as never);

    await expect(
      service.create({
        customerId: 'customer-1',
        brandId: 'brand-mazda',
        modelReference: ' CX5 ',
        plate: ' abc123 ',
      }),
    ).resolves.toMatchObject({
      id: 'vehicle-1',
      customerId: 'customer-1',
      brand: 'Mazda',
      brandId: 'brand-mazda',
      brandRef: { id: 'brand-mazda', name: 'Mazda' },
    });
    expect(repository.createWithResolvedRelations).toHaveBeenCalledWith({
      customerId: 'customer-1',
      brandId: 'brand-mazda',
      modelReference: ' CX5 ',
      plate: ' abc123 ',
    });
    expect(repository.customerExists).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a vehicle with inline customer data and reuses a brand by normalized name', async () => {
    repository.createWithResolvedRelations.mockResolvedValue({
      ...vehicleRecord,
      customerId: 'customer-inline',
      brandId: 'brand-bosch',
      brand: 'Bosch',
      brandRef: { id: 'brand-bosch', name: 'Bosch', normalizedName: 'bosch' },
      Customer: { id: 'customer-inline', name: 'Laura Perez' },
    } as never);

    await expect(
      service.create({
        customer: {
          name: ' Laura Perez ',
          phone: ' 3001112233 ',
          documentType: 'CEDULA' as never,
          documentNumber: ' 123 ',
        },
        brand: ' BoScH ',
        modelReference: 'BT-50',
        plate: 'xyz987',
      }),
    ).resolves.toMatchObject({
      customerId: 'customer-inline',
      brandId: 'brand-bosch',
      brand: 'Bosch',
    });
    expect(repository.createWithResolvedRelations).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: expect.objectContaining({ phone: ' 3001112233 ' }),
        brand: ' BoScH ',
      }),
    );
  });

  it('rejects vehicle creation when the parent customer is missing', async () => {
    repository.createWithResolvedRelations.mockRejectedValue(
      new NotFoundException('Customer missing-customer not found'),
    );

    await expect(
      service.create({
        customerId: 'missing-customer',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
      }),
    ).rejects.toThrow(
      new NotFoundException('Customer missing-customer not found'),
    );
  });

  it('maps duplicate vehicle plates to ConflictException', async () => {
    repository.createWithResolvedRelations.mockRejectedValue(
      new VehicleDuplicatePlateError(),
    );

    await expect(
      service.create({
        customerId: 'customer-1',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
      }),
    ).rejects.toThrow(new ConflictException('Vehicle plate already exists'));
  });

  it('returns a paginated vehicle list', async () => {
    repository.findMany.mockResolvedValue({
      items: [vehicleRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({ page: 1, limit: 10, search: 'mazda' }),
    ).resolves.toEqual({
      data: [vehicleRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns customer-scoped vehicle options', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'vehicle-1',
        customerId: 'customer-1',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
      },
    ] as never);

    await expect(
      service.findOptions({ limit: 10, customerId: 'customer-1' }),
    ).resolves.toEqual({
      data: [
        {
          id: 'vehicle-1',
          label: 'ABC123',
          description: 'Mazda CX5',
          context: {
            customerId: 'customer-1',
            brand: 'Mazda',
            modelReference: 'CX5',
          },
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('defaults vehicle options to active records and preserves explicit inactive requests', async () => {
    repository.findOptions.mockResolvedValue([]);

    await service.findOptions({ limit: 10, customerId: 'customer-1' });
    await service.findOptions({ limit: 10, isActive: false });

    expect(repository.findOptions.mock.calls[0]?.[0]).toEqual({
      limit: 10,
      customerId: 'customer-1',
      isActive: true,
    });
    expect(repository.findOptions.mock.calls[1]?.[0]).toEqual({
      limit: 10,
      isActive: false,
    });
  });

  it('throws NotFoundException when the vehicle does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-vehicle')).rejects.toThrow(
      new NotFoundException('Vehicle missing-vehicle not found'),
    );
  });

  it('updates an existing vehicle without reassigning customer ownership', async () => {
    repository.findById.mockResolvedValue(vehicleRecord);
    repository.update.mockResolvedValue({
      ...vehicleRecord,
      modelReference: 'CX50',
      plate: 'XYZ987',
    });

    await expect(
      service.update('vehicle-1', {
        brand: ' Mazda ',
        modelReference: ' CX50 ',
        plate: ' xyz987 ',
        notes: ' <p>Actualizado</p> ',
      }),
    ).resolves.toEqual({
      ...vehicleRecord,
      modelReference: 'CX50',
      plate: 'XYZ987',
    });
  });

  it('maps duplicate vehicle plates during update to ConflictException', async () => {
    repository.findById.mockResolvedValue(vehicleRecord);
    repository.update.mockRejectedValue(new VehicleDuplicatePlateError());

    await expect(
      service.update('vehicle-1', { plate: 'ABC123' }),
    ).rejects.toThrow(new ConflictException('Vehicle plate already exists'));
  });

  it('quick-creates a vehicle with option-compatible response data', async () => {
    repository.createWithResolvedRelations.mockResolvedValue(vehicleRecord as never);

    await expect(
      service.quickCreate({
        customerId: 'customer-1',
        brand: 'Mazda',
        modelReference: 'CX5',
        plate: 'ABC123',
      }),
    ).resolves.toMatchObject({
      data: { id: 'vehicle-1', label: 'ABC123' },
      entity: vehicleRecord,
    });
  });
});
