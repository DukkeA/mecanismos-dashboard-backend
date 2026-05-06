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
import { ProcurementService } from '../procurement/procurement.service';
import { ListSupplierQuotesQueryDto } from '../procurement/dto/list-supplier-quotes-query.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersController } from './suppliers.controller';
import { SuppliersModule } from './suppliers.module';
import { SuppliersService } from './suppliers.service';

describe('SuppliersController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<SuppliersService>;
  const procurementService = {
    findSupplierQuoteTimeline: jest.fn(),
  } as unknown as jest.Mocked<ProcurementService>;

  let controller: SuppliersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SuppliersController(service, procurementService);
  });

  it('registers suppliers routes with ADMIN and SALES guards and app wiring', async () => {
    const createDto = {} as CreateSupplierDto;
    const queryDto = {} as ListSuppliersQueryDto;
    const updateDto = {} as UpdateSupplierDto;
    const quotesQueryDto = {} as ListSupplierQuotesQueryDto;

    service.create.mockResolvedValue({ id: 'supplier-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.findOne.mockResolvedValue({ id: 'supplier-1' } as never);
    service.update.mockResolvedValue({ id: 'supplier-1' } as never);
    procurementService.findSupplierQuoteTimeline.mockResolvedValue({
      data: [],
      meta: {},
    } as never);

    await expect(controller.create(createDto)).resolves.toEqual({
      id: 'supplier-1',
    });
    await expect(controller.findAll(queryDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.findOne('supplier-1')).resolves.toEqual({
      id: 'supplier-1',
    });
    await expect(
      controller.findQuotes('supplier-1', quotesQueryDto),
    ).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.update('supplier-1', updateDto)).resolves.toEqual({
      id: 'supplier-1',
    });

    expect(Reflect.getMetadata(PATH_METADATA, SuppliersController)).toBe(
      'suppliers',
    );
    expect(Reflect.getMetadata(ROLES_KEY, SuppliersController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, SuppliersController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const createHandler: unknown = Object.getOwnPropertyDescriptor(
      SuppliersController.prototype,
      'create',
    )?.value;
    const findAllHandler: unknown = Object.getOwnPropertyDescriptor(
      SuppliersController.prototype,
      'findAll',
    )?.value;
    const findOneHandler: unknown = Object.getOwnPropertyDescriptor(
      SuppliersController.prototype,
      'findOne',
    )?.value;
    const findQuotesHandler: unknown = Object.getOwnPropertyDescriptor(
      SuppliersController.prototype,
      'findQuotes',
    )?.value;
    const updateHandler: unknown = Object.getOwnPropertyDescriptor(
      SuppliersController.prototype,
      'update',
    )?.value;

    expect(createHandler).toBeDefined();
    expect(findAllHandler).toBeDefined();
    expect(findOneHandler).toBeDefined();
    expect(updateHandler).toBeDefined();

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
    expect(
      Reflect.getMetadata(PATH_METADATA, findQuotesHandler as object),
    ).toBe(':id/quotes');

    expect(service.create.mock.calls[0]).toEqual([createDto]);
    expect(service.findAll.mock.calls[0]).toEqual([queryDto]);
    expect(service.findOne.mock.calls[0]).toEqual(['supplier-1']);
    expect(procurementService.findSupplierQuoteTimeline.mock.calls[0]).toEqual([
      'supplier-1',
      quotesQueryDto,
    ]);
    expect(service.update.mock.calls[0]).toEqual(['supplier-1', updateDto]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(SuppliersModule);
  });
});
