import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import {
  buildOptionsResponse,
  buildQuickCreateResponse,
  type ReferenceOption,
} from '../common/reference-data';
import type { CreateEmployeeBonusDto } from './dto/create-employee-bonus.dto';
import type { EmployeeOptionsQueryDto } from './dto/employee-options-query.dto';
import type { ListEmployeeBonusesQueryDto } from './dto/list-employee-bonuses-query.dto';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import type { QuickCreateEmployeeDto } from './dto/quick-create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';
import {
  type CostCenterOptionRecord,
  EmployeesRepository,
} from './persistence/employees.repository';

@Injectable()
export class EmployeesService {
  constructor(private readonly employeesRepository: EmployeesRepository) {}

  async create(createEmployeeDto: CreateEmployeeDto) {
    await this.ensureCostCenterExists(createEmployeeDto.costCenterId);

    return this.employeesRepository.create(
      mapCreateEmployeeInput(createEmployeeDto),
    );
  }

  async findAll(query: ListEmployeesQueryDto) {
    return buildPaginatedResponse(
      await this.employeesRepository.findMany(query),
    );
  }

  async findOptions(query: EmployeeOptionsQueryDto) {
    const options = await this.employeesRepository.findOptions(query);

    return buildOptionsResponse(options.map(mapEmployeeOption), query.limit);
  }

  async findOne(id: string) {
    return this.requireEmployee(id);
  }

  async update(id: string, updateEmployeeDto: UpdateEmployeeDto) {
    await this.requireEmployee(id);
    await this.ensureCostCenterExists(updateEmployeeDto.costCenterId);

    return this.employeesRepository.update(
      id,
      mapUpdateEmployeeInput(updateEmployeeDto),
    );
  }

  async listCostCenterOptions() {
    return buildOptionsResponse(
      (await this.employeesRepository.listCostCenterOptions()).map(
        mapCostCenterOption,
      ),
      10,
    );
  }

  async createBonus(
    employeeId: string,
    createEmployeeBonusDto: CreateEmployeeBonusDto,
  ) {
    await this.requireEmployee(employeeId);

    return this.employeesRepository.createBonus(
      employeeId,
      mapCreateBonusInput(createEmployeeBonusDto),
    );
  }

  async findBonuses(employeeId: string, query: ListEmployeeBonusesQueryDto) {
    await this.requireEmployee(employeeId);

    return buildPaginatedResponse(
      await this.employeesRepository.findBonusesByEmployeeId(employeeId, query),
    );
  }

  async quickCreate(createEmployeeDto: QuickCreateEmployeeDto) {
    const employee = await this.create({
      ...createEmployeeDto,
      baseSalaryMonthly: createEmployeeDto.baseSalaryMonthly ?? 0,
    });

    return buildQuickCreateResponse(mapEmployeeOption(employee), employee, {
      incompleteProfile: createEmployeeDto.baseSalaryMonthly === undefined,
    });
  }

  private async ensureCostCenterExists(costCenterId?: string) {
    if (!costCenterId) {
      return;
    }

    const costCenter = await this.employeesRepository.findCostCenterById(
      costCenterId.trim(),
    );

    if (!costCenter) {
      throw new NotFoundException(
        `Cost center ${costCenterId.trim()} not found`,
      );
    }
  }

  private async requireEmployee(id: string) {
    const employee = await this.employeesRepository.findById(id);

    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    return employee;
  }
}

function buildPaginatedResponse<T>(result: {
  items: T[];
  page: number;
  limit: number;
  total: number;
}) {
  return {
    data: result.items,
    meta: buildPaginationMeta(result),
  };
}

function mapCreateEmployeeInput(createEmployeeDto: CreateEmployeeDto) {
  return {
    name: createEmployeeDto.name.trim(),
    type: createEmployeeDto.type,
    phone: createEmployeeDto.phone?.trim(),
    baseSalaryMonthly: createEmployeeDto.baseSalaryMonthly,
    costCenterId: createEmployeeDto.costCenterId?.trim(),
    isActive: createEmployeeDto.isActive,
  };
}

function mapUpdateEmployeeInput(updateEmployeeDto: UpdateEmployeeDto) {
  return {
    ...(updateEmployeeDto.name !== undefined
      ? { name: updateEmployeeDto.name.trim() }
      : {}),
    ...(updateEmployeeDto.type !== undefined
      ? { type: updateEmployeeDto.type }
      : {}),
    ...(updateEmployeeDto.phone !== undefined
      ? { phone: updateEmployeeDto.phone.trim() }
      : {}),
    ...(updateEmployeeDto.baseSalaryMonthly !== undefined
      ? { baseSalaryMonthly: updateEmployeeDto.baseSalaryMonthly }
      : {}),
    ...(updateEmployeeDto.costCenterId !== undefined
      ? { costCenterId: updateEmployeeDto.costCenterId.trim() }
      : {}),
    ...(updateEmployeeDto.isActive !== undefined
      ? { isActive: updateEmployeeDto.isActive }
      : {}),
  };
}

function mapCreateBonusInput(createEmployeeBonusDto: CreateEmployeeBonusDto) {
  return {
    amount: createEmployeeBonusDto.amount,
    description: createEmployeeBonusDto.description?.trim(),
    paidAt: createEmployeeBonusDto.paidAt,
    paymentMethod: createEmployeeBonusDto.paymentMethod,
  };
}

function mapEmployeeOption(employee: {
  id: string;
  name: string;
  type: string;
  phone?: string | null;
  isActive: boolean;
  costCenterId?: string | null;
  CostCenter?: { id: string; code: string; name: string } | null;
}): ReferenceOption {
  return {
    id: employee.id,
    label: employee.name,
    description: employee.type,
    isActive: employee.isActive,
    context: {
      type: employee.type,
      phone: employee.phone ?? null,
      costCenterId: employee.costCenterId ?? null,
      costCenterCode: employee.CostCenter?.code ?? null,
      costCenterName: employee.CostCenter?.name ?? null,
    },
  };
}

function mapCostCenterOption(
  costCenter: CostCenterOptionRecord,
): ReferenceOption {
  return {
    id: costCenter.id,
    label: `${costCenter.code} · ${costCenter.name}`,
    description: costCenter.name,
    isActive: costCenter.isActive,
    context: {
      code: costCenter.code,
    },
  };
}
