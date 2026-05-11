import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ROLES_KEY } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { EmployeeMonthlyPayrollController } from './employee-monthly-payroll.controller';
import { EmployeeMonthlyPayrollModule } from './employee-monthly-payroll.module';
import { EmployeeMonthlyPayrollService } from './employee-monthly-payroll.service';
import { GenerateEmployeeMonthlyPayrollDto } from './dto/generate-employee-monthly-payroll.dto';
import { ListEmployeeMonthlyPayrollQueryDto } from './dto/list-employee-monthly-payroll-query.dto';
import { EmployeeMonthlyPayrollDetailResponseDto } from './dto/employee-monthly-payroll-response.dto';

type ApiResponseMetadata = Record<string, { type?: unknown }>;

describe('EmployeeMonthlyPayrollController', () => {
  const service = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    generate: jest.fn(),
    finalize: jest.fn(),
  } as unknown as jest.Mocked<EmployeeMonthlyPayrollService>;

  let controller: EmployeeMonthlyPayrollController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EmployeeMonthlyPayrollController(service);
  });

  it('validates generate/list DTOs and registers protected payroll routes with admin-only mutations', async () => {
    const validGenerateDto = plainToInstance(GenerateEmployeeMonthlyPayrollDto, {
      year: 2026,
      month: 5,
    });
    const invalidGenerateDto = plainToInstance(GenerateEmployeeMonthlyPayrollDto, {
      year: 199,
      month: 13,
    });
    const validListDto = plainToInstance(ListEmployeeMonthlyPayrollQueryDto, {
      page: '2',
      limit: '5',
      year: '2026',
      status: 'FINALIZED',
    });

    await expect(validate(validGenerateDto)).resolves.toHaveLength(0);
    await expect(validate(validListDto)).resolves.toHaveLength(0);
    await expect(validate(invalidGenerateDto)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'year' }),
        expect.objectContaining({ property: 'month' }),
      ]),
    );

    service.findAll.mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 1 } } as never);
    service.findOne.mockResolvedValue({ id: 'payroll-1', lines: [] } as never);
    service.generate.mockResolvedValue({ id: 'payroll-1', status: 'DRAFT' } as never);
    service.finalize.mockResolvedValue({ id: 'payroll-1', status: 'FINALIZED' } as never);

    await expect(controller.findAll(validListDto)).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });
    await expect(controller.findOne('payroll-1')).resolves.toEqual({ id: 'payroll-1', lines: [] });
    await expect(controller.generate(validGenerateDto)).resolves.toEqual({ id: 'payroll-1', status: 'DRAFT' });
    await expect(controller.finalize('payroll-1')).resolves.toEqual({ id: 'payroll-1', status: 'FINALIZED' });

    expect(Reflect.getMetadata(PATH_METADATA, EmployeeMonthlyPayrollController)).toBe('employee-monthly-payroll');
    expect(Reflect.getMetadata(ROLES_KEY, EmployeeMonthlyPayrollController)).toEqual(['ADMIN', 'SALES']);
    expect(Reflect.getMetadata(GUARDS_METADATA, EmployeeMonthlyPayrollController)).toEqual([JwtAuthGuard, RolesGuard]);

    const listHandler = getControllerMethod('findAll');
    const detailHandler = getControllerMethod('findOne');
    const generateHandler = getControllerMethod('generate');
    const finalizeHandler = getControllerMethod('finalize');

    expect(Reflect.getMetadata(METHOD_METADATA, listHandler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, detailHandler)).toBe(':id');
    expect(Reflect.getMetadata(METHOD_METADATA, detailHandler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, generateHandler)).toBe('generate');
    expect(Reflect.getMetadata(METHOD_METADATA, generateHandler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(ROLES_KEY, generateHandler)).toEqual(['ADMIN']);
    expect(Reflect.getMetadata(PATH_METADATA, finalizeHandler)).toBe(':id/finalize');
    expect(Reflect.getMetadata(METHOD_METADATA, finalizeHandler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(ROLES_KEY, finalizeHandler)).toEqual(['ADMIN']);

    const detailApiResponseMetadata = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      detailHandler,
    ) as ApiResponseMetadata | undefined;

    expect(detailApiResponseMetadata?.['200']).toEqual(
      expect.objectContaining({
        type: EmployeeMonthlyPayrollDetailResponseDto,
      }),
    );

    expect(service.generate.mock.calls).toEqual([[validGenerateDto]]);
    expect(service.finalize.mock.calls).toEqual([['payroll-1']]);
    expect(EmployeeMonthlyPayrollModule).toBeDefined();
  });
});

function getControllerMethod(
  methodName: keyof EmployeeMonthlyPayrollController,
): object {
  const descriptor = Object.getOwnPropertyDescriptor(
    EmployeeMonthlyPayrollController.prototype,
    methodName,
  );

  expect(descriptor?.value).toBeDefined();

  return descriptor?.value as object;
}
