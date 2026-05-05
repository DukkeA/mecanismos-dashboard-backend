import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComponentsRepository } from './persistence/components.repository';
import { ComponentsService } from './components.service';

describe('ComponentsService', () => {
  const componentRecord = {
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

  const repository = {
    create: jest.fn(),
    customerExists: jest.fn(),
    findVehicleOwnership: jest.fn(),
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ComponentsRepository>;

  let service: ComponentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ComponentsService(repository);
  });

  it('creates a component with an optional same-customer vehicle link', async () => {
    repository.customerExists.mockResolvedValue(true);
    repository.findVehicleOwnership.mockResolvedValue({
      id: 'vehicle-1',
      customerId: 'customer-1',
    });
    repository.create.mockResolvedValue(componentRecord);

    await expect(
      service.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        brand: ' Bosch ',
        reference: ' ALT-90A ',
        identifier: ' SER-100 ',
        notes: ' <p>Alternador reemplazado</p> ',
      }),
    ).resolves.toEqual(componentRecord);
  });

  it('creates a component without a vehicle link when vehicleId is omitted', async () => {
    repository.customerExists.mockResolvedValue(true);
    repository.create.mockResolvedValue({
      ...componentRecord,
      vehicleId: null,
      identifier: null,
    });

    await expect(
      service.create({
        customerId: 'customer-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).resolves.toMatchObject({
      id: 'component-1',
      customerId: 'customer-1',
      vehicleId: null,
    });
    expect(repository.findVehicleOwnership.mock.calls).toHaveLength(0);
  });

  it('rejects component creation when the parent customer is missing', async () => {
    repository.customerExists.mockResolvedValue(false);

    await expect(
      service.create({
        customerId: 'missing-customer',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).rejects.toThrow(
      new NotFoundException('Customer missing-customer not found'),
    );
  });

  it('rejects component creation when vehicle belongs to another customer', async () => {
    repository.customerExists.mockResolvedValue(true);
    repository.findVehicleOwnership.mockResolvedValue({
      id: 'vehicle-2',
      customerId: 'customer-2',
    });

    await expect(
      service.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-2',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );
  });

  it('returns a paginated component list', async () => {
    repository.findMany.mockResolvedValue({
      items: [componentRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        search: 'bosch',
      }),
    ).resolves.toEqual({
      data: [componentRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('throws NotFoundException when the component does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-component')).rejects.toThrow(
      new NotFoundException('Component missing-component not found'),
    );
  });

  it('updates an existing component by linking another vehicle from the same customer', async () => {
    repository.findById.mockResolvedValue(componentRecord);
    repository.findVehicleOwnership.mockResolvedValue({
      id: 'vehicle-3',
      customerId: 'customer-1',
    });
    repository.update.mockResolvedValue({
      ...componentRecord,
      vehicleId: 'vehicle-3',
      reference: 'ALT-120A',
    });

    await expect(
      service.update('component-1', {
        vehicleId: 'vehicle-3',
        reference: ' ALT-120A ',
      }),
    ).resolves.toEqual({
      ...componentRecord,
      vehicleId: 'vehicle-3',
      reference: 'ALT-120A',
    });
  });

  it('allows clearing the vehicle link on update', async () => {
    repository.findById.mockResolvedValue(componentRecord);
    repository.update.mockResolvedValue({
      ...componentRecord,
      vehicleId: null,
    });

    await expect(
      service.update('component-1', { vehicleId: null }),
    ).resolves.toMatchObject({
      id: 'component-1',
      vehicleId: null,
    });
    expect(repository.findVehicleOwnership.mock.calls).toHaveLength(0);
  });

  it('rejects component updates when vehicle belongs to another customer', async () => {
    repository.findById.mockResolvedValue(componentRecord);
    repository.findVehicleOwnership.mockResolvedValue({
      id: 'vehicle-2',
      customerId: 'customer-2',
    });

    await expect(
      service.update('component-1', { vehicleId: 'vehicle-2' }),
    ).rejects.toThrow(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );
  });
});
