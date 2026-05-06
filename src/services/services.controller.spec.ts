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
import { CreateServiceDto } from './dto/create-service.dto';
import { ListServicesQueryDto } from './dto/list-services-query.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesController } from './services.controller';
import { ServicesModule } from './services.module';
import { ServicesService } from './services.service';

describe('ServicesController', () => {
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<ServicesService>;

  let controller: ServicesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ServicesController(service);
  });

  it('registers services routes with ADMIN and SALES guards and app wiring', async () => {
    const createDto = {} as CreateServiceDto;
    const queryDto = {} as ListServicesQueryDto;
    const updateDto = {} as UpdateServiceDto;

    service.create.mockResolvedValue({ id: 'service-1' } as never);
    service.findAll.mockResolvedValue({ data: [], meta: {} } as never);
    service.findOne.mockResolvedValue({ id: 'service-1' } as never);
    service.update.mockResolvedValue({ id: 'service-1' } as never);

    await expect(controller.create(createDto)).resolves.toEqual({
      id: 'service-1',
    });
    await expect(controller.findAll(queryDto)).resolves.toEqual({
      data: [],
      meta: {},
    });
    await expect(controller.findOne('service-1')).resolves.toEqual({
      id: 'service-1',
    });
    await expect(controller.update('service-1', updateDto)).resolves.toEqual({
      id: 'service-1',
    });

    expect(Reflect.getMetadata(PATH_METADATA, ServicesController)).toBe(
      'services',
    );
    expect(Reflect.getMetadata(ROLES_KEY, ServicesController)).toEqual([
      'ADMIN',
      'SALES',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, ServicesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);

    const createHandler: unknown = Object.getOwnPropertyDescriptor(
      ServicesController.prototype,
      'create',
    )?.value;
    const findAllHandler: unknown = Object.getOwnPropertyDescriptor(
      ServicesController.prototype,
      'findAll',
    )?.value;
    const findOneHandler: unknown = Object.getOwnPropertyDescriptor(
      ServicesController.prototype,
      'findOne',
    )?.value;
    const updateHandler: unknown = Object.getOwnPropertyDescriptor(
      ServicesController.prototype,
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
    expect(service.findOne.mock.calls[0]).toEqual(['service-1']);
    expect(service.update.mock.calls[0]).toEqual(['service-1', updateDto]);

    const appModuleImports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AppModule,
    ) as unknown[];

    expect(appModuleImports).toContain(ServicesModule);
  });
});
