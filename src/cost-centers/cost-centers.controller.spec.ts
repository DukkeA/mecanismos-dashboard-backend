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
import { CostCentersController } from './cost-centers.controller';
import { CostCentersModule } from './cost-centers.module';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { ListCostCentersQueryDto } from './dto/list-cost-centers-query.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';

describe('CostCentersController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<CostCentersService>;

  let controller: CostCentersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CostCentersController(service);
  });

  it('registers cost-center routes with ADMIN and SALES guards and app wiring', async () => {
    const createDto = {} as CreateCostCenterDto;
    const queryDto = {} as ListCostCentersQueryDto;
    const updateDto = {} as UpdateCostCenterDto;

    service.create.mockResolvedValue({ id: 'cost-center-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.findOne.mockResolvedValue({ id: 'cost-center-1' } as never);
    service.update.mockResolvedValue({ id: 'cost-center-1' } as never);

    await expect(controller.create(createDto)).resolves.toEqual({
      id: 'cost-center-1',
    });
    await expect(controller.findAll(queryDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.findOne('cost-center-1')).resolves.toEqual({
      id: 'cost-center-1',
    });
    await expect(
      controller.update('cost-center-1', updateDto),
    ).resolves.toEqual({
      id: 'cost-center-1',
    });

    expect(Reflect.getMetadata(PATH_METADATA, CostCentersController)).toBe(
      'cost-centers',
    );
    expect(Reflect.getMetadata(ROLES_KEY, CostCentersController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, CostCentersController)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );

    const createHandler: unknown = Object.getOwnPropertyDescriptor(
      CostCentersController.prototype,
      'create',
    )?.value;
    const findAllHandler: unknown = Object.getOwnPropertyDescriptor(
      CostCentersController.prototype,
      'findAll',
    )?.value;
    const findOneHandler: unknown = Object.getOwnPropertyDescriptor(
      CostCentersController.prototype,
      'findOne',
    )?.value;
    const updateHandler: unknown = Object.getOwnPropertyDescriptor(
      CostCentersController.prototype,
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

    expect(service.create.mock.calls[0]).toEqual([createDto]);
    expect(service.findAll.mock.calls[0]).toEqual([queryDto]);
    expect(service.findOne.mock.calls[0]).toEqual(['cost-center-1']);
    expect(service.update.mock.calls[0]).toEqual(['cost-center-1', updateDto]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(CostCentersModule);
  });
});
