import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { buildPaginationMeta } from '../common/pagination/pagination-meta';
import type { GenerateEmployeeMonthlyPayrollDto } from './dto/generate-employee-monthly-payroll.dto';
import type { ListEmployeeMonthlyPayrollQueryDto } from './dto/list-employee-monthly-payroll-query.dto';
import { EmployeeMonthlyPayrollRepository } from './employee-monthly-payroll.repository';

@Injectable()
export class EmployeeMonthlyPayrollService {
  constructor(
    private readonly employeeMonthlyPayrollRepository: EmployeeMonthlyPayrollRepository,
  ) {}

  async findAll(query: ListEmployeeMonthlyPayrollQueryDto) {
    const result = await this.employeeMonthlyPayrollRepository.findMany({
      page: query.page,
      limit: query.limit,
      year: query.year,
      status: query.status,
    });

    return {
      data: result.items,
      meta: buildPaginationMeta(result),
    };
  }

  async findOne(id: string) {
    const payroll = await this.employeeMonthlyPayrollRepository.findById(id);

    if (!payroll) {
      throw new NotFoundException(`Employee monthly payroll ${id} not found`);
    }

    return payroll;
  }

  async generate(dto: GenerateEmployeeMonthlyPayrollDto) {
    try {
      return await this.employeeMonthlyPayrollRepository.generateDraft({
        year: dto.year,
        month: dto.month,
        window: buildPayrollUtcMonthWindow(dto.year, dto.month),
      });
    } catch (error) {
      throw mapPayrollMutationError(error);
    }
  }

  async finalize(id: string) {
    try {
      const payroll =
        await this.employeeMonthlyPayrollRepository.finalizeDraft(id);

      if (!payroll) {
        throw new NotFoundException(`Employee monthly payroll ${id} not found`);
      }

      return payroll;
    } catch (error) {
      throw mapPayrollMutationError(error);
    }
  }
}

export function buildPayrollUtcMonthWindow(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function calculatePayrollTotals(
  lines: Array<{
    baseSalaryMonthlySnapshot: number;
    bonusTotal: number;
    totalPay: number;
  }>,
) {
  return lines.reduce(
    (totals, line) => ({
      salaryTotal: totals.salaryTotal + line.baseSalaryMonthlySnapshot,
      bonusTotal: totals.bonusTotal + line.bonusTotal,
      grandTotal: totals.grandTotal + line.totalPay,
    }),
    { salaryTotal: 0, bonusTotal: 0, grandTotal: 0 },
  );
}

function mapPayrollMutationError(error: unknown) {
  if (
    error instanceof Error &&
    error.name === 'EmployeeMonthlyPayrollFinalizedConflict'
  ) {
    return new ConflictException(error.message);
  }

  return error;
}
