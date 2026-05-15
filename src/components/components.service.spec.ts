import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  ComponentInlineVehicleDuplicatePlateError,
  ComponentsRepository,
} from './persistence/components.repository';
import { ComponentsService } from './components.service';

describe('ComponentsService', () => {
  const componentRecord = {
    id: 'component-1',
    customerId: 'customer-1',
    vehicleId: 'vehicle-1',
    componentTypeId: 'component-type-1',
    brand: 'Bosch',
    reference: 'ALT-90A',
    identifier: 'SER-100',
    notes: '<p>Alternador reemplazado</p>',
    createdAt: new Date('2026-05-05T12:00:00.000Z'),
    updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    componentType: {
      id: 'component-type-1',
      name: 'Inyector',
      slug: 'inyector',
      description: null,
      isActive: true,
      createdAt: new Date('2026-05-05T12:00:00.000Z'),
      updatedAt: new Date('2026-05-05T12:00:00.000Z'),
    },
  };

  const repository = {
    create: jest.fn(),
    customerExists: jest.fn(),
    componentTypeExists: jest.fn(),
    findVehicleOwnership: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    createWithResolvedRelations: jest.fn(),
  } as unknown as jest.Mocked<ComponentsRepository>;

  let service: ComponentsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ComponentsService(repository);
  });

  it('creates a component with an optional same-customer vehicle link', async () => {
    repository.createWithResolvedRelations.mockResolvedValue(componentRecord as never);

    await expect(
      service.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentTypeId: 'component-type-1',
        brand: ' Bosch ',
        reference: ' ALT-90A ',
        identifier: ' SER-100 ',
        notes: ' <p>Alternador reemplazado</p> ',
      }),
    ).resolves.toEqual(componentRecord);
  });

  it('creates a component by resolving existing customer, component type, and brand ids', async () => {
    repository.createWithResolvedRelations.mockResolvedValue({
      ...componentRecord,
      brandId: 'brand-bosch',
      brandRef: { id: 'brand-bosch', name: 'Bosch', normalizedName: 'bosch' },
    } as never);

    await expect(
      service.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentTypeId: 'component-type-1',
        brandId: 'brand-bosch',
        reference: ' ALT-90A ',
      }),
    ).resolves.toMatchObject({
      id: 'component-1',
      brandId: 'brand-bosch',
      brandRef: { id: 'brand-bosch', name: 'Bosch' },
    });
    expect(repository.createWithResolvedRelations).toHaveBeenCalledWith({
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentTypeId: 'component-type-1',
      brandId: 'brand-bosch',
      reference: ' ALT-90A ',
    });
    expect(repository.customerExists).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates a component with inline customer, component type, brand, and vehicle data', async () => {
    repository.createWithResolvedRelations.mockResolvedValue({
      ...componentRecord,
      customerId: 'customer-inline',
      vehicleId: 'vehicle-inline',
      componentTypeId: 'component-type-inline',
      brandId: 'brand-bosch',
      brand: 'Bosch',
      brandRef: { id: 'brand-bosch', name: 'Bosch', normalizedName: 'bosch' },
    } as never);

    await expect(
      service.create({
        customer: {
          name: 'Laura Perez',
          phone: '3001112233',
          documentType: 'CEDULA' as never,
          documentNumber: '123',
        },
        componentType: { name: 'Alternador' },
        brand: ' BoScH ',
        reference: 'ALT-90A',
        vehicle: {
          brand: ' Mazda ',
          modelReference: 'BT-50',
          plate: 'xyz987',
        },
      }),
    ).resolves.toMatchObject({
      customerId: 'customer-inline',
      vehicleId: 'vehicle-inline',
      componentTypeId: 'component-type-inline',
      brandId: 'brand-bosch',
    });
    expect(repository.createWithResolvedRelations).toHaveBeenCalledWith(
      expect.objectContaining({
        brand: ' BoScH ',
        componentType: { name: 'Alternador' },
        vehicle: expect.objectContaining({ plate: 'xyz987' }),
      }),
    );
  });

  it('creates a component without a vehicle link when vehicleId is omitted', async () => {
    repository.createWithResolvedRelations.mockResolvedValue({
      ...componentRecord,
      vehicleId: null,
      identifier: null,
    } as never);

    await expect(
      service.create({
        customerId: 'customer-1',
        componentTypeId: 'component-type-1',
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
    repository.createWithResolvedRelations.mockRejectedValue(
      new NotFoundException('Customer missing-customer not found'),
    );

    await expect(
      service.create({
        customerId: 'missing-customer',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).rejects.toThrow(
      new NotFoundException('Customer missing-customer not found'),
    );
  });

  it('rejects component creation when vehicle belongs to another customer', async () => {
    repository.createWithResolvedRelations.mockRejectedValue(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );

    await expect(
      service.create({
        customerId: 'customer-1',
        vehicleId: 'vehicle-2',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'Vehicle vehicle-2 does not belong to customer customer-1',
      ),
    );
  });

  it('maps duplicate inline vehicle plates to ConflictException', async () => {
    repository.createWithResolvedRelations.mockRejectedValue(
      new ComponentInlineVehicleDuplicatePlateError(),
    );

    await expect(
      service.create({
        customer: {
          name: 'Laura Perez',
          phone: '3001112233',
          documentType: 'CEDULA' as never,
          documentNumber: '123',
        },
        componentType: { name: 'Alternador' },
        brand: 'Bosch',
        reference: 'ALT-90A',
        vehicle: {
          brand: 'Mazda',
          modelReference: 'BT-50',
          plate: 'ABC123',
        },
      }),
    ).rejects.toThrow(new ConflictException('Vehicle plate already exists'));
  });

  it('rejects component creation when the component type does not exist', async () => {
    repository.createWithResolvedRelations.mockRejectedValue(
      new NotFoundException('Component type missing-component-type not found'),
    );

    await expect(
      service.create({
        customerId: 'customer-1',
        componentTypeId: 'missing-component-type',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).rejects.toThrow(
      new NotFoundException('Component type missing-component-type not found'),
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
        componentTypeId: 'component-type-1',
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

  it('returns component options with ownership context', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'component-1',
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
        identifier: 'SER-100',
        componentType: { id: 'component-type-1', name: 'Inyector' },
      },
    ] as never);

    await expect(
      service.findOptions({ limit: 10, customerId: 'customer-1' }),
    ).resolves.toEqual({
      data: [
        {
          id: 'component-1',
          label: 'SER-100',
          description: 'Bosch · ALT-90A',
          context: {
            customerId: 'customer-1',
            vehicleId: 'vehicle-1',
            componentTypeId: 'component-type-1',
            componentTypeName: 'Inyector',
          },
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('defaults component options to active records and preserves explicit inactive requests', async () => {
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

  it('updates an existing component after validating the new component type', async () => {
    repository.findById.mockResolvedValue(componentRecord);
    repository.componentTypeExists.mockResolvedValue(true);
    repository.update.mockResolvedValue({
      ...componentRecord,
      componentTypeId: 'component-type-2',
    });

    await expect(
      service.update('component-1', { componentTypeId: 'component-type-2' }),
    ).resolves.toMatchObject({
      id: 'component-1',
      componentTypeId: 'component-type-2',
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

  it('quick-creates a component with option-compatible response data', async () => {
    repository.createWithResolvedRelations.mockResolvedValue(componentRecord as never);

    await expect(
      service.quickCreate({
        customerId: 'customer-1',
        vehicleId: 'vehicle-1',
        componentTypeId: 'component-type-1',
        brand: 'Bosch',
        reference: 'ALT-90A',
      }),
    ).resolves.toMatchObject({
      data: { id: 'component-1', label: 'SER-100' },
      entity: componentRecord,
    });
  });
});
