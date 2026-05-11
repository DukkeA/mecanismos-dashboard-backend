import { NotFoundException } from '@nestjs/common';
import { EmployeeType, PaymentMethod } from '../../generated/prisma/enums';
import { EmployeesService } from './employees.service';
import { EmployeesRepository } from './persistence/employees.repository';
import type {
  CostCenterOptionRecord,
  EmployeeRecord,
} from './persistence/employees.repository';

describe('EmployeesService', () => {
  const costCenterRecord: EmployeeRecord['CostCenter'] = {
    id: 'cost-center-1',
    code: 'TALLER',
    name: 'Taller',
    isActive: true,
    createdAt: new Date('2026-05-09T12:00:00.000Z'),
    updatedAt: new Date('2026-05-09T12:00:00.000Z'),
  };

  const employeeRecord: EmployeeRecord = {
    id: 'employee-1',
    name: 'Ana Torres',
    type: EmployeeType.MECHANIC,
    phone: '3001234567',
    baseSalaryMonthly: 2500000,
    costCenterId: 'cost-center-1',
    isActive: true,
    createdAt: new Date('2026-05-09T12:00:00.000Z'),
    updatedAt: new Date('2026-05-09T12:00:00.000Z'),
    CostCenter: costCenterRecord,
  };

  const costCenterOptionRecord: CostCenterOptionRecord = {
    id: 'cost-center-1',
    code: 'TALLER',
    name: 'Taller',
    isActive: true,
  };

  const employeeBonusRecord = {
    id: 'bonus-1',
    employeeId: 'employee-1',
    amount: 150000,
    description: 'Bono trimestral',
    paidAt: new Date('2026-05-10T09:00:00.000Z'),
    paymentMethod: PaymentMethod.TRANSFER,
    createdAt: new Date('2026-05-10T09:00:00.000Z'),
    updatedAt: new Date('2026-05-10T09:00:00.000Z'),
  };

  const repository = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOptions: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    createBonus: jest.fn(),
    findBonusesByEmployeeId: jest.fn(),
    findCostCenterById: jest.fn(),
    listCostCenterOptions: jest.fn(),
  } as unknown as jest.Mocked<EmployeesRepository>;

  let service: EmployeesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmployeesService(repository);
  });

  it('creates employees with trimmed fields and an existing cost-center reference', async () => {
    repository.findCostCenterById.mockResolvedValue(costCenterRecord);
    repository.create.mockResolvedValue(employeeRecord);

    await expect(
      service.create({
        name: '  Ana Torres  ',
        type: EmployeeType.MECHANIC,
        phone: '  3001234567  ',
        baseSalaryMonthly: 2500000,
        costCenterId: '  cost-center-1  ',
      }),
    ).resolves.toEqual(employeeRecord);

    expect(repository.create.mock.calls[0]).toEqual([
      {
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        phone: '3001234567',
        baseSalaryMonthly: 2500000,
        costCenterId: 'cost-center-1',
        isActive: undefined,
      },
    ]);
  });

  it('returns paginated employees with pragmatic filters', async () => {
    repository.findMany.mockResolvedValue({
      items: [employeeRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findAll({
        page: 1,
        limit: 10,
        search: 'ana',
        type: EmployeeType.MECHANIC,
        isActive: true,
      }),
    ).resolves.toEqual({
      data: [employeeRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('returns active employee options with cost-center context', async () => {
    repository.findOptions.mockResolvedValue([
      {
        id: 'employee-1',
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        phone: '3001234567',
        isActive: true,
        costCenterId: 'cost-center-1',
        CostCenter: { id: 'cost-center-1', code: 'TALLER', name: 'Taller' },
      },
    ] as never);

    await expect(service.findOptions({ limit: 10 })).resolves.toEqual({
      data: [
        {
          id: 'employee-1',
          label: 'Ana Torres',
          description: EmployeeType.MECHANIC,
          isActive: true,
          context: {
            type: EmployeeType.MECHANIC,
            phone: '3001234567',
            costCenterId: 'cost-center-1',
            costCenterCode: 'TALLER',
            costCenterName: 'Taller',
          },
        },
      ],
      meta: { limit: 10 },
    });
  });

  it('throws NotFoundException when the employee does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne('missing-employee')).rejects.toThrow(
      new NotFoundException('Employee missing-employee not found'),
    );
  });

  it('rejects create requests with an unknown cost center', async () => {
    repository.findCostCenterById.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        baseSalaryMonthly: 2500000,
        costCenterId: 'missing-cost-center',
      }),
    ).rejects.toThrow(
      new NotFoundException('Cost center missing-cost-center not found'),
    );

    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('updates employees and persists deactivate operations', async () => {
    repository.findById.mockResolvedValue(employeeRecord);
    repository.findCostCenterById.mockResolvedValue(costCenterRecord);
    repository.update.mockResolvedValue({
      ...employeeRecord,
      name: 'Ana Maria Torres',
      isActive: false,
    });

    await expect(
      service.update('employee-1', {
        name: '  Ana Maria Torres  ',
        isActive: false,
        costCenterId: '  cost-center-1  ',
      }),
    ).resolves.toMatchObject({
      id: 'employee-1',
      name: 'Ana Maria Torres',
      isActive: false,
    });

    expect(repository.update.mock.calls[0]).toEqual([
      'employee-1',
      {
        name: 'Ana Maria Torres',
        isActive: false,
        costCenterId: 'cost-center-1',
      },
    ]);
  });

  it('rejects updates with an unknown cost center', async () => {
    repository.findById.mockResolvedValue(employeeRecord);
    repository.findCostCenterById.mockResolvedValue(null);

    await expect(
      service.update('employee-1', {
        costCenterId: 'missing-cost-center',
      }),
    ).rejects.toThrow(
      new NotFoundException('Cost center missing-cost-center not found'),
    );

    expect(repository.update.mock.calls).toHaveLength(0);
  });

  it('returns read-only cost-center options for employee forms', async () => {
    repository.listCostCenterOptions.mockResolvedValue([
      costCenterOptionRecord,
    ] as never);

    await expect(service.listCostCenterOptions()).resolves.toEqual(
      [
        {
          data: [
            {
              id: 'cost-center-1',
              label: 'TALLER · Taller',
              description: 'Taller',
              isActive: true,
              context: { code: 'TALLER' },
            },
          ],
          meta: { limit: 10 },
        },
      ][0],
    );
  });

  it('creates employee bonuses only for existing employees and trims optional fields', async () => {
    repository.findById.mockResolvedValue(employeeRecord);
    repository.createBonus.mockResolvedValue(employeeBonusRecord);

    await expect(
      service.createBonus('employee-1', {
        amount: 150000,
        description: '  Bono trimestral  ',
        paidAt: new Date('2026-05-10T09:00:00.000Z'),
        paymentMethod: PaymentMethod.TRANSFER,
      }),
    ).resolves.toEqual(employeeBonusRecord);

    expect(repository.createBonus.mock.calls[0]).toEqual([
      'employee-1',
      {
        amount: 150000,
        description: 'Bono trimestral',
        paidAt: new Date('2026-05-10T09:00:00.000Z'),
        paymentMethod: PaymentMethod.TRANSFER,
      },
    ]);
  });

  it('lists employee bonuses with descending paidAt pagination meta', async () => {
    repository.findById.mockResolvedValue(employeeRecord);
    repository.findBonusesByEmployeeId.mockResolvedValue({
      items: [employeeBonusRecord],
      total: 1,
      page: 1,
      limit: 10,
    });

    await expect(
      service.findBonuses('employee-1', {
        page: 1,
        limit: 10,
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-31T23:59:59.000Z'),
      }),
    ).resolves.toEqual({
      data: [employeeBonusRecord],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    });

    expect(repository.findBonusesByEmployeeId.mock.calls[0]).toEqual([
      'employee-1',
      {
        page: 1,
        limit: 10,
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-31T23:59:59.000Z'),
      },
    ]);
  });

  it('rejects bonus operations when the employee does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.createBonus('missing-employee', {
        amount: 150000,
        paidAt: new Date('2026-05-10T09:00:00.000Z'),
      }),
    ).rejects.toThrow(
      new NotFoundException('Employee missing-employee not found'),
    );

    await expect(
      service.findBonuses('missing-employee', {
        page: 1,
        limit: 10,
      }),
    ).rejects.toThrow(
      new NotFoundException('Employee missing-employee not found'),
    );

    expect(repository.createBonus.mock.calls).toHaveLength(0);
    expect(repository.findBonusesByEmployeeId.mock.calls).toHaveLength(0);
  });

  it('quick-creates employees with salary default 0 and incomplete-profile metadata', async () => {
    repository.findCostCenterById.mockResolvedValue(costCenterRecord);
    repository.create.mockResolvedValue({
      ...employeeRecord,
      baseSalaryMonthly: 0,
    });

    await expect(
      service.quickCreate({
        name: 'Ana Torres',
        type: EmployeeType.MECHANIC,
        costCenterId: 'cost-center-1',
      }),
    ).resolves.toMatchObject({
      data: { id: 'employee-1', label: 'Ana Torres' },
      meta: { incompleteProfile: true },
    });
  });
});
