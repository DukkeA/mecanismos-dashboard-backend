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
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<VehiclesRepository>;

  let service: VehiclesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VehiclesService(repository);
  });

  it('creates a vehicle for an existing customer', async () => {
    repository.customerExists.mockResolvedValue(true);
    repository.create.mockResolvedValue(vehicleRecord);

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

  it('rejects vehicle creation when the parent customer is missing', async () => {
    repository.customerExists.mockResolvedValue(false);

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
    repository.customerExists.mockResolvedValue(true);
    repository.create.mockRejectedValue(new VehicleDuplicatePlateError());

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
});
