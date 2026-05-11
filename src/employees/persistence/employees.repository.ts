import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CostCenter,
  Employee,
  EmployeeBonus,
  EmployeeType,
  PaymentMethod,
  Prisma,
} from '../../../generated/prisma/client';

export const EMPLOYEES_PRISMA_CLIENT = Symbol('EMPLOYEES_PRISMA_CLIENT');

export type EmployeeRecord = Employee & {
  CostCenter: CostCenter | null;
};

export type CostCenterOptionRecord = Pick<
  CostCenter,
  'id' | 'code' | 'name' | 'isActive'
>;

export type EmployeeOptionRecord = Pick<
  Employee,
  'id' | 'name' | 'type' | 'phone' | 'isActive' | 'costCenterId'
> & {
  CostCenter: Pick<CostCenter, 'id' | 'code' | 'name'> | null;
};

export type EmployeeBonusRecord = EmployeeBonus;

export type CreateEmployeeRecordInput = {
  name: string;
  type: EmployeeType;
  phone?: string;
  baseSalaryMonthly: number;
  costCenterId?: string;
  isActive?: boolean;
};

export type UpdateEmployeeRecordInput = Partial<CreateEmployeeRecordInput>;

export type CreateEmployeeBonusRecordInput = {
  amount: number;
  description?: string;
  paidAt: Date;
  paymentMethod?: PaymentMethod;
};

export type ListEmployeesQuery = {
  page: number;
  limit: number;
  search?: string;
  type?: EmployeeType;
  isActive?: boolean;
  costCenterId?: string;
};

export type ListEmployeeBonusesQuery = {
  page: number;
  limit: number;
  from?: Date;
  to?: Date;
};

export type ListEmployeeOptionsQuery = {
  limit: number;
  search?: string;
  type?: EmployeeType;
  isActive?: boolean;
  costCenterId?: string;
};

type EmployeeWhereInput = Prisma.EmployeeWhereInput;
type EmployeeBonusWhereInput = Prisma.EmployeeBonusWhereInput;

type EmployeesPrismaClient = {
  employee: {
    create(args: {
      data: Record<string, unknown>;
      include: { CostCenter: true };
    }): Promise<EmployeeRecord>;
    findMany(args: {
      where: EmployeeWhereInput;
      include: { CostCenter: true };
      orderBy: { name: 'asc' };
      skip: number;
      take: number;
    }): Promise<EmployeeRecord[]>;
    count(args: { where: EmployeeWhereInput }): Promise<number>;
    findUnique(args: {
      where: { id: string };
      include: { CostCenter: true };
    }): Promise<EmployeeRecord | null>;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
      include: { CostCenter: true };
    }): Promise<EmployeeRecord>;
  };
  employeeBonus: {
    create(args: {
      data: Record<string, unknown>;
    }): Promise<EmployeeBonusRecord>;
    findMany(args: {
      where: EmployeeBonusWhereInput;
      orderBy: { paidAt: 'desc' };
      skip: number;
      take: number;
    }): Promise<EmployeeBonusRecord[]>;
    count(args: { where: EmployeeBonusWhereInput }): Promise<number>;
  };
  costCenter: {
    findUnique(args: { where: { id: string } }): Promise<CostCenter | null>;
    findMany(args: {
      where: { isActive: true };
      select: { id: true; code: true; name: true; isActive: true };
      orderBy: { name: 'asc' };
    }): Promise<CostCenterOptionRecord[]>;
  };
};

@Injectable()
export class EmployeesRepository {
  constructor(
    @Inject(EMPLOYEES_PRISMA_CLIENT)
    private readonly prisma: EmployeesPrismaClient,
  ) {}

  create(input: CreateEmployeeRecordInput) {
    const now = new Date();

    return this.prisma.employee.create({
      data: {
        id: randomUUID(),
        name: input.name.trim(),
        type: input.type,
        phone: normalizeOptionalString(input.phone),
        baseSalaryMonthly: input.baseSalaryMonthly,
        ...connectCostCenter(input.costCenterId),
        isActive: input.isActive ?? true,
        updatedAt: now,
      },
      include: { CostCenter: true },
    });
  }

  async findMany(query: ListEmployeesQuery) {
    const where = buildEmployeeWhere(query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        include: { CostCenter: true },
        orderBy: { name: 'asc' },
        skip,
        take: query.limit,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  findById(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: { CostCenter: true },
    });
  }

  async findOptions(query: ListEmployeeOptionsQuery) {
    const prisma = this.prisma as unknown as {
      employee: {
        findMany(args: {
          where: EmployeeWhereInput;
          orderBy: { name: 'asc' };
          take: number;
          include: {
            CostCenter: { select: { id: true; code: true; name: true } };
          };
        }): Promise<EmployeeOptionRecord[]>;
      };
    };

    return prisma.employee.findMany({
      where: buildEmployeeWhere({
        ...query,
        page: 1,
        isActive: query.isActive ?? true,
      }),
      orderBy: { name: 'asc' },
      take: query.limit,
      include: {
        CostCenter: {
          select: { id: true, code: true, name: true },
        },
      },
    });
  }

  createBonus(employeeId: string, input: CreateEmployeeBonusRecordInput) {
    const now = new Date();

    return this.prisma.employeeBonus.create({
      data: {
        id: randomUUID(),
        Employee: { connect: { id: employeeId } },
        amount: input.amount,
        description: normalizeOptionalString(input.description),
        paidAt: input.paidAt,
        paymentMethod: input.paymentMethod ?? null,
        updatedAt: now,
      },
    });
  }

  async findBonusesByEmployeeId(
    employeeId: string,
    query: ListEmployeeBonusesQuery,
  ) {
    const where = buildEmployeeBonusWhere(employeeId, query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      this.prisma.employeeBonus.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.employeeBonus.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  update(id: string, input: UpdateEmployeeRecordInput) {
    const now = new Date();

    return this.prisma.employee.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.phone !== undefined
          ? { phone: normalizeOptionalString(input.phone) }
          : {}),
        ...(input.baseSalaryMonthly !== undefined
          ? { baseSalaryMonthly: input.baseSalaryMonthly }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.costCenterId !== undefined
          ? connectCostCenter(input.costCenterId)
          : {}),
        updatedAt: now,
      },
      include: { CostCenter: true },
    });
  }

  findCostCenterById(id: string) {
    return this.prisma.costCenter.findUnique({
      where: { id },
    });
  }

  listCostCenterOptions() {
    return this.prisma.costCenter.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

function buildEmployeeWhere(query: ListEmployeesQuery): EmployeeWhereInput {
  const search = query.search?.trim();

  return {
    ...(query.type !== undefined ? { type: query.type } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    ...(query.costCenterId ? { costCenterId: query.costCenterId.trim() } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
}

function buildEmployeeBonusWhere(
  employeeId: string,
  query: ListEmployeeBonusesQuery,
): EmployeeBonusWhereInput {
  return {
    employeeId,
    ...buildBonusPaidAtWindow(query),
  };
}

function connectCostCenter(costCenterId?: string) {
  return costCenterId
    ? { CostCenter: { connect: { id: costCenterId.trim() } } }
    : {};
}

function buildBonusPaidAtWindow(query: ListEmployeeBonusesQuery) {
  return query.from || query.to
    ? {
        paidAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.to ? { lte: query.to } : {}),
        },
      }
    : {};
}

function normalizeOptionalString(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
