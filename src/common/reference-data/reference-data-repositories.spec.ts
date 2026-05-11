import { ComponentTypesRepository } from '../../component-types/persistence/component-types.repository';
import { ComponentsRepository } from '../../components/persistence/components.repository';
import { CostCentersRepository } from '../../cost-centers/persistence/cost-centers.repository';
import { CustomersRepository } from '../../customers/persistence/customers.repository';
import {
  EmployeeType,
  InventoryCondition,
  InventoryItemType,
  SupplierType,
} from '../../../generated/prisma/enums';
import { EmployeesRepository } from '../../employees/persistence/employees.repository';
import { InventoryRepository } from '../../inventory/persistence/inventory.repository';
import { ServicesRepository } from '../../services/persistence/services.repository';
import { SuppliersRepository } from '../../suppliers/persistence/suppliers.repository';
import { VehiclesRepository } from '../../vehicles/persistence/vehicles.repository';

describe('reference-data repository option queries', () => {
  it('builds lightweight customer option queries', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new CustomersRepository({
      customer: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({
      limit: 10,
      search: '  ana  ',
      documentType: 'CEDULA',
    });

    expect(receivedArgs).toEqual({
      where: {
        documentType: 'CEDULA',
        OR: [
          { name: { contains: 'ana', mode: 'insensitive' } },
          { documentNumber: { contains: 'ana', mode: 'insensitive' } },
          { phone: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
        documentType: true,
        documentNumber: true,
        email: true,
      },
    });
  });

  it('builds customer-scoped vehicle option queries', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new VehiclesRepository({
      vehicle: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({
      limit: 10,
      customerId: 'customer-1',
      search: '  mazda  ',
    });

    expect(receivedArgs).toEqual({
      where: {
        customerId: 'customer-1',
        OR: [
          { plate: { contains: 'mazda', mode: 'insensitive' } },
          { brand: { contains: 'mazda', mode: 'insensitive' } },
          { modelReference: { contains: 'mazda', mode: 'insensitive' } },
        ],
      },
      orderBy: { plate: 'asc' },
      take: 10,
      select: {
        id: true,
        customerId: true,
        brand: true,
        modelReference: true,
        plate: true,
      },
    });
  });

  it('builds customer and vehicle filtered component option queries', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new ComponentsRepository({
      component: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({
      limit: 10,
      customerId: 'customer-1',
      vehicleId: 'vehicle-1',
      componentTypeId: 'component-type-1',
      search: '  bosch  ',
    });

    expect(receivedArgs).toEqual({
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
      take: 10,
      select: {
        id: true,
        customerId: true,
        vehicleId: true,
        brand: true,
        reference: true,
        identifier: true,
        componentType: { select: { id: true, name: true } },
      },
    });
  });

  it('defaults component type options to active records', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new ComponentTypesRepository({
      componentType: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({ limit: 10, search: '  iny  ' });

    expect(receivedArgs).toEqual({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'iny', mode: 'insensitive' } },
          { slug: { contains: 'iny', mode: 'insensitive' } },
          { description: { contains: 'iny', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  });

  it('defaults service options to active records', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new ServicesRepository({
      serviceCatalog: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({ limit: 10, search: '  diag  ' });

    expect(receivedArgs).toEqual({
      where: {
        isActive: true,
        OR: [
          { name: { contains: 'diag', mode: 'insensitive' } },
          { slug: { contains: 'diag', mode: 'insensitive' } },
          { description: { contains: 'diag', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
      },
    });
  });

  it('defaults supplier options to active records and keeps phone context lightweight', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new SuppliersRepository({
      supplier: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({
      limit: 10,
      search: '  repuestos  ',
      type: SupplierType.COMPANY,
    });

    expect(receivedArgs).toEqual({
      where: {
        isActive: true,
        type: SupplierType.COMPANY,
        OR: [
          { name: { contains: 'repuestos', mode: 'insensitive' } },
          { email: { contains: 'repuestos', mode: 'insensitive' } },
          { contactName: { contains: 'repuestos', mode: 'insensitive' } },
          { documentNumber: { contains: 'repuestos', mode: 'insensitive' } },
          {
            phones: {
              some: {
                phone: { contains: 'repuestos', mode: 'insensitive' },
              },
            },
          },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      include: {
        phones: { select: { phone: true, isPrimary: true } },
      },
    });
  });

  it('defaults inventory item options to active records without stock calculations', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new InventoryRepository({
      inventoryItem: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findItemOptions({
      limit: 10,
      search: '  filtro  ',
      itemType: InventoryItemType.STOCK_OWNED,
      condition: InventoryCondition.NEW,
    });

    expect(receivedArgs).toEqual({
      where: {
        isActive: true,
        itemType: InventoryItemType.STOCK_OWNED,
        condition: InventoryCondition.NEW,
        OR: [
          { name: { contains: 'filtro', mode: 'insensitive' } },
          { brand: { contains: 'filtro', mode: 'insensitive' } },
          { reference: { contains: 'filtro', mode: 'insensitive' } },
          { identifier: { contains: 'filtro', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        brand: true,
        reference: true,
        itemType: true,
        condition: true,
        isActive: true,
      },
    });
  });

  it('defaults employee options to active records with cost-center context', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new EmployeesRepository({
      employee: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({
      limit: 10,
      search: '  ana  ',
      type: EmployeeType.MECHANIC,
      costCenterId: 'cost-center-1',
    });

    expect(receivedArgs).toEqual({
      where: {
        type: EmployeeType.MECHANIC,
        isActive: true,
        costCenterId: 'cost-center-1',
        OR: [
          { name: { contains: 'ana', mode: 'insensitive' } },
          { phone: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      include: {
        CostCenter: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  });

  it('defaults cost-center options to active records', async () => {
    let receivedArgs: Record<string, unknown> | undefined;
    const repository = new CostCentersRepository({
      costCenter: {
        findMany: jest.fn((args) => {
          receivedArgs = args as Record<string, unknown>;
          return Promise.resolve([]);
        }),
      },
    } as never);

    await repository.findOptions({ limit: 10, search: '  gene  ' });

    expect(receivedArgs).toEqual({
      where: {
        isActive: true,
        OR: [
          { code: { contains: 'gene', mode: 'insensitive' } },
          { name: { contains: 'gene', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 10,
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
    });
  });
});
