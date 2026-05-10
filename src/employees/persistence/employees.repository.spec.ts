import { EmployeeType, PaymentMethod } from '../../../generated/prisma/enums';
import { EmployeesRepository } from './employees.repository';

describe('EmployeesRepository', () => {
  it('creates employees with normalized optional fields and a cost-center connect', async () => {
    const createdEmployee = {
      id: 'employee-1',
      name: 'Ana Torres',
      type: EmployeeType.MECHANIC,
      phone: '3001234567',
      baseSalaryMonthly: 2500000,
      costCenterId: 'cost-center-1',
      isActive: true,
      createdAt: new Date('2026-05-09T12:00:00.000Z'),
      updatedAt: new Date('2026-05-09T12:00:00.000Z'),
      CostCenter: {
        id: 'cost-center-1',
        code: 'TALLER',
        name: 'Taller',
        isActive: true,
      },
    };
    type CreateArgs = {
      data: {
        id: string;
        name: string;
        type: EmployeeType;
        phone: string | null;
        baseSalaryMonthly: number;
        CostCenter: { connect: { id: string } };
        isActive: boolean;
        updatedAt: Date;
      };
      include: { CostCenter: true };
    };

    let receivedCreateArgs: CreateArgs | undefined;

    const prisma = {
      employee: {
        create: jest.fn((args: CreateArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve(createdEmployee);
        }),
      },
    };

    const repository = new EmployeesRepository(prisma as never);

    await expect(
      repository.create({
        name: ' Ana Torres ',
        type: EmployeeType.MECHANIC,
        phone: ' 3001234567 ',
        baseSalaryMonthly: 2500000,
        costCenterId: ' cost-center-1 ',
      }),
    ).resolves.toEqual(createdEmployee);

    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.name).toBe('Ana Torres');
    expect(receivedCreateArgs?.data.phone).toBe('3001234567');
    expect(receivedCreateArgs?.data.CostCenter).toEqual({
      connect: { id: 'cost-center-1' },
    });
    expect(receivedCreateArgs?.data.isActive).toBe(true);
    expect(receivedCreateArgs?.include).toEqual({ CostCenter: true });
  });

  it('builds paginated filters for employee search, type, lifecycle, and cost center', async () => {
    type FindManyArgs = {
      where: Record<string, unknown>;
      include: { CostCenter: true };
      orderBy: { name: string };
      skip: number;
      take: number;
    };
    type CountArgs = { where: Record<string, unknown> };

    let receivedFindManyArgs: FindManyArgs | undefined;
    let receivedCountArgs: CountArgs | undefined;

    const prisma = {
      employee: {
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

    const repository = new EmployeesRepository(prisma as never);

    await repository.findMany({
      page: 2,
      limit: 5,
      search: '  ana  ',
      type: EmployeeType.MECHANIC,
      isActive: false,
      costCenterId: '  cost-center-1  ',
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        type: EmployeeType.MECHANIC,
        isActive: false,
        costCenterId: 'cost-center-1',
        OR: [
          { name: { contains: 'ana', mode: 'insensitive' } },
          { phone: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
      include: { CostCenter: true },
      orderBy: { name: 'asc' },
      skip: 5,
      take: 5,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        type: EmployeeType.MECHANIC,
        isActive: false,
        costCenterId: 'cost-center-1',
        OR: [
          { name: { contains: 'ana', mode: 'insensitive' } },
          { phone: { contains: 'ana', mode: 'insensitive' } },
        ],
      },
    });
  });

  it('finds a cost center by id for reference validation', async () => {
    type FindUniqueArgs = { where: { id: string } };
    let receivedFindUniqueArgs: FindUniqueArgs | undefined;

    const prisma = {
      costCenter: {
        findUnique: jest.fn((args: FindUniqueArgs) => {
          receivedFindUniqueArgs = args;

          return Promise.resolve({ id: 'cost-center-1' });
        }),
      },
    };

    const repository = new EmployeesRepository(prisma as never);

    await expect(
      repository.findCostCenterById('cost-center-1'),
    ).resolves.toEqual({
      id: 'cost-center-1',
    });
    expect(receivedFindUniqueArgs).toEqual({
      where: { id: 'cost-center-1' },
    });
  });

  it('updates trimmed values and persists deactivate operations', async () => {
    type UpdateArgs = {
      where: { id: string };
      data: Record<string, unknown>;
      include: { CostCenter: true };
    };

    let receivedUpdateArgs: UpdateArgs | undefined;

    const prisma = {
      employee: {
        update: jest.fn((args: UpdateArgs) => {
          receivedUpdateArgs = args;

          return Promise.resolve({ id: 'employee-1' });
        }),
      },
    };

    const repository = new EmployeesRepository(prisma as never);

    await repository.update('employee-1', {
      name: ' Ana Maria ',
      phone: ' 3009990000 ',
      isActive: false,
      costCenterId: ' cost-center-2 ',
    });

    expect(receivedUpdateArgs?.where).toEqual({ id: 'employee-1' });
    expect(receivedUpdateArgs?.data).toMatchObject({
      name: 'Ana Maria',
      phone: '3009990000',
      isActive: false,
      CostCenter: { connect: { id: 'cost-center-2' } },
    });
    expect(receivedUpdateArgs?.data.updatedAt).toEqual(expect.any(Date));
    expect(receivedUpdateArgs?.include).toEqual({ CostCenter: true });
  });

  it('lists cost-center reference options ordered by name', async () => {
    type FindManyArgs = {
      where: { isActive: true };
      select: { id: true; code: true; name: true; isActive: true };
      orderBy: { name: string };
    };
    let receivedFindManyArgs: FindManyArgs | undefined;

    const prisma = {
      costCenter: {
        findMany: jest.fn((args: FindManyArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
      },
    };

    const repository = new EmployeesRepository(prisma as never);

    await repository.listCostCenterOptions();

    expect(receivedFindManyArgs).toEqual({
      where: { isActive: true },
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  });

  it('creates employee bonus rows owned by the given employee id', async () => {
    type CreateBonusArgs = {
      data: {
        id: string;
        Employee: { connect: { id: string } };
        amount: number;
        description: string | null;
        paidAt: Date;
        paymentMethod: PaymentMethod | null;
        updatedAt: Date;
      };
    };

    let receivedCreateArgs: CreateBonusArgs | undefined;

    const prisma = {
      employeeBonus: {
        create: jest.fn((args: CreateBonusArgs) => {
          receivedCreateArgs = args;

          return Promise.resolve({ id: 'bonus-1' });
        }),
      },
    };

    const repository = new EmployeesRepository(prisma as never);

    await repository.createBonus('employee-1', {
      amount: 150000,
      description: '  Bono trimestral  ',
      paidAt: new Date('2026-05-10T09:00:00.000Z'),
      paymentMethod: PaymentMethod.TRANSFER,
    });

    expect(receivedCreateArgs?.data.id).toEqual(expect.any(String));
    expect(receivedCreateArgs?.data.Employee).toEqual({
      connect: { id: 'employee-1' },
    });
    expect(receivedCreateArgs?.data.description).toBe('Bono trimestral');
    expect(receivedCreateArgs?.data.paymentMethod).toBe(PaymentMethod.TRANSFER);
    expect(receivedCreateArgs?.data.updatedAt).toEqual(expect.any(Date));
  });

  it('lists employee bonuses with ownership, paidAt window, and descending chronology', async () => {
    type FindManyBonusArgs = {
      where: Record<string, unknown>;
      orderBy: { paidAt: 'desc' };
      skip: number;
      take: number;
    };
    type CountBonusArgs = { where: Record<string, unknown> };

    let receivedFindManyArgs: FindManyBonusArgs | undefined;
    let receivedCountArgs: CountBonusArgs | undefined;

    const prisma = {
      employeeBonus: {
        findMany: jest.fn((args: FindManyBonusArgs) => {
          receivedFindManyArgs = args;

          return Promise.resolve([]);
        }),
        count: jest.fn((args: CountBonusArgs) => {
          receivedCountArgs = args;

          return Promise.resolve(0);
        }),
      },
    };

    const repository = new EmployeesRepository(prisma as never);

    await repository.findBonusesByEmployeeId('employee-1', {
      page: 2,
      limit: 5,
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-31T23:59:59.000Z'),
    });

    expect(receivedFindManyArgs).toEqual({
      where: {
        employeeId: 'employee-1',
        paidAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
      },
      orderBy: { paidAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(receivedCountArgs).toEqual({
      where: {
        employeeId: 'employee-1',
        paidAt: {
          gte: new Date('2026-05-01T00:00:00.000Z'),
          lte: new Date('2026-05-31T23:59:59.000Z'),
        },
      },
    });
  });
});
