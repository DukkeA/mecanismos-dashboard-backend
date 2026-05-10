import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { MODULE_METADATA } from '@nestjs/common/constants';
jest.mock('../prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ROLES_KEY } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AppModule } from '../app.module';
import { CreateEmployeeBonusDto } from './dto/create-employee-bonus.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeeBonusesQueryDto } from './dto/list-employee-bonuses-query.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesController } from './employees.controller';
import { EmployeesModule } from './employees.module';
import { EmployeesService } from './employees.service';

describe('EmployeesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    listCostCenterOptions: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createBonus: jest.fn(),
    findBonuses: jest.fn(),
  } as unknown as jest.Mocked<EmployeesService>;

  let controller: EmployeesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EmployeesController(service);
  });

  it('registers employee routes with ADMIN and SALES guards plus app wiring', async () => {
    const createDto = {} as CreateEmployeeDto;
    const listDto = {} as ListEmployeesQueryDto;
    const updateDto = {} as UpdateEmployeeDto;
    const createBonusDto = {} as CreateEmployeeBonusDto;
    const listBonusesDto = {} as ListEmployeeBonusesQueryDto;

    service.create.mockResolvedValue({ id: 'employee-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.listCostCenterOptions.mockResolvedValue([{ id: 'cc-1' }] as never);
    service.findOne.mockResolvedValue({ id: 'employee-1' } as never);
    service.update.mockResolvedValue({ id: 'employee-1' } as never);
    service.createBonus.mockResolvedValue({ id: 'bonus-1' } as never);
    service.findBonuses.mockResolvedValue({ data: [], meta: {} } as never);

    await expect(controller.create(createDto)).resolves.toEqual({
      id: 'employee-1',
    });
    await expect(controller.findAll(listDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.listCostCenterOptions()).resolves.toEqual([
      { id: 'cc-1' },
    ]);
    await expect(controller.findOne('employee-1')).resolves.toEqual({
      id: 'employee-1',
    });
    await expect(controller.update('employee-1', updateDto)).resolves.toEqual({
      id: 'employee-1',
    });
    await expect(
      controller.createBonus('employee-1', createBonusDto),
    ).resolves.toEqual({ id: 'bonus-1' });
    await expect(
      controller.findBonuses('employee-1', listBonusesDto),
    ).resolves.toEqual({
      data: [],
      meta: {},
    });

    expect(Reflect.getMetadata(PATH_METADATA, EmployeesController)).toBe(
      'employees',
    );
    expect(Reflect.getMetadata(ROLES_KEY, EmployeesController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, EmployeesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const createHandler: unknown = Object.getOwnPropertyDescriptor(
      EmployeesController.prototype,
      'create',
    )?.value;
    const findAllHandler: unknown = Object.getOwnPropertyDescriptor(
      EmployeesController.prototype,
      'findAll',
    )?.value;
    const listCostCenterOptionsHandler: unknown =
      Object.getOwnPropertyDescriptor(
        EmployeesController.prototype,
        'listCostCenterOptions',
      )?.value;
    const findOneHandler: unknown = Object.getOwnPropertyDescriptor(
      EmployeesController.prototype,
      'findOne',
    )?.value;
    const updateHandler: unknown = Object.getOwnPropertyDescriptor(
      EmployeesController.prototype,
      'update',
    )?.value;
    const createBonusHandler: unknown = Object.getOwnPropertyDescriptor(
      EmployeesController.prototype,
      'createBonus',
    )?.value;
    const findBonusesHandler: unknown = Object.getOwnPropertyDescriptor(
      EmployeesController.prototype,
      'findBonuses',
    )?.value;

    expect(Reflect.getMetadata(PATH_METADATA, createHandler as object)).toBe(
      '/',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, createHandler as object)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(METHOD_METADATA, findAllHandler as object)).toBe(
      RequestMethod.GET,
    );
    expect(
      Reflect.getMetadata(
        PATH_METADATA,
        listCostCenterOptionsHandler as object,
      ),
    ).toBe('cost-center-options');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        listCostCenterOptionsHandler as object,
      ),
    ).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, findOneHandler as object)).toBe(
      ':id',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, findOneHandler as object)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(PATH_METADATA, updateHandler as object)).toBe(
      ':id',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, updateHandler as object)).toBe(
      RequestMethod.PATCH,
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, createBonusHandler as object),
    ).toBe(':id/bonuses');
    expect(
      Reflect.getMetadata(METHOD_METADATA, createBonusHandler as object),
    ).toBe(RequestMethod.POST);
    expect(
      Reflect.getMetadata(PATH_METADATA, findBonusesHandler as object),
    ).toBe(':id/bonuses');
    expect(
      Reflect.getMetadata(METHOD_METADATA, findBonusesHandler as object),
    ).toBe(RequestMethod.GET);

    expect(service.create.mock.calls[0]).toEqual([createDto]);
    expect(service.findAll.mock.calls[0]).toEqual([listDto]);
    expect(service.listCostCenterOptions.mock.calls[0]).toEqual([]);
    expect(service.findOne.mock.calls[0]).toEqual(['employee-1']);
    expect(service.update.mock.calls[0]).toEqual(['employee-1', updateDto]);
    expect(service.createBonus.mock.calls[0]).toEqual([
      'employee-1',
      createBonusDto,
    ]);
    expect(service.findBonuses.mock.calls[0]).toEqual([
      'employee-1',
      listBonusesDto,
    ]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(EmployeesModule);
  });
});
