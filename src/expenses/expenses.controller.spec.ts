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
import { ExpensesController } from './expenses.controller';
import { ExpensesModule } from './expenses.module';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQueryDto } from './dto/list-expenses-query.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

describe('ExpensesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ExpensesService>;

  let controller: ExpensesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ExpensesController(service);
  });

  it('registers protected expense lifecycle routes and keeps the scope free of delete-like surface area', async () => {
    const createDto = {} as CreateExpenseDto;
    const listDto = {} as ListExpensesQueryDto;
    const updateDto = {} as UpdateExpenseDto;

    service.create.mockResolvedValue({ id: 'expense-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.findOne.mockResolvedValue({ id: 'expense-1' } as never);
    service.update.mockResolvedValue({ id: 'expense-1' } as never);

    await expect(controller.create(createDto)).resolves.toEqual({
      id: 'expense-1',
    });
    await expect(controller.findAll(listDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.findOne('expense-1')).resolves.toEqual({
      id: 'expense-1',
    });
    await expect(controller.update('expense-1', updateDto)).resolves.toEqual({
      id: 'expense-1',
    });

    expect(Reflect.getMetadata(PATH_METADATA, ExpensesController)).toBe(
      'expenses',
    );
    expect(Reflect.getMetadata(ROLES_KEY, ExpensesController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, ExpensesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const createHandler: unknown = Object.getOwnPropertyDescriptor(
      ExpensesController.prototype,
      'create',
    )?.value;
    const findAllHandler: unknown = Object.getOwnPropertyDescriptor(
      ExpensesController.prototype,
      'findAll',
    )?.value;
    const findOneHandler: unknown = Object.getOwnPropertyDescriptor(
      ExpensesController.prototype,
      'findOne',
    )?.value;
    const updateHandler: unknown = Object.getOwnPropertyDescriptor(
      ExpensesController.prototype,
      'update',
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

    expect(Object.getOwnPropertyNames(ExpensesController.prototype)).toEqual([
      'constructor',
      'create',
      'findAll',
      'findOne',
      'update',
    ]);

    expect(service.create.mock.calls[0]).toEqual([createDto]);
    expect(service.findAll.mock.calls[0]).toEqual([listDto]);
    expect(service.findOne.mock.calls[0]).toEqual(['expense-1']);
    expect(service.update.mock.calls[0]).toEqual(['expense-1', updateDto]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(ExpensesModule);
  });
});
